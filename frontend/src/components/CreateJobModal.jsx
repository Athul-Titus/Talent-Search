import { useState } from 'react'
import { jobsApi } from '../api/client'

export default function CreateJobModal({ onClose, onCreated }) {
  const [form, setForm]   = useState({ title: '', department: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const DEPTS = ['Engineering','Product','Design','Data Science','Marketing','Operations','Sales','HR','Finance','Other']

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Job title is required'); return }
    setLoading(true)
    setError('')
    try {
      const job = await jobsApi.create(form)
      onCreated(job)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create job role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Create New Job Role</h3>
        <p>Add a new position to start collecting and ranking candidates.</p>

        {error && (
          <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'10px 14px', borderRadius:'8px', fontSize:'.875rem', marginBottom:'16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Job Title *</label>
            <input
              className="form-input"
              placeholder="e.g. Senior React Developer"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Department</label>
            <select
              className="form-select"
              style={{ width:'100%' }}
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            >
              <option value="">Select department…</option>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              className="jd-textarea"
              style={{ minHeight:'100px' }}
              placeholder="Brief description of the role…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Creating…</> : '+ Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
