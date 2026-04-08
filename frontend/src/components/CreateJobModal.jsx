import { useState } from 'react'
import { jobsApi } from '../api/client'
import { useToast } from '../contexts/ToastContext'

export default function CreateJobModal({ onClose, onCreated, initialJob = null }) {
  const [form, setForm]   = useState({
    title: initialJob?.title || '',
    department: initialJob?.department === 'General' ? '' : (initialJob?.department || ''),
    description: initialJob?.description || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const DEPTS = ['Engineering','Product','Design','Data Science','Marketing','Operations','Sales','HR','Finance','Other']

  const toast = useToast()

  const isEditing = !!initialJob

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Job title is required'); return }
    setLoading(true)
    setError('')
    try {
      if (isEditing) {
        const job = await jobsApi.update(initialJob.id, form)
        toast.success(`Role "${job.title}" updated successfully!`)
        onCreated(job) // we can reuse onCreated for onUpdated event in parent
      } else {
        const job = await jobsApi.create(form)
        toast.success(`Role "${job.title}" created successfully!`)
        onCreated(job)
      }
      onClose()
    } catch (err) {
      const action = isEditing ? 'update' : 'create'
      const msg = err.response?.data?.detail || `Failed to ${action} job role`
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>{isEditing ? 'Edit Job Role' : 'Create New Job Role'}</h3>
        <p>{isEditing ? 'Update the details for this position.' : 'Add a new position to start collecting and ranking candidates.'}</p>

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
              {loading ? <><span className="spinner" /> {isEditing ? 'Saving…' : 'Creating…'}</> : (isEditing ? 'Save Changes' : '+ Create Role')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
