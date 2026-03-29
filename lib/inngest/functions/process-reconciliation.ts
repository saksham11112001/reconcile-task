import { inngest }           from '../client'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendProcessingComplete } from '@/lib/email/templates/processing-complete'
import { sendProcessingFailed }   from '@/lib/email/templates/processing-failed'
import Papa                       from 'papaparse'

// ─── Event types ───────────────────────────────────────────────

export type ReconciliationFilesReadyEvent = {
  name: 'reconciliation/files.ready'
  data: {
    reconciliation_id: string
    org_id:            string
  }
}

// ─── Types ─────────────────────────────────────────────────────

interface RawRow {
  date?:        string
  Date?:        string
  DATE?:        string
  amount?:      string
  Amount?:      string
  AMOUNT?:      string
  credit?:      string
  Credit?:      string
  CREDIT?:      string
  debit?:       string
  Debit?:       string
  DEBIT?:       string
  description?: string
  Description?: string
  DESCRIPTION?: string
  narration?:   string
  Narration?:   string
  NARRATION?:   string
  reference?:   string
  Reference?:   string
  REFERENCE?:   string
  particulars?: string
  Particulars?: string
  [key: string]: string | undefined
}

interface ParsedEntry {
  date:        string  // YYYY-MM-DD
  amount:      number  // positive = credit, negative = debit
  description: string
  reference:   string
  rawIndex:    number
}

// ─── Main function ─────────────────────────────────────────────

