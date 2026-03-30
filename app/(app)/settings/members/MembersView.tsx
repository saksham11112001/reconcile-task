'use client'

import { useState } from 'react'
import { toast } from '@/store/appStore'
import { Plus, X, Loader, UserCheck, Clock } from 'lucide-react'
import { fmtDate } from '@/lib/utils/format'
import type { OrgRole } from '@/types'

interface Member {
  id:         string
  role:       OrgRole
  is_active:  boolean
  invited_at: string | null
  joined_at:  string | null
  users:      { id: string; name?: string; email?: string } | null
}

interface Props {
  members:     Member[]
  currentRole: OrgRole
}

const ROLE_CFG: Record<OrgRole, { label: string; color: string; bg: string }> = {
  owner:         { label: 'Owner',   color: '#7c3aed', bg: '#f5f3ff' },
  admin:         { label: 'Admin',   color: '#1d4ed8', bg: '#eff6ff' },
  reviewer:      { label: 'Reviewer', color: '#0d9488', bg: '#f0fdfa' },
  analyst:       { label: 'Analyst',  color: '#92400e', bg: '#fffbeb' },
  viewer:        { label: 'Viewer',   color: '#64748b', bg: '#f1f5f9' },
  client_upload: { label: 'Client Upload', color: '#64748b', bg: '#f1f5f9' },
}

const ASSIGNABLE_ROLES: OrgRole[] = ['admin','reviewer','analyst','viewer']

export function MembersView({ members: initial, currentRole }: Props) {
  const [members,  setMembers]  = useState<Member[]>(initial)
  const [showInvite, setShowInvite] = useState(false)
  const canManage = ['owner','admin'].includes(currentRole)

  async function handleRoleChange(memberId: string, newRole: OrgRole) {
    const res = await fetch('/api/team', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ memberId, role: newRole }),
    })
    if (!res.ok) {
      toast.error('Failed to update role.')
      return
    }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    toast.success('Role updated.')
  }

  function handleInvited(email: string) {
    toast.success(`Invite sent to ${email}.`)
    setShowInvite(false)
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Team Members
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
              {members.filter(m => m.is_active).length} active · {members.filter(m => !m.is_active).length} pending
            </p>
          </div>
          {canManage && (
            <button onClick={() => setShowInvite(true)} className="btn btn-brand btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Plus style={{ width: 13, height: 13 }}/> Invite Member
            </button>
          )}
        </div>

        {/* Members list */}
        {members.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No team members yet.
          </div>
        ) : (
          members.map(m => {
            const cfg = ROLE_CFG[m.role] ?? ROLE_CFG.viewer
            const name  = m.users?.name  ?? '—'
            const email = m.users?.email ?? ''

            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0d9488',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  {name !== '—' ? name[0].toUpperCase() : '?'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {name}
                    </span>
                    {!m.is_active && (
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4,
                        background: '#fffbeb', color: '#92400e', fontWeight: 600 }}>
                        Invited
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {email}
                    {m.joined_at && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <UserCheck style={{ width: 10, height: 10 }}/>
                        Joined {fmtDate(m.joined_at)}
                      </span>
                    )}
                    {!m.is_active && m.invited_at && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock style={{ width: 10, height: 10 }}/>
                        Invited {fmtDate(m.invited_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role */}
                {canManage && m.role !== 'owner' ? (
                  <select
                    value={m.role}
                    onChange={e => handleRoleChange(m.id, e.target.value as OrgRole)}
                    style={{ fontSize: 12.5, padding: '4px 8px', borderRadius: 6,
                      border: `1px solid ${cfg.color}30`,
                      background: cfg.bg, color: cfg.color,
                      fontWeight: 600, cursor: 'pointer', outline: 'none',
                      fontFamily: 'inherit' }}>
                    {ASSIGNABLE_ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_CFG[r]?.label ?? r}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 5,
                    background: cfg.bg, color: cfg.color,
                    fontWeight: 600, border: `1px solid ${cfg.color}25` }}>
                    {cfg.label}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Role descriptions */}
      <div className="card" style={{ marginTop: '1rem', padding: '1rem 1.25rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Role Permissions
        </h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { role: 'owner',    desc: 'Full access. Can manage billing and delete the organisation.' },
            { role: 'admin',    desc: 'Can manage members, clients, reconciliations, and settings.' },
            { role: 'reviewer', desc: 'Can create and review reconciliations and finalize periods.' },
            { role: 'analyst',  desc: 'Can create reconciliations and upload files. Cannot finalize.' },
            { role: 'viewer',   desc: 'Read-only access to reconciliations and reports.' },
          ].map(({ role, desc }) => {
            const cfg = ROLE_CFG[role as OrgRole]
            return (
              <div key={role} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11.5, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                  background: cfg.bg, color: cfg.color, fontWeight: 600, marginTop: 1 }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{desc}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={handleInvited}
        />
      )}
    </div>
  )
}

// ─── Invite modal ─────────────────────────────────────────────────

function InviteModal({ onClose, onInvited }: {
  onClose:   () => void
  onInvited: (email: string) => void
}) {
  const [email,      setEmail]      = useState('')
  const [name,       setName]       = useState('')
  const [role,       setRole]       = useState<OrgRole>('analyst')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required.'); return }
    setError(null)
    setSubmitting(true)

    const res = await fetch('/api/team', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.trim(), name: name.trim(), role }),
    })
    setSubmitting(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to send invite.')
      return
    }
    onInvited(email.trim())
  }

  return (
    <>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(2px)' }}/>
      <div style={{ position: 'fixed', top: '50%', left: '50%', zIndex: 50,
        transform: 'translate(-50%, -50%)',
        width: 420, maxWidth: '92vw',
        background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
        animation: 'fadeUp 0.15s ease both' }}>

        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Invite Team Member
          </h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 5 }}>
            <X style={{ width: 16, height: 16 }}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
              display: 'block', marginBottom: 5 }}>Email address *</label>
            <input className="input" type="email" required
              placeholder="colleague@example.com"
              value={email} onChange={e => setEmail(e.target.value)}/>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
              display: 'block', marginBottom: 5 }}>
              Name <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input className="input" type="text"
              placeholder="Their name"
              value={name} onChange={e => setName(e.target.value)}/>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
              display: 'block', marginBottom: 5 }}>Role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value as OrgRole)}>
              {ASSIGNABLE_ROLES.map(r => (
                <option key={r} value={r}>{ROLE_CFG[r]?.label ?? r}</option>
              ))}
            </select>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-brand"
              style={{ minWidth: 120 }}>
              {submitting
                ? <><Loader style={{ width: 13, height: 13 }} className="animate-spin"/> Sending…</>
                : 'Send Invite'
              }
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
