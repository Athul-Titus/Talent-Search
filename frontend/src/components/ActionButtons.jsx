import { useState, useRef } from 'react'
import { candidatesApi } from '../api/client'

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
  const noteRef = useRef(null)

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
              background:   isActive ? a.activeBg    : 'transparent',
              color:        isActive ? a.activeColor  : 'var(--text-muted)',
              border:       `1.5px solid ${isActive ? a.activeBorder : 'var(--border)'}`,
              boxShadow:    isActive ? a.activeGlow   : 'none',
              opacity:      saving ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: '.75rem' }}>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        )
      })}

      {/* Note button */}
      <button
        className="action-btn note-btn"
        title={note ? 'View / edit note' : 'Add a recruiter note'}
        onClick={() => { setShowNote(v => !v); setTimeout(() => noteRef.current?.focus(), 50) }}
        style={{
          background: note ? 'rgba(74,144,196,0.12)' : 'transparent',
          color: note ? 'var(--primary-light)' : 'var(--text-muted)',
          border: `1.5px solid ${note ? 'rgba(74,144,196,0.4)' : 'var(--border)'}`,
        }}
      >
        📝
      </button>

      {/* Inline note textarea */}
      {showNote && (
        <div className="note-popover">
          <textarea
            ref={noteRef}
            className="note-textarea"
            rows={3}
            placeholder="Add a recruiter note… (e.g. 'Strong React skills, revisit salary')"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNote(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={saveNote}>Save Note</button>
          </div>
        </div>
      )}
    </div>
  )
}