export const processReconciliation = inngest.createFunction(
  {
    id:       'process-reconciliation',
    name:     'Process Reconciliation Files',
    retries:  2,
    triggers: [{ event: 'reconciliation/files.ready' as const }],
  },
  async ({ event, step }: { event: ReconciliationFilesReadyEvent; step: any }) => {
    const { reconciliation_id, org_id } = event.data
    const admin = createAdminClient()

    // ── 1. Mark as processing ──────────────────────────────────
    await step.run('mark-processing', async () => {
      await admin
        .from('reconciliations')
        .update({ job_status: 'processing', job_error: null })
        .eq('id', reconciliation_id)
    })

    // ── 2. Fetch recon + uploads ───────────────────────────────
    const { recon, bankUpload, ledgerUpload } = await step.run('fetch-data', async () => {
      const { data: recon } = await admin
        .from('reconciliations')
        .select('id, org_id, name, period_start, period_end, opening_balance')
        .eq('id', reconciliation_id)
        .single()

      const { data: uploads } = await admin
        .from('recon_uploads')
        .select('*')
        .eq('reconciliation_id', reconciliation_id)

      const bankUpload   = uploads?.find(u => u.file_type === 'bank_statement')
      const ledgerUpload = uploads?.find(u => u.file_type === 'ledger')

      return { recon, bankUpload, ledgerUpload }
    })

    if (!recon || !bankUpload || !ledgerUpload) {
      await admin.from('reconciliations').update({
        job_status: 'failed',
        job_error:  'Missing upload records — please re-upload both files.',
      }).eq('id', reconciliation_id)
      return { error: 'missing uploads' }
    }

    // ── 3. Download + parse files ──────────────────────────────
    const { bankEntries, ledgerEntries, parseError } = await step.run('parse-files', async () => {
      try {
        const [bankCsv, ledgerCsv] = await Promise.all([
          downloadFile(admin, bankUpload.storage_path, org_id),
          downloadFile(admin, ledgerUpload.storage_path, org_id),
        ])
        const bankEntries   = parseCsv(bankCsv,   'bank')
        const ledgerEntries = parseCsv(ledgerCsv, 'book')
        return { bankEntries, ledgerEntries, parseError: null }
      } catch (e) {
        return { bankEntries: [], ledgerEntries: [], parseError: String(e) }
      }
    })

    if (parseError) {
      await admin.from('reconciliations').update({
        job_status: 'failed',
        job_error:  `File parse error: ${parseError}`,
      }).eq('id', reconciliation_id)
      await notifyFailure(admin, reconciliation_id, org_id, recon.name, `File parse error: ${parseError}`)
      return { error: parseError }
    }

    // ── 4. Match entries + detect mismatches ──────────────────
    const { matches, mismatches } = await step.run('match-entries', async () => {
      return matchEntries(bankEntries, ledgerEntries)
    })

    // ── 5. Persist entries + matches + mismatches ─────────────
    await step.run('persist-results', async () => {
      const now = new Date().toISOString()

      // Insert bank entries
      if (bankEntries.length > 0) {
        const bankRows = bankEntries.map((e: ParsedEntry) => ({
          org_id:            org_id,
          reconciliation_id,
          source:            'bank',
          entry_date:        e.date,
          description:       e.description || null,
          reference:         e.reference   || null,
          amount:            e.amount,
          is_matched:        matches.matchedBankIndexes.has(e.rawIndex),
          is_flagged:        false,
        }))
        // Insert in chunks
        for (let i = 0; i < bankRows.length; i += 500) {
          await admin.from('recon_entries').insert(bankRows.slice(i, i + 500))
        }
      }

      // Insert ledger entries
      if (ledgerEntries.length > 0) {
        const bookRows = ledgerEntries.map((e: ParsedEntry) => ({
          org_id:            org_id,
          reconciliation_id,
          source:            'book',
          entry_date:        e.date,
          description:       e.description || null,
          reference:         e.reference   || null,
          amount:            e.amount,
          is_matched:        matches.matchedBookIndexes.has(e.rawIndex),
          is_flagged:        false,
        }))
        for (let i = 0; i < bookRows.length; i += 500) {
          await admin.from('recon_entries').insert(bookRows.slice(i, i + 500))
        }
      }

      // Insert mismatches
      if (mismatches.length > 0) {
        const mismatchRows = mismatches.map((m: Mismatch) => ({
          org_id:            org_id,
          reconciliation_id,
          mismatch_type:     m.type,
          review_status:     'open',
          diff_data:         m.diffData,
          description:       m.description,
          severity:          m.severity,
          detected_at:       now,
        }))
        for (let i = 0; i < mismatchRows.length; i += 500) {
          await admin.from('recon_mismatches').insert(mismatchRows.slice(i, i + 500))
        }
      }

      // Update upload parse timestamps
      await Promise.all([
        admin.from('recon_uploads').update({ row_count: bankEntries.length, parsed_at: now })
          .eq('reconciliation_id', reconciliation_id).eq('file_type', 'bank_statement'),
        admin.from('recon_uploads').update({ row_count: ledgerEntries.length, parsed_at: now })
          .eq('reconciliation_id', reconciliation_id).eq('file_type', 'ledger'),
      ])
    })

    // ── 6. Update reconciliation stats ────────────────────────
    const totalMatched    = matches.matchedBankIndexes.size
    const totalUnmatched  = bankEntries.length - totalMatched + (ledgerEntries.length - matches.matchedBookIndexes.size)
    const openMismatches  = mismatches.length
    const bankTotal       = bankEntries.reduce((s: number, e: ParsedEntry) => s + e.amount, 0)
    const bookTotal       = ledgerEntries.reduce((s: number, e: ParsedEntry) => s + e.amount, 0)
    const netDifference   = Math.round((bankTotal - bookTotal) * 100) / 100

    await step.run('update-stats', async () => {
      await admin.from('reconciliations').update({
        job_status:       'ready',
        status:           'in_progress',
        total_matched:    totalMatched,
        total_unmatched:  totalUnmatched,
        total_mismatches: openMismatches,
        open_mismatches:  openMismatches,
        net_difference:   netDifference,
        closing_balance:  recon.opening_balance + bankTotal,
      }).eq('id', reconciliation_id)
    })

    // ── 7. Notify assignees ────────────────────────────────────
    await step.run('notify', async () => {
      await notifyComplete(admin, reconciliation_id, org_id, {
        reconName:       recon.name,
        totalMatched,
        totalMismatches: openMismatches,
        openMismatches,
        periodStart:     recon.period_start,
        periodEnd:       recon.period_end,
      })
    })

    return { totalMatched, openMismatches, netDifference }
  }
)

// ─── CSV helpers ───────────────────────────────────────────────

async function downloadFile(
  admin:       ReturnType<typeof createAdminClient>,
  storagePath: string | null,
  orgId:       string,
): Promise<string> {
  if (!storagePath) throw new Error('No storage path — file may not have been uploaded to storage yet.')

  const { data, error } = await admin.storage
    .from('recon-files')
    .download(storagePath)
  if (error) throw new Error(`Storage download failed: ${error.message}`)
  return data.text()
}

