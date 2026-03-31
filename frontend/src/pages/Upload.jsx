import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jobsApi, resumesApi } from '../api/client'
import FileDropzone from '../components/FileDropzone'

function statusColor(status) {
  return { uploading:'#F59E0B', parsing:'#3B82F6', parsed:'#10B981', failed:'#EF4444' }[status] || '#94A3B8'
}

function FileRow({ file, candidate }) {
  const status = candidate?.status || 'uploading'
  const progress = status === 'parsed' ? 100 : status === 'failed' ? 100 : status === 'parsing' ? 65 : 35

  const ext = (file?.name || candidate?.file_name || '').split('.').pop().toLowerCase()
  const iconClass = ext === 'pdf' ? 'pdf' : (ext === 'docx' || ext === 'doc') ? 'docx' : 'img'

  return (
    <div className="file-item">
      <div className={`file-icon ${iconClass}`}>
        {ext.toUpperCase().slice(0,4)}
      </div>
      <div className="file-meta">
        <div className="fname">{file?.name || candidate?.file_name || 'File'}</div>
        <div className="fsize">
          {file ? (file.size / 1024).toFixed(0) + ' KB' : ''}
          {candidate?.name && candidate.name !== 'Parsing...' && candidate.status === 'parsed'
            ? ` · ${candidate.name}` : ''}
        </div>
      </div>

      {/* Progress */}
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
        <div style={{ fontSize:'.65rem', color:'var(--text-muted)', textAlign:'right' }}>{progress}%</div>
      </div>

      {/* Status badge */}
      <div className={`status-badge ${status}`}>
        {status === 'uploading' && '⏳ Uploading'}
        {status === 'parsing'   && '🔄 Parsing'}
        {status === 'parsed'    && '✓ Parsed'}
        {status === 'failed'    && '✗ Failed'}
      </div>

      {/* Error tooltip */}
      {status === 'failed' && candidate?.error_message && (
        <span title={candidate.error_message} style={{ cursor:'help', fontSize:'.8rem' }}>⚠️</span>
      )}
    </div>
  )
}

export default function Upload() {
  const { jobId }     = useParams()
  const navigate      = useNavigate()
  const [jobs, setJobs]               = useState([])
  const [selectedJob, setSelectedJob] = useState(jobId || '')
  const [candidates, setCandidates]   = useState([])
  const [localFiles, setLocalFiles]   = useState([])  // { file, candidateId }
  const [uploading, setUploading]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Load jobs
  useEffect(() => {
    jobsApi.list().then(data => {
      setJobs(data)
      if (!selectedJob && data.length > 0) setSelectedJob(String(data[0].id))
    })
  }, [])

  // Load candidates when job changes
  useEffect(() => {
    if (!selectedJob) return
    loadCandidates()
  }, [selectedJob])

  // Poll for status updates
  useEffect(() => {
    if (!selectedJob) return
    const interval = setInterval(loadCandidates, 4000)
    return () => clearInterval(interval)
  }, [selectedJob])

  async function loadCandidates() {
    if (!selectedJob) return
    try {
      const data = await resumesApi.listByJob(selectedJob)
      setCandidates(data)
    } catch (e) { /* silent */ }
  }

  async function handleFiles(files) {
    if (!selectedJob) {
      alert('Please select a job role first.')
      return
    }
    setUploading(true)
    setUploadProgress(0)
    try {
      const result = await resumesApi.upload(
        parseInt(selectedJob),
        files,
        pct => setUploadProgress(pct)
      )
      // Immediately add local file rows while backend parses
      const newRows = result.candidates.map((c, i) => ({
        file: files[i],
        candidateId: c.id,
      }))
      setLocalFiles(prev => [...prev, ...newRows])
      await loadCandidates()
    } catch (e) {
      console.error(e)
      alert('Upload failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Merge local files with polled candidates
  const displayRows = useCallback(() => {
    return candidates.map(c => ({
      file: localFiles.find(r => r.candidateId === c.id)?.file || null,
      candidate: c,
    }))
  }, [candidates, localFiles])

  const statusCounts = candidates.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="page-wrapper" style={{ animation:'fadeIn .4s ease' }}>
      <div className="page-header">
        <div>
          <h2>Upload Resumes</h2>
          <p>Bulk upload PDF, DOCX, JPG, PNG resumes for AI parsing</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>

      {/* Job selector */}
      <div className="card" style={{ marginBottom:24 }}>
        <div className="card-body" style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:240 }}>
            <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, marginBottom:6 }}>
              Job Role *
            </label>
            <select
              className="form-select"
              style={{ width:'100%' }}
              value={selectedJob}
              onChange={e => setSelectedJob(e.target.value)}
            >
              <option value="">Select a job role…</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
              ))}
            </select>
          </div>

          {/* Status summary */}
          {candidates.length > 0 && (
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {Object.entries(statusCounts).map(([s, n]) => (
                <div key={s} className={`status-badge ${s}`} style={{ alignItems:'center' }}>
                  {n} {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dropzone */}
      {selectedJob && (
        <>
          <FileDropzone onFiles={handleFiles} />

          {/* Upload progress overlay */}
          {uploading && (
            <div style={{ marginTop:12, padding:'12px 16px', background:'#EBF4FF', borderRadius:'var(--radius)', display:'flex', alignItems:'center', gap:12 }}>
              <div className="spinner" style={{ borderTopColor:'var(--primary)', borderColor:'rgba(30,58,95,.2)' }} />
              <span style={{ fontSize:'.875rem', color:'var(--primary)', fontWeight:600 }}>
                Uploading… {uploadProgress}%
              </span>
              <div style={{ flex:1 }}>
                <div className="progress-track" style={{ height:6 }}>
                  <div className="progress-fill" style={{ width:`${uploadProgress}%`, background:'var(--primary)' }} />
                </div>
              </div>
            </div>
          )}

          {/* File list */}
          <div className="file-list" style={{ marginTop:24 }}>
            {displayRows().map((row, i) => (
              <FileRow key={row.candidate?.id || i} file={row.file} candidate={row.candidate} />
            ))}
          </div>

          {candidates.length === 0 && !uploading && (
            <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px', fontSize:'.875rem' }}>
              No resumes uploaded yet. Drag files above to start.
            </div>
          )}

          {/* Action */}
          {candidates.some(c => c.status === 'parsed') && (
            <div style={{ marginTop:24, display:'flex', justifyContent:'flex-end' }}>
              <button
                className="btn btn-accent btn-lg"
                onClick={() => navigate(`/ranking/${selectedJob}`)}
              >
                🏆 Go to Ranking →
              </button>
            </div>
          )}
        </>
      )}

      {!selectedJob && (
        <div className="empty-state" style={{ marginTop:40 }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ width:56, height:56, color:'var(--text-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3>Select a Job Role</h3>
          <p>Choose a job role above to start uploading resumes, or create a new role from the Dashboard.</p>
        </div>
      )}
    </div>
  )
}
