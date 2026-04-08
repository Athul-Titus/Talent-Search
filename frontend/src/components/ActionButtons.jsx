import { useState, useRef, useCallback } from 'react'
import { candidatesApi } from '../api/client'
import { createPortal } from 'react-dom'

const ACTIONS = [
  {
    key: 'shortlisted',
    label: 'Shortlist',
    icon: '✅',
    activeColor: '#00C853',
    activeBg: 'rgba(0,200,83,0.12)',
    activeBorder: 'rgba(0,200,83,0.5)',
    activeGlow: '0 0 12px rgba(0,200,83,0.35)',
  },
  {
    key: 'on_hold',
    label: 'Hold',
    icon: '⏸',
    activeColor: '#FFB300',
    activeBg: 'rgba(255,179,0,0.12)',
    activeBorder: 'rgba(255,179,0,0.5)',
    activeGlow: '0 0 12px rgba(255,179,0,0.35)',
  },
  {
    key: 'rejected',
    label: 'Reject',
    icon: '❌',
    activeColor: '#FF1744',
    activeBg: 'rgba(255,23,68,0.12)',
    activeBorder: 'rgba(255,23,68,0.5)',
    activeGlow: '0 0 12px rgba(255,23,68,0.35)',
  },
]

export default function ActionButtons({ candidateId, initialStatus = 'pending', initialNote = '', onStatusChange }) {
  const [status, setStatus]         = useState(initialStatus)
  const [note, setNote]             = useState(initialNote || '')
  const [showNote, setShowNote]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [notePos, setNotePos]       = useState({ top: 0, left: 0 })
  const noteRef = useRef(null)
  const noteBtnRef = useRef(null)

  const openNote = useCallback(() => {
    if (noteBtnRef.current) {
      const rect = noteBtnRef.current.getBoundingClientRect()
      setNotePos({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 280),
      })
    }
    setShowNote(v => !v)
    setTimeout(() => noteRef.current?.focus(), 80)
  }, [])

  async function handleAction(newStatus) {
    // Toggle back to pending if clicking the already-active button
    const target = status === newStatus ? 'pending' : newStatus
    setSaving(true)
    try {
      await candidatesApi.updateStatus(candidateId, target, note || undefined)
      setStatus(target)
      onStatusChange?.(candidateId, target)
    } catch (e) {
      console.error('Status update failed', e)
    } finally {
      setSaving(false)
    }
  }

  async function saveNote() {
    try {
      await candidatesApi.updateStatus(candidateId, status, note)
      setShowNote(false)
    } catch (e) {
      console.error('Note save failed', e)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '24px', border: '1px solid var(--border)', gap: '4px' }}>
      {ACTIONS.map(a => {
        const isActive = status === a.key
        return (
          <button
            key={a.key}
            className="action-btn"
            disabled={saving}
            title={isActive ? `Click to undo ${a.label}` : a.label}
            onClick={() => handleAction(a.key)}
            style={{
              padding: '4px 12px', border: 'none', borderRadius: '20px',
              background:   isActive ? a.activeBg    : 'transparent',
              color:        isActive ? a.activeColor  : 'var(--text-muted)',
              boxShadow:    isActive ? `inset 0 0 0 1px ${a.activeBorder}, ${a.activeGlow}` : 'none',
              opacity:      saving ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: '.75rem' }}>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        )
      })}

      </div>

      {/* Note button */}
      <button
        ref={noteBtnRef}
        className="action-btn note-btn"
        title={note ? 'View / edit note' : 'Add a recruiter note'}
        onClick={openNote}
        style={{
          padding: '4px 8px', borderRadius: '20px', border: 'none',
          background: note ? 'rgba(74,144,196,0.12)' : 'rgba(255,255,255,0.05)',
          color: note ? 'var(--primary-light)' : 'var(--text-muted)',
          boxShadow: note ? 'inset 0 0 0 1px rgba(74,144,196,0.4)' : 'inset 0 0 0 1px var(--border)',
        }}
      >
        📝
      </button>

      {/* Fixed-position Note popover via portal — escapes overflow:hidden */}
      {showNote && createPortal(
        <>
          {/* Transparent backdrop to close on click-outside */}
          <div
            onClick={() => setShowNote(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          />
          <div style={{
            position: 'fixed',
            top: notePos.top,
            left: notePos.left,
            zIndex: 1000,
            background: '#1a1c20',
            padding: '14px',
            borderRadius: '14px',
            border: '1px solid rgba(74,144,196,0.35)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset',
            width: '270px',
            animation: 'slideUp .2s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>Recruiter Note</div>
            <textarea
              ref={noteRef}
              className="note-textarea"
              rows={3}
              placeholder="e.g. 'Strong React skills, revisit salary'"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ width: '100%', background: '#0e0f11', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text)', fontSize: '.85rem', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNote(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveNote}>Save</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