function parseCsv(csv: string, _source: 'bank' | 'book'): ParsedEntry[] {
  const result = Papa.parse<RawRow>(csv.trim(), {
    header:         true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })

  return result.data
    .map((row, idx): ParsedEntry | null => {
      const date   = normaliseDate(pick(row, ['date','Date','DATE','transaction_date','ValueDate']))
      const amount = parseAmount(row)
      const desc   = pick(row, ['description','Description','DESCRIPTION','narration','Narration','particulars','Particulars']) ?? ''
      const ref    = pick(row, ['reference','Reference','REFERENCE','cheque','Cheque','txn_id','UTR']) ?? ''

      if (!date || isNaN(amount)) return null
      return { date, amount, description: desc.trim(), reference: ref.trim(), rawIndex: idx }
    })
    .filter((e): e is ParsedEntry => e !== null)
}

function pick(row: RawRow, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return undefined
}

function parseAmount(row: RawRow): number {
  // Try direct amount column first
  const direct = pick(row, ['amount','Amount','AMOUNT'])
  if (direct) {
    const n = parseFloat(direct.replace(/[₹,\s]/g, ''))
    if (!isNaN(n)) return n
  }

  // Debit/credit split columns
  const credit = parseFloat((pick(row, ['credit','Credit','CREDIT']) ?? '').replace(/[₹,\s]/g, '') || '0')
  const debit  = parseFloat((pick(row, ['debit','Debit','DEBIT'])   ?? '').replace(/[₹,\s]/g, '') || '0')
  if (!isNaN(credit) && !isNaN(debit)) {
    if (credit > 0) return  credit
    if (debit  > 0) return -debit
  }
  return NaN
}

function normaliseDate(raw?: string): string | null {
  if (!raw) return null
  const s = raw.trim()

  // Formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return s

  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  return null
}

// ─── Matching engine ───────────────────────────────────────────

interface MatchResult {
  matchedBankIndexes: Set<number>
  matchedBookIndexes: Set<number>
}

interface Mismatch {
  type:        string
  description: string
  severity:    'low' | 'medium' | 'high'
  diffData:    Record<string, unknown>
}

function matchEntries(
  bank:   ParsedEntry[],
  ledger: ParsedEntry[],
): { matches: MatchResult; mismatches: Mismatch[] } {
  const matchedBankIndexes = new Set<number>()
  const matchedBookIndexes = new Set<number>()
  const mismatches: Mismatch[] = []

  // Build an amount+date lookup for ledger
  // Key: `${date}|${amount}` → array of ledger rawIndexes
  const ledgerAmountMap = new Map<string, number[]>()
  for (const e of ledger) {
    const key = `${e.date}|${Math.round(e.amount * 100)}`
    if (!ledgerAmountMap.has(key)) ledgerAmountMap.set(key, [])
    ledgerAmountMap.get(key)!.push(e.rawIndex)
  }

  // Pass 1: exact date+amount match
  for (const b of bank) {
    const key   = `${b.date}|${Math.round(b.amount * 100)}`
    const ledIdxs = ledgerAmountMap.get(key)
    if (ledIdxs && ledIdxs.length > 0) {
      const ledIdx = ledIdxs.shift()! // consume first match
      matchedBankIndexes.add(b.rawIndex)
      matchedBookIndexes.add(ledIdx)
      continue
    }

    // Pass 2: try ±1 day window with same amount
    const matched = tryDateWindow(b, ledger, matchedBookIndexes)
    if (matched !== null) {
      matchedBankIndexes.add(b.rawIndex)
      matchedBookIndexes.add(matched)
      continue
    }

    // Pass 3: same reference (if present), different amount → amount_mismatch
    if (b.reference) {
      const ledEntry = ledger.find(l =>
        !matchedBookIndexes.has(l.rawIndex) &&
        l.reference === b.reference &&
        l.amount !== b.amount
      )
      if (ledEntry) {
        mismatches.push({
          type:        'amount_mismatch',
          description: `Amount differs for ref ${b.reference}: bank ₹${b.amount}, ledger ₹${ledEntry.amount}`,
          severity:    Math.abs(b.amount - ledEntry.amount) > 10000 ? 'high' : 'medium',
          diffData: {
            bank_amount: b.amount,
            book_amount: ledEntry.amount,
            delta:       Math.round((b.amount - ledEntry.amount) * 100) / 100,
            bank_date:   b.date,
            book_date:   ledEntry.date,
            reference:   b.reference,
          },
        })
        matchedBankIndexes.add(b.rawIndex)
        matchedBookIndexes.add(ledEntry.rawIndex)
        continue
      }
    }

    // Unmatched bank entry
    mismatches.push({
      type:        'missing_in_ledger',
      description: `Bank entry not in ledger: ${b.description || b.reference || String(b.amount)} on ${b.date}`,
      severity:    Math.abs(b.amount) > 50000 ? 'high' : Math.abs(b.amount) > 5000 ? 'medium' : 'low',
      diffData: {
        bank_date:   b.date,
        amount:      b.amount,
        reference:   b.reference  || null,
        narration:   b.description || null,
      },
    })
  }

  // Remaining unmatched ledger entries → missing_in_bank
  for (const l of ledger) {
    if (!matchedBookIndexes.has(l.rawIndex)) {
      mismatches.push({
        type:        'missing_in_bank',
        description: `Ledger entry not in bank: ${l.description || l.reference || String(l.amount)} on ${l.date}`,
        severity:    Math.abs(l.amount) > 50000 ? 'high' : Math.abs(l.amount) > 5000 ? 'medium' : 'low',
        diffData: {
          book_date:   l.date,
          amount:      l.amount,
          reference:   l.reference  || null,
          description: l.description || null,
        },
      })
    }
  }

  return { matches: { matchedBankIndexes, matchedBookIndexes }, mismatches }
}

