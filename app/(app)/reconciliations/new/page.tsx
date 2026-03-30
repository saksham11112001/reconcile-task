'use client'

import { useState, useEffect } from 'react'
import { useRouter }   from 'next/navigation'
import Link            from 'next/link'
import { Header }      from '@/components/layout/Header'
import { toast }       from '@/store/appStore'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, CheckCircle, FileText, Loader } from 'lucide-react'

type Step = 'details' | 'uploading'

interface ClientOption { id: string; name: string }
interface MemberOption { id: string; name: string; email: string }

interface UploadState {
  bank_statement: { name: string; size: number } | null
  ledger:         { name: string; size: number } | null
}

export default function NewReconciliationPage() {
  const router = useRouter()

  const [clients,  setClients]  = useState<ClientOption[]>([])
  const [members,  setMembers]  = useState<MemberOption[]>([])

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.data ?? [])).catch(() => {})
    fetch('/api/team')
      .then(r => r.json())
      .then((data: Array<{ users?: { id: string; name?: string; email?: string } | null; is_active: boolean }>) => {
        const active = (data ?? [])
          .filter(m => m.is_active && m.users)
          .map(m => ({ id: m.users!.id, name: m.users!.name ?? m.users!.email ?? '', email: m.users!.email ?? '' }))
        setMembers(active)
      })
      .catch(() => {})
  }, [])

  const [name,        setName]        = useState('')
  const [clientId,    setClientId]    = useState('')
  const [assigneeId,  setAssigneeId]  = useState('')
  const [approverId,  setApproverId]  = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd,   setPeriodEnd]   = useState('')
  const [openingBal,  setOpeningBal]  = useState('')
  const [closingBal,  setClosingBal]  = useState('')

  const [step,       setStep]       = useState<Step>('details')
  const [reconId,    setReconId]    = useState<string | null>(null)
  const [uploads,    setUploads]    = useState<UploadState>({ bank_statement: null, ledger: null })
  const [jobStatus,  setJobStatus]  = useState<string>('pending')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !periodStart || !periodEnd) return
    if (periodEnd < periodStart) { setError('Period end must be after period start.'); return }
    setError(null)
    setSubmitting(true)

    const res = await fetch('/api/reconciliations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:            name.trim(),
        client_id:       clientId   || null,
        assignee_id:     assigneeId || null,
        approver_id:     approverId || null,
        period_start:    periodStart,
        period_end:      periodEnd,
        opening_balance: openingBal ? parseFloat(openingBal) : 0,
        closing_balance: closingBal ? parseFloat(closingBal) : 0,
      }),
    })

    setSubmitting(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to create.'); return }
    const job = await res.json()
    setReconId(job.id)
    setStep('uploading')
  }

  async function handleRegisterFile(fileType: 'bank_statement' | 'ledger', file: File) {
    if (!reconId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Session expired — please refresh.'); return }
    const { data: mb } = await supabase.from('org_members').select('org_id')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle()
    if (!mb) { toast.error('Organisation not found.'); return }

    const storagePath = `${mb.org_id}/${reconId}/${fileType}/${file.name}`
    const { error: storageError } = await supabase.storage
      .from('recon-files').upload(storagePath, file, { upsert: true, contentType: file.type || 'text/csv' })
    if (storageError) { toast.error(`Upload failed: ${storageError.message}`); return }

    const res = await fetch(`/api/reconciliations/${reconId}/uploads`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ file_type: fileType, file_name: file.name, file_size: file.size, storage_path: storagePath }),
    })
    if (!res.ok) { toast.error('Failed to register file.'); return }
    const result = await res.json()
    setJobStatus(result.job_status)
    setUploads(prev => ({ ...prev, [fileType]: { name: file.name, size: file.size } }))
    toast.success(`${fileType === 'bank_statement' ? 'Bank statement' : 'Ledger'} uploaded!`)
  }

  const bothUploaded = !!(uploads.bank_statement && uploads.ledger)

  return (
    <div className="app-content">
      <Header title="New Reconciliation" />
      <div className="page-container">
        <div style={{ maxWidth: 580, margin: '0 auto' }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.75rem', fontSize: 13 }}>
            <StepDot n={1} active={step === 'details'} done={step === 'uploading'} label="Job details" />
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
            <StepDot n={2} active={step === 'uploading'} done={false} label="Upload files" />
          </div>

          {/* ── STEP 1 ── */}
          {step === 'details' && (
            <div className="card" style={{ padding: '2rem' }}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                Reconciliation details
              </h2>
              <form onSubmit={handleCreateJob}>
                <Field label="Name *" hint="e.g. HDFC Current — March 2026">
                  <input className="input" type="text" required placeholder="HDFC Current — March 2026"
                    value={name} onChange={e => setName(e.target.value)} />
                </Field>

                <Field label="Client" hint="Optional">
                  <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                    <option value="">— No client —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Field label="Period start *">
                    <input className="input" type="date" required
                      value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                  </Field>
                  <Field label="Period end *">
                    <input className="input" type="date" required
                      value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Field label="Assignee" hint="Who works on it">
                    <select className="input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                      <option value="">— Unassigned —</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                    </select>
                  </Field>
                  <Field label="Approver" hint="Who reviews it">
                    <select className="input" value={approverId} onChange={e => setApproverId(e.target.value)}>
                      <option value="">— None —</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                    </select>
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Field label="Opening balance" hint="Optional">
                    <input className="input" type="number" step="0.01" placeholder="0.00"
                      value={openingBal} onChange={e => setOpeningBal(e.target.value)} />
                  </Field>
                  <Field label="Closing balance" hint="Optional">
                    <input className="input" type="number" step="0.01" placeholder="0.00"
                      value={closingBal} onChange={e => setClosingBal(e.target.value)} />
                  </Field>
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 1rem' }}>{error}</p>}

                <button type="submit" className="btn btn-brand btn-lg"
                  disabled={submitting || !name.trim() || !periodStart || !periodEnd}
                  style={{ width: '100%', marginTop: '0.5rem' }}>
                  {submitting
                    ? <><Loader style={{ width: 15, height: 15 }} className="animate-spin" /> Creating…</>
                    : <>Continue <ArrowRight style={{ width: 15, height: 15 }} /></>
                  }
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 'uploading' && reconId && (
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Upload files</h2>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: '#f1f5f9', color: '#64748b' }}>{jobStatus}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '0 0 1.5rem' }}>
                Select your bank statement and ledger / book of accounts file. CSV and Excel (.xlsx) supported.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <UploadSlot label="Bank Statement" fileType="bank_statement" uploaded={uploads.bank_statement}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleRegisterFile('bank_statement', f) }}/>
                <UploadSlot label="Ledger / Book entries" fileType="ledger" uploaded={uploads.ledger}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleRegisterFile('ledger', f) }}/>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link href={reconId ? `/reconciliations/${reconId}` : '/dashboard'} className="btn btn-ghost">
                  ← Workspace
                </Link>
                <button onClick={() => { if (reconId) router.push(`/reconciliations/${reconId}`) }}
                  className="btn btn-brand" disabled={!bothUploaded} style={{ flex: 1 }}>
                  {bothUploaded
                    ? <><CheckCircle style={{ width: 15, height: 15 }} /> Go to workspace</>
                    : 'Upload both files to continue'
                  }
                </button>
              </div>
              {!bothUploaded && (
                <button onClick={() => { if (reconId) router.push(`/reconciliations/${reconId}`) }}
                  className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8, color: 'var(--text-muted)' }}>
                  Skip — I'll upload files from the workspace
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 5 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
        {hint && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  const bg    = done || active ? '#0d9488' : 'var(--border)'
  const color = done || active ? '#fff' : 'var(--text-muted)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
        {done ? '✓' : n}
      </div>
      <span style={{ fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

function UploadSlot({ label, fileType, uploaded, onChange }: {
  label: string; fileType: string;
  uploaded: { name: string; size: number } | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label htmlFor={`file-${fileType}`}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '1rem 1.25rem',
        border: `1.5px dashed ${uploaded ? '#0d9488' : 'var(--border)'}`,
        borderRadius: 10, background: uploaded ? 'var(--brand-light)' : 'var(--surface-subtle)',
        cursor: 'pointer' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: uploaded ? '#0d9488' : 'var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {uploaded
          ? <CheckCircle style={{ width: 18, height: 18, color: '#fff' }}/>
          : <FileText    style={{ width: 18, height: 18, color: 'var(--text-muted)' }}/>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: uploaded ? 'var(--brand)' : 'var(--text-primary)' }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {uploaded ? `${uploaded.name} (${(uploaded.size / 1024).toFixed(1)} KB)` : 'Click to select CSV or Excel file'}
        </div>
      </div>
      <input id={`file-${fileType}`} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={onChange} />
    </label>
  )
}
