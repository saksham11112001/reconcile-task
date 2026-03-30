'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter }    from 'next/navigation'
import { toast }        from '@/store/appStore'
import { createClient } from '@/lib/supabase/client'
import { X, ArrowRight, CheckCircle, FileText, Loader } from 'lucide-react'

interface ClientOption  { id: string; name: string }
interface MemberOption  { id: string; name: string; email: string }

interface Props {
  onClose: () => void
}

type Step = 'details' | 'uploading'

export function NewReconciliationModal({ onClose }: Props) {
  const router  = useRouter()
  const backdropRef = useRef<HTMLDivElement>(null)

  // ── data ─────────────────────────────────────────────────────
  const [clients,  setClients]  = useState<ClientOption[]>([])
  const [members,  setMembers]  = useState<MemberOption[]>([])

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.data ?? [])).catch(() => {})
    fetch('/api/team')
      .then(r => r.json())
      .then((data: Array<{ users?: { id: string; name?: string; email?: string } | null; is_active: boolean }>) => {
        const active = (data ?? [])
          .filter(m => m.is_active && m.users)
          .map(m => ({
            id:    m.users!.id,
            name:  m.users!.name  ?? m.users!.email ?? '',
            email: m.users!.email ?? '',
          }))
        setMembers(active)
      })
      .catch(() => {})
  }, [])

  // ── step 1 form ────────────────────────────────────────────
  const [step,        setStep]        = useState<Step>('details')
  const [name,        setName]        = useState('')
  const [clientId,    setClientId]    = useState('')
  const [assigneeId,  setAssigneeId]  = useState('')
  const [approverId,  setApproverId]  = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd,   setPeriodEnd]   = useState('')
  const [openingBal,  setOpeningBal]  = useState('')
  const [closingBal,  setClosingBal]  = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // ── step 2 ────────────────────────────────────────────────
  const [reconId,   setReconId]   = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState('pending')
  const [uploads,   setUploads]   = useState<{
    bank_statement: { name: string; size: number } | null
    ledger:         { name: string; size: number } | null
  }>({ bank_statement: null, ledger: null })

  // ── backdrop click to close (step 1 only) ─────────────────
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current && step === 'details') onClose()
  }

  // ── step 1 submit ─────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !periodStart || !periodEnd) return
    if (periodEnd < periodStart) { setError('Period end must be after period start.'); return }
    setError(null)
    setSubmitting(true)

    const res = await fetch('/api/reconciliations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:            name.trim(),
        client_id:       clientId    || null,
        assignee_id:     assigneeId  || null,
        approver_id:     approverId  || null,
        period_start:    periodStart,
        period_end:      periodEnd,
        opening_balance: openingBal ? parseFloat(openingBal) : 0,
        closing_balance: closingBal ? parseFloat(closingBal) : 0,
      }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to create reconciliation.')
      return
    }

    const job = await res.json()
    setReconId(job.id)
    setStep('uploading')
    router.refresh()
  }

  // ── file upload ───────────────────────────────────────────
  async function handleFile(fileType: 'bank_statement' | 'ledger', file: File) {
    if (!reconId) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Session expired.'); return }

    const { data: mb } = await supabase
      .from('org_members').select('org_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
    if (!mb) { toast.error('Organisation not found.'); return }

    const storagePath = `${mb.org_id}/${reconId}/${fileType}/${file.name}`
    const { error: storageErr } = await supabase.storage
      .from('recon-files')
      .upload(storagePath, file, { upsert: true, contentType: file.type || 'text/csv' })

    if (storageErr) { toast.error(`Upload failed: ${storageErr.message}`); return }

    const res = await fetch(`/api/reconciliations/${reconId}/uploads`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ file_type: fileType, file_name: file.name, file_size: file.size, storage_path: storagePath }),
    })

    if (!res.ok) { toast.error('Failed to register file.'); return }

    const result = await res.json()
    setJobStatus(result.job_status)
    setUploads(prev => ({ ...prev, [fileType]: { name: file.name, size: file.size } }))
    toast.success(`${fileType === 'bank_statement' ? 'Bank statement' : 'Ledger'} uploaded!`)
  }

  const bothUploaded = !!(uploads.bank_statement && uploads.ledger)

  return (
    <div ref={backdropRef} onClick={handleBackdropClick}
      style={{ position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem' }}>

      <div style={{ width: '100%', maxWidth: 560,
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid var(--border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'fadeUp 0.15s ease both' }}>

        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0,
          background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              New Reconciliation
            </h2>
            <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
              <StepPill n={1} label="Details" active={step === 'details'} done={step === 'uploading'} />
              <StepPill n={2} label="Upload files" active={step === 'uploading'} done={false} />
            </div>
          </div>
          {step === 'details' && (
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 6, borderRadius: 6 }}>
              <X style={{ width: 16, height: 16 }}/>
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem' }}>

          {/* ── Step 1: details ── */}
          {step === 'details' && (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              <MField label="Name *">
                <input className="input" type="text" required placeholder="HDFC Current — March 2026"
                  value={name} onChange={e => setName(e.target.value)} />
              </MField>

              {/* Client */}
              <MField label="Client">
                <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">— No client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </MField>

              {/* Period */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <MField label="Period start *">
                  <input className="input" type="date" required
                    value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                </MField>
                <MField label="Period end *">
                  <input className="input" type="date" required
                    value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </MField>
              </div>

              {/* Assignee + Approver */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <MField label="Assignee" hint="Who works on it">
                  <select className="input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                  </select>
                </MField>
                <MField label="Approver" hint="Who reviews it">
                  <select className="input" value={approverId} onChange={e => setApproverId(e.target.value)}>
                    <option value="">— None —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                  </select>
                </MField>
              </div>

              {/* Balances */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <MField label="Opening balance" hint="Optional">
                  <input className="input" type="number" step="0.01" placeholder="0.00"
                    value={openingBal} onChange={e => setOpeningBal(e.target.value)} />
                </MField>
                <MField label="Closing balance" hint="Optional">
                  <input className="input" type="number" step="0.01" placeholder="0.00"
                    value={closingBal} onChange={e => setClosingBal(e.target.value)} />
                </MField>
              </div>

              {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-brand"
                  disabled={submitting || !name.trim() || !periodStart || !periodEnd}
                  style={{ minWidth: 130 }}>
                  {submitting
                    ? <><Loader style={{ width: 13, height: 13 }} className="animate-spin"/> Creating…</>
                    : <>Continue <ArrowRight style={{ width: 13, height: 13 }}/></>
                  }
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2: upload ── */}
          {step === 'uploading' && reconId && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
                  Upload bank statement and ledger. CSV and Excel (.xlsx) supported.
                </p>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px',
                  borderRadius: 20, background: '#f1f5f9', color: '#64748b' }}>
                  {jobStatus}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <UploadSlot label="Bank Statement" fileType="bank_statement"
                  uploaded={uploads.bank_statement}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile('bank_statement', f) }}/>
                <UploadSlot label="Ledger / Book entries" fileType="ledger"
                  uploaded={uploads.ledger}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile('ledger', f) }}/>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { router.push(`/reconciliations/${reconId}`); onClose() }}
                  className="btn btn-ghost" style={{ fontSize: 13 }}>
                  Skip → Open workspace
                </button>
                <button onClick={() => { router.push(`/reconciliations/${reconId}`); onClose() }}
                  className="btn btn-brand" disabled={!bothUploaded} style={{ flex: 1 }}>
                  {bothUploaded
                    ? <><CheckCircle style={{ width: 14, height: 14 }}/> Go to workspace</>
                    : 'Upload both files to continue'
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Local sub-components ─────────────────────────────────────

function MField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'baseline', marginBottom: 5 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
        {hint && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function StepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: done || active ? 600 : 400,
      color: done ? 'var(--brand)' : active ? 'var(--text-primary)' : 'var(--text-muted)',
      display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', fontSize: 10,
        background: done || active ? 'var(--brand)' : 'var(--border)',
        color: done || active ? '#fff' : 'var(--text-muted)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
        {done ? '✓' : n}
      </span>
      {label}
    </span>
  )
}

function UploadSlot({ label, fileType, uploaded, onChange }: {
  label:    string
  fileType: string
  uploaded: { name: string; size: number } | null
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label htmlFor={`modal-file-${fileType}`}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.85rem 1rem',
        border: `1.5px dashed ${uploaded ? '#0d9488' : 'var(--border)'}`,
        borderRadius: 10, background: uploaded ? 'var(--brand-light)' : 'var(--surface-subtle)',
        cursor: 'pointer' }}>
      <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0,
        background: uploaded ? '#0d9488' : 'var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {uploaded
          ? <CheckCircle style={{ width: 16, height: 16, color: '#fff' }}/>
          : <FileText    style={{ width: 16, height: 16, color: 'var(--text-muted)' }}/>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: uploaded ? 'var(--brand)' : 'var(--text-primary)' }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {uploaded ? `${uploaded.name} (${(uploaded.size / 1024).toFixed(1)} KB)` : 'Click to select CSV or Excel'}
        </div>
      </div>
      <input id={`modal-file-${fileType}`} type="file" accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }} onChange={onChange} />
    </label>
  )
}