function tryDateWindow(
  bank:          ParsedEntry,
  ledger:        ParsedEntry[],
  usedBookIdxs:  Set<number>,
): number | null {
  const bankDate = new Date(bank.date).getTime()
  for (const l of ledger) {
    if (usedBookIdxs.has(l.rawIndex)) continue
    if (Math.round(l.amount * 100) !== Math.round(bank.amount * 100)) continue
    const diff = Math.abs(new Date(l.date).getTime() - bankDate)
    if (diff <= 86_400_000) return l.rawIndex // within 1 day
  }
  return null
}

// ─── Notification helpers ──────────────────────────────────────

async function notifyComplete(
  admin:         ReturnType<typeof createAdminClient>,
  reconId:       string,
  orgId:         string,
  stats: {
    reconName:       string
    totalMatched:    number
    totalMismatches: number
    openMismatches:  number
    periodStart:     string
    periodEnd:       string
  }
) {
  // Fetch org + owner/admin emails
  const { data: members } = await admin
    .from('org_members')
    .select('users(name, email), role')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .in('role', ['owner', 'admin', 'reviewer'])

  const { data: org } = await admin
    .from('organisations')
    .select('name')
    .eq('id', orgId)
    .single()

  if (!members) return

  for (const m of members) {
    const u = m.users as { name?: string; email?: string } | null
    if (!u?.email) continue
    await sendProcessingComplete({
      to:              u.email,
      recipientName:   u.name ?? 'there',
      reconName:       stats.reconName,
      reconId,
      orgName:         org?.name ?? '',
      totalMatched:    stats.totalMatched,
      totalMismatches: stats.totalMismatches,
      openMismatches:  stats.openMismatches,
      periodStart:     stats.periodStart,
      periodEnd:       stats.periodEnd,
    }).catch(console.error)
  }
}

async function notifyFailure(
  admin:        ReturnType<typeof createAdminClient>,
  reconId:      string,
  orgId:        string,
  reconName:    string,
  errorMessage: string,
) {
  const { data: members } = await admin
    .from('org_members')
    .select('users(name, email), role')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .in('role', ['owner', 'admin'])

  const { data: org } = await admin
    .from('organisations')
    .select('name')
    .eq('id', orgId)
    .single()

  if (!members) return

  for (const m of members) {
    const u = m.users as { name?: string; email?: string } | null
    if (!u?.email) continue
    await sendProcessingFailed({
      to:            u.email,
      recipientName: u.name ?? 'there',
      reconName,
      reconId,
      orgName:       org?.name ?? '',
      errorMessage,
    }).catch(console.error)
  }
}
