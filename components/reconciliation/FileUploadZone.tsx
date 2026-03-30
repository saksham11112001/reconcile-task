'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/store/appStore'
import { FileText, CheckCircle, Upload, Loader, X, RefreshCw } from 'lucide-react'
import type { ReconUpload } from '@/types'

interface Props {
  reconId:       string
  fileType:      'bank_statement' | 'ledger'
  label:         string
  existingUpload: ReconUpload | null
  disabled?:     boolean   // e.g. finalized
}

export function FileUploadZone({ reconId, fileType, label, existingUpload, disabled = false }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [upload,     setUpload]     = useState<ReconUpload | null>(existingUpload)
  const [uploading,  setUploading]  = useState(false)
  const [progress,   setProgress]   = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file) return
    const allowed = ['.csv', '.xlsx', '.xls']
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowed.includes(ext)) {
      toast.error('Only CSV and Excel (.xlsx / .xls) files are supported.')
      return
    }

    setUploading(true)
    setProgress('Connecting…')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Session expired — please refresh.'); return }

      const { data: mb } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      if (!mb) { toast.error('Organisation not found.'); return }

      const storagePath = `${mb.org_id}/${reconId}/${fileType}/${Date.now()}_${file.name}`
      setProgress('Uploading file…')

      const { error: storageErr } = await supabase.storage
        .from('recon-files')
        .upload(storagePath, file, { upsert: true, contentType: file.type || 'text/csv' })

      if (storageErr) {
        toast.error(`Upload failed: ${storageErr.message}`)
        return
      }

      setProgress('Registering…')
      const res = await fetch(`/api/reconciliations/${reconId}/uploads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          file_type:    fileType,
          file_name:    file.name,
          file_size:    file.size,
          storage_path: storagePath,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error ?? 'Failed to register file.')
        return
      }

      const result = await res.json()
      setUpload(result.upload)
      toast.success(`${label} uploaded successfully!`)
      router.refresh()   // re-fetch server state (job_status, other upload)
    } catch (err) {
      toast.error('Unexpected error during upload.')
      console.error('[FileUploadZone]', err)
    } finally {
      setUploading(false)
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [reconId, fileType, label, router])

  // ── Drag-and-drop ────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true)  }
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true)  }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const uploaded = !!upload
  const accent   = uploaded ? '#0d9488' : isDragging ? 'var(--brand)' : 'var(--border)'
  const bg       = uploaded ? 'var(--brand-light)' : isDragging ? '#f0fdfa' : 'var(--surface-subtle)'

  return (
    <div
      className="card"
      onDragOver={!disabled && !uploading ? onDragOver : undefined}
      onDragEnter={!disabled && !uploading ? onDragEnter : undefined}
      onDragLeave={!disabled && !uploading ? onDragLeave : undefined}
      onDrop={!disabled && !uploading ? onDrop : undefined}
      style={{
        padding: '0.9rem 1.1rem',
        border: `1.5px ${uploaded ? 'solid' : 'dashed'} ${accent}`,
        background: bg,
        cursor: disabled ? 'default' : uploading ? 'wait' : 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex', alignItems: 'center', gap: 12,
        userSelect: 'none',
      }}
      onClick={() => { if (!disabled && !uploading) inputRef.current?.click() }}>

      {/* Icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: uploaded ? '#0d9488' : uploading ? '#eff6ff' : 'var(--surface)',
        border: `1px solid ${uploaded ? '#0d9488' : uploading ? '#bfdbfe' : 'var(--border)'}`,
        transition: 'all 0.15s',
      }}>
        {uploading
          ? <Loader style={{ width: 18, height: 18, color: '#1d4ed8' }} className="animate-spin"/>
          : uploaded
          ? <CheckCircle style={{ width: 18, height: 18, color: '#fff' }}/>
          : <FileText    style={{ width: 18, height: 18, color: 'var(--text-muted)' }}/>
        }
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600,
          color: uploaded ? 'var(--brand)' : uploading ? '#1d4ed8' : 'var(--text-primary)' }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {uploading
            ? progress ?? 'Uploading…'
            : uploaded
            ? `${upload!.file_name}${upload!.file_size ? ` · ${(upload!.file_size / 1024).toFixed(1)} KB` : ''}${upload!.row_count ? ` · ${upload!.row_count.toLocaleString()} rows` : ''}`
            : isDragging
            ? 'Drop to upload'
            : 'Click or drag a CSV / Excel file here'
          }
        </div>
      </div>

      {/* Right-side indicator */}
      {!disabled && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          {uploaded ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 3 }}>
                <RefreshCw style={{ width: 9, height: 9 }}/> Replace
              </span>
            </div>
          ) : !uploading ? (
            <div style={{ padding: '4px 8px', borderRadius: 5,
              background: 'var(--brand)', color: '#fff',
              fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <Upload style={{ width: 10, height: 10 }}/> Upload
            </div>
          ) : null}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
