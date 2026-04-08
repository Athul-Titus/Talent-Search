import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jobsApi, resumesApi } from '../api/client'
import FileDropzone from '../components/FileDropzone'
import { useToast } from '../contexts/ToastContext'

// ─── helpers ────────────────────────────────────────────────────────────────
function statusColor(status) {
  return { uploading: '#F59E0B', parsing: '#3B82F6', parsed: '#10B981', failed: '#EF4444' }[status] || '#94A3B8'
}

function FileRow({ file, candidate }) {
  const status   = candidate?.status || 'uploading'
  const progress = status === 'parsed' ? 100 : status === 'failed' ? 100 : status === 'parsing' ? 65 : 35
  const ext      = (file?.name || candidate?.file_name || '').split('.').pop().toLowerCase()
  const iconCls  = ext === 'pdf' ? 'pdf' : (ext === 'docx' || ext === 'doc') ? 'docx' : 'img'

  return (
    <div className="file-item">
      <div className={`file-icon ${iconCls}`}>{ext.toUpperCase().slice(0, 4)}</div>

      <div className="file-meta">
        <div className="fname">{file?.name || candidate?.file_name || 'File'}</div>
        <div className="fsize">
          {file ? `${(file.size / 1024).toFixed(0)} KB` : ''}
          {candidate?.name && candidate.name !== 'Parsing...' && candidate.status === 'parsed'
            ? ` · ${candidate.name}` : ''}
        </div>
      </div>

      <div className="file-progress">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${progress}%`,
              background: statusColor(status),
              animation: (status === 'parsing' || status === 'uploading') ? 'pulse 1.5s ease infinite' : 'none',
            }}
          />
        </div>
        <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>{progress}%</div>
      </div>

      <div className={`status-badge ${status}`}>
        {status === 'uploading' && '⏳ Uploading'}
        {status === 'parsing'   && '🔄 Parsing'}
        {status === 'parsed'    && '✓ Parsed'}
        {status === 'failed'    && '✗ Failed'}
      </div>

      {status === 'failed' && candidate?.error_message && (
        <span title={candidate.error_message} style={{ cursor: 'help', fontSize: '.8rem' }}>⚠️</span>
      )}
    </div>
  )
}

// ─── Date group header ───────────────────────────────────────────────────────
function DateGroupHeader({ group }) {
  const { date_label, candidate_count, status_counts } = group

  return (
    <div className="batch-group-header">
      <div className="batch-group-left">
        {/* Calendar icon */}
        <div className="batch-icon">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="batch-label">{date_label}</span>
        <span className="batch-count">{candidate_count} resume{candidate_count !== 1 ? 's' : ''}</span>
      </div>

      {/* Status pills */}
      <div className="batch-group-right">
        {Object.entries(status_counts).map(([s, n]) => (
          <span key={s} className={`status-badge ${s}`} style={{ padding: '2px 8px', fontSize: '.68rem' }}>
            {n} {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Group-By Toggle ─────────────────────────────────────────────────────────
function GroupToggle({ value, onChange }) {
  return (
    <div className="group-toggle">
      <span className="group-toggle-label">Group by:</span>
      <div className="group-toggle-pills">
        {[
          { id: 'role', icon: '💼', text: 'Job Role' },
          { id: 'date', icon: '📅', text: 'Batch Date' },
        ].map(opt => (
          <button
            key={opt.id}
            className={`toggle-pill ${value === opt.id ? 'active' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.icon} {opt.text}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Upload() {
  const { jobId }  = useParams()
  const navigate   = useNavigate()
  const toast      = useToast()

  const [jobs, setJobs]                     = useState([])
  const [selectedJob, setSelectedJob]       = useState(jobId || '')
  const [groupBy, setGroupBy]               = useState('role')   // 'role' | 'date'
  const [candidates, setCandidates]         = useState([])       // flat list (role mode)
  const [dateGroups, setDateGroups]         = useState([])       // grouped list (date mode)
  const [localFiles, setLocalFiles]         = useState([])       // { file, candidateId }
  const [uploading, setUploading]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // ── Load jobs once ─────────────────────────────────────
  useEffect(() => {
    jobsApi.list().then(data => {
      setJobs(data)
      if (!selectedJob && data.length > 0) setSelectedJob(String(data[0].id))
    })
  }, [])

  // ── Load data when job or groupBy changes ──────────────
  useEffect(() => {
    loadData()
  }, [selectedJob, groupBy])

  // ── High-Performance SSE (Server-Sent Events) Live Updates ──
  useEffect(() => {
    if (groupBy !== 'role' || !selectedJob) return

    const url = resumesApi.streamUrl(selectedJob)
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      const statuses = JSON.parse(event.data)
      let needsFullRefresh = false
      
      setCandidates(prev => {
        let changed = false
        const next = prev.map(c => {
          const newStatus = statuses[String(c.id)]
          if (newStatus && c.status !== newStatus) {
            changed = true
            // If they finish parsing, we must refresh to grab their extracted real Name & Email
            if (newStatus === 'parsed') {
              toast.success(`Candidate ${c.name === 'Parsing...' ? '' : c.name} parsed successfully!`)
              needsFullRefresh = true
            }
            if (newStatus === 'failed') {
              toast.error(`Parsing failed for a candidate.`)
              needsFullRefresh = true
            }
            return { ...c, status: newStatus }
          }
          return c
        })
        return changed ? next : prev
      })

      if (needsFullRefresh) {
        loadCandidatesByRole()
      }
    }

    eventSource.onerror = () => {
      // close on error to prevent infinite reconnection spam
      eventSource.close()
    }

    return () => eventSource.close()
  }, [selectedJob, groupBy])

  async function loadData() {
    if (groupBy === 'role') {
      if (selectedJob) await loadCandidatesByRole()
    } else {
      await loadCandidatesByDate()
    }
  }

  async function loadCandidatesByRole() {
    if (!selectedJob) return
    try {
      setCandidates(await resumesApi.listByJob(selectedJob))
    } catch { /* silent */ }
  }

  async function loadCandidatesByDate() {
    try {
      // If a job is selected, scope the date view to that role; otherwise show all
      setDateGroups(await resumesApi.listByDate(selectedJob || null))
    } catch { /* silent */ }
  }

  // ── Upload handler ─────────────────────────────────────
  async function handleFiles(files) {
    if (!selectedJob) { alert('Please select a job role first.'); return }
    setUploading(true)
    setUploadProgress(0)
    try {
      const result = await resumesApi.upload(parseInt(selectedJob), files, pct => setUploadProgress(pct))
      toast.success(`Successfully uploaded ${files.length} resume${files.length > 1 ? 's' : ''}!`)
      const newRows = result.candidates.map((c, i) => ({ file: files[i], candidateId: c.id }))
      setLocalFiles(prev => [...prev, ...newRows])
      await loadData()
    } catch (e) {
      const msg = e.response?.data?.detail || e.message
      toast.error('Upload failed: ' + msg)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // ── Merge local file refs with polled candidates ───────
  const displayRows = useCallback(() =>
    candidates.map(c => ({
      file: localFiles.find(r => r.candidateId === c.id)?.file || null,
      candidate: c,
    })), [candidates, localFiles])

  const statusCounts = candidates.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  // ── Total counts for date mode ─────────────────────────
  const dateTotals = dateGroups.reduce((acc, g) => acc + g.candidate_count, 0)

  return (
    <div className="page-wrapper" style={{ animation: 'fadeIn .4s ease' }}>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h2>Upload Resumes</h2>
          <p>Bulk upload PDF, DOCX, JPG, PNG resumes for AI parsing</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      {/* ── Controls row: Job selector + Group-By toggle ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>

          {/* Job selector */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>
              Job Role {groupBy === 'date' ? '(optional filter)' : '*'}
            </label>
            <select
              className="form-select"
              style={{ width: '100%' }}
              value={selectedJob}
              onChange={e => setSelectedJob(e.target.value)}
            >
              {groupBy === 'date' && <option value="">All roles</option>}
              {groupBy === 'role' && <option value="">Select a job role…</option>}
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
              ))}
            </select>
          </div>

          {/* Group-by toggle */}
          <GroupToggle value={groupBy} onChange={v => { setGroupBy(v); setLocalFiles([]) }} />

          {/* Status summary (role mode) */}
          {groupBy === 'role' && candidates.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignSelf: 'center' }}>
              {Object.entries(statusCounts).map(([s, n]) => (
                <span key={s} className={`status-badge ${s}`}>{n} {s}</span>
              ))}
            </div>
          )}

          {/* Summary pill (date mode) */}
          {groupBy === 'date' && dateTotals > 0 && (
            <div className="badge badge-blue" style={{ alignSelf: 'center', fontSize: '.8rem', padding: '5px 12px' }}>
              {dateTotals} total • {dateGroups.length} batch{dateGroups.length !== 1 ? 'es' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/*  ROLE MODE (original view + dropzone)                 */}
      {/* ══════════════════════════════════════════════════════ */}
      {groupBy === 'role' && (
        <>
          {selectedJob ? (
            <>
              <FileDropzone onFiles={handleFiles} />

              {uploading && (
                <div style={{ marginTop: 12, padding: '12px 16px', background: '#EBF4FF', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(30,58,95,.2)' }} />
                  <span style={{ fontSize: '.875rem', color: 'var(--primary)', fontWeight: 600 }}>
                    Uploading… {uploadProgress}%
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="progress-track" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${uploadProgress}%`, background: 'var(--primary)' }} />
                    </div>
                  </div>
                </div>
              )}

              <div className="file-list" style={{ marginTop: 24 }}>
                {displayRows().map((row, i) => (
                  <FileRow key={row.candidate?.id || i} file={row.file} candidate={row.candidate} />
                ))}
              </div>

              {candidates.length === 0 && !uploading && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px', fontSize: '.875rem' }}>
                  No resumes uploaded yet. Drag files above to start.
                </div>
              )}

              {candidates.some(c => c.status === 'parsed') && (
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-accent btn-lg" onClick={() => navigate(`/ranking/${selectedJob}`)}>
                    🏆 Go to Ranking →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ marginTop: 40 }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ width: 56, height: 56, color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3>Select a Job Role</h3>
              <p>Choose a job role above to start uploading resumes, or create a new role from the Dashboard.</p>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/*  DATE MODE (batch-grouped view)                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {groupBy === 'date' && (
        <>
          {/* Upload still possible from date mode if a job is selected */}
          {selectedJob && (
            <>
              <FileDropzone onFiles={handleFiles} />
              {uploading && (
                <div style={{ marginTop: 12, padding: '12px 16px', background: '#EBF4FF', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(30,58,95,.2)' }} />
                  <span style={{ fontSize: '.875rem', color: 'var(--primary)', fontWeight: 600 }}>Uploading… {uploadProgress}%</span>
                  <div style={{ flex: 1 }}>
                    <div className="progress-track" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${uploadProgress}%`, background: 'var(--primary)' }} />
                    </div>
                  </div>
                </div>
              )}
              <div style={{ margin: '20px 0 8px', height: 1, background: 'var(--border)' }} />
            </>
          )}

          {/* Date-grouped list */}
          {dateGroups.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 40 }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ width: 56, height: 56, color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3>No upload batches yet</h3>
              <p>Select a job role and upload resumes to see them grouped by batch date here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {dateGroups.map(group => (
                <div key={group.date_iso} className="batch-group">
                  <DateGroupHeader group={group} />
                  <div className="file-list" style={{ marginTop: 8 }}>
                    {group.candidates.map(c => (
                      <FileRow key={c.id} file={null} candidate={c} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
