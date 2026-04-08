import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobsApi } from '../api/client'
import CreateJobModal from '../components/CreateJobModal'
import { InfoTip } from '../components/Tooltip'

function initials(name = '') {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'
}

// ── Animated Count-Up Hook ───────────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target == null || target === 0) { setValue(0); return }
    const start = performance.now()
    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(parseFloat((ease * target).toFixed(1)))
      if (progress < 1) requestAnimationFrame(tick)
      else setValue(target)
    }
    requestAnimationFrame(tick)
  }, [target])
  return value
}

// ── Premium KPI Card ─────────────────────────────────────────────────────────
function KpiCard({ label, rawValue, suffix = '', prefix = '', gradientFrom, icon, sub, pulse, onClick, tooltip }) {
  const animated = useCountUp(typeof rawValue === 'number' ? rawValue : 0)
  const display = rawValue == null
    ? '—'
    : `${prefix}${typeof rawValue === 'number' ? (Number.isInteger(rawValue) ? Math.round(animated) : animated.toFixed(1)) : rawValue}${suffix}`

  return (
    <div
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, rgba(${gradientFrom},0.12), rgba(${gradientFrom},0.04))`,
        border: `1px solid rgba(${gradientFrom},0.22)`,
        borderRadius: '16px', padding: '24px', position: 'relative',
        overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px rgba(${gradientFrom},0.18)` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Background glow blob */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '100px', height: '100px',
        background: `radial-gradient(circle, rgba(${gradientFrom},0.15), transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: `rgba(${gradientFrom},0.15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
        }}>{icon}</div>
        {pulse && rawValue > 0 && (
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px',
            borderRadius: '20px', background: `rgba(${gradientFrom},0.18)`,
            color: `rgb(${gradientFrom})`, letterSpacing: '0.5px', textTransform: 'uppercase'
          }}>{pulse}</span>
        )}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: `rgb(${gradientFrom})`, lineHeight: 1, marginBottom: '6px', fontVariantNumeric: 'tabular-nums' }}>{display}</div>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
        {label}
        {tooltip && <InfoTip text={tooltip} position="bottom" />}
      </div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function JobCard({ job, onUpload, onRank, onEdit, onDelete }) {
  return (
    <div className="job-card">
      <div className="job-card-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <h3>{job.title}</h3>
          <div style={{ display:'flex', gap: '8px', alignItems: 'center' }}>
            <span className="dept-badge">{job.department}</span>
            <button 
              onClick={onEdit} 
              style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px', transition:'var(--transition)' }}
              title="Edit Role"
              onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button 
              onClick={onDelete} 
              style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px', transition:'var(--transition)' }}
              title="Delete Role"
              onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {job.description && (
          <p style={{ fontSize:'.8rem', color:'rgba(255,255,255,.65)', lineHeight:1.5, marginTop:4 }}>
            {job.description.length > 80 ? job.description.slice(0,80) + '…' : job.description}
          </p>
        )}
      </div>

      <div className="job-card-body">
        {/* Stats */}
        <div className="candidate-stats">
          <div className="cstat">
            <div className="val">{job.candidate_count}</div>
            <div className="lbl">Uploaded</div>
          </div>
          <div className="cstat">
            <div className="val" style={{ color:'var(--accent)' }}>{job.parsed_count}</div>
            <div className="lbl">Parsed</div>
          </div>
          <div className="cstat">
            <div className="val" style={{ color:'var(--primary-mid)' }}>
              {job.top_candidates?.length || 0}
            </div>
            <div className="lbl">Ranked</div>
          </div>
        </div>

        {/* Top talent preview */}
        {job.top_candidates?.length > 0 ? (
          <div>
            <div style={{ fontSize:'.7rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:8 }}>
              🏆 Top Talent
            </div>
            <div className="top-talent-row">
              {job.top_candidates.map((t, i) => (
                <div key={t.id} className="talent-mini">
                  <div className="avatar">{initials(t.name)}</div>
                  <div className="tname">{t.name}</div>
                  {t.workflow_status === 'shortlisted' && (
                    <span style={{ fontSize: '.65rem', color: '#00C853', fontWeight: 700 }}>✅</span>
                  )}
                  {t.score > 0 && <div className="tscore">{t.score.toFixed(0)}%</div>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding:'12px', textAlign:'center', color:'var(--text-muted)', fontSize:'.8rem', background:'var(--bg)', borderRadius:'8px', marginBottom:'8px' }}>
            No candidates ranked yet
          </div>
        )}

        {/* Actions */}
        <div className="card-actions">
          <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={() => onUpload(job.id)}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload
          </button>
          <button className="btn btn-accent btn-sm" style={{ flex:1 }} onClick={() => onRank(job.id)}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Rank
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [jobs, setJobs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState(null)

  async function loadJobs() {
    try {
      const data = await jobsApi.list()
      setJobs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadJobs() }, [])

  const handleDeleteJob = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the role "${title}"? All uploaded candidates and rankings associated with this role will be permanently deleted.`)) return
    
    try {
      await jobsApi.delete(id)
      setJobs(jobs => jobs.filter(j => j.id !== id))
      window.dispatchEvent(new CustomEvent('cymonic-toast', { detail: { message: `Role "${title}" deleted`, type: 'success' } }))
    } catch (e) {
      window.dispatchEvent(new CustomEvent('cymonic-toast', { detail: { message: `Failed to delete role`, type: 'error' } }))
    }
  }

  const handleEditJob = (job) => {
    setEditingJob(job)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingJob(null)
  }

  const handleJobSaved = () => {
    loadJobs()
  }

  const totalCandidates  = jobs.reduce((s, j) => s + (j.candidate_count  || 0), 0)
  const totalParsed       = jobs.reduce((s, j) => s + (j.parsed_count     || 0), 0)
  const totalShortlisted  = jobs.reduce((s, j) => s + (j.shortlisted_count || 0), 0)
  const totalRejected     = jobs.reduce((s, j) => s + (j.rejected_count    || 0), 0)
  const totalFlagged      = jobs.reduce((s, j) => s + (j.flagged_count     || 0), 0)
  const allScores         = jobs.flatMap(j => j.avg_match_score != null ? [j.avg_match_score] : [])
  const avgMatchScore     = allScores.length > 0 ? parseFloat((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)) : null
  const shortlistRate     = totalParsed > 0 ? parseFloat(((totalShortlisted / totalParsed) * 100).toFixed(1)) : null

  return (
    <div className="page-wrapper" style={{ animation:'fadeIn .4s ease' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Recruiter Dashboard</h2>
          <p>Manage all open positions and track candidate pipeline</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Role
        </button>
      </div>

      {/* ── Premium KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <KpiCard label="Total Candidates" rawValue={totalCandidates} icon="👥" gradientFrom="74,144,196" sub="Across all roles" onClick={() => navigate('/upload')} tooltip="Total number of resumes uploaded and ingested across all open job roles." />
        <KpiCard label="Avg. Match Score" rawValue={avgMatchScore} suffix="%" icon="🎯" gradientFrom="212,175,55" sub="AI ranking accuracy" pulse={avgMatchScore > 70 ? 'Strong' : avgMatchScore > 50 ? 'Fair' : null} onClick={() => jobs.length > 0 && navigate(`/ranking/${jobs[0].id}`)} tooltip="The average semantic match score assigned by the Llama-3.3 AI engine across all ranked candidates." />
        <KpiCard label="Shortlisted" rawValue={totalShortlisted} icon="✅" gradientFrom="0,200,83" sub="Ready for interview" pulse={totalShortlisted > 0 ? 'Active' : null} onClick={() => navigate('/upload')} tooltip="Candidates that recruiters have marked as Shortlisted and are ready for the interview stage." />
        <KpiCard label="Credibility Flags" rawValue={totalFlagged} icon="⚠️" gradientFrom="255,179,0" sub="Suspicious resumes" pulse={totalFlagged > 0 ? 'Review' : null} onClick={() => navigate('/upload')} tooltip="Resumes flagged by the Anti-Keyword-Stuffing engine for abnormal skill density or unnatural keyword clustering." />
        <KpiCard label="Shortlist Rate" rawValue={shortlistRate} suffix="%" icon="📊" gradientFrom="139,92,246" sub="Of parsed candidates" onClick={() => jobs.length > 0 && navigate(`/ranking/${jobs[0].id}`)} tooltip="The percentage of parsed candidates that have been shortlisted — a key pipeline health indicator." />
        <KpiCard label="Active Roles" rawValue={jobs.length} icon="💼" gradientFrom="59,130,246" sub="Open positions" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} tooltip="Number of open job positions currently accepting candidate applications." />
      </div>

      {/* Jobs Grid */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h3 style={{ fontWeight:700, fontSize:'1.1rem' }}>Active Positions</h3>
        <span style={{ fontSize:'.8rem', color:'var(--text-muted)' }}>
          {jobs.length} role{jobs.length !== 1 ? 's' : ''} · click a card to manage
        </span>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'64px' }}>
          <div className="spinner spinner-dark" style={{ width:32, height:32 }} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-illustration">
              <span className="empty-emoji">💼</span>
            </div>
            <h3>Welcome to Cymonic</h3>
            <p>Create your first job role to start collecting, parsing, and AI-ranking candidates.</p>
            <div className="empty-hint">💡 Each role acts as a pipeline — upload resumes, rank with AI, and manage workflow all in one place.</div>
            <button className="btn btn-primary" style={{ marginTop:20 }} onClick={() => setShowModal(true)}>
              + Create First Role
            </button>
          </div>
        </div>
      ) : (
        <div className="jobs-grid">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onUpload={id => navigate(`/upload/${id}`)}
              onRank={id => navigate(`/ranking/${id}`)}
              onEdit={() => handleEditJob(job)}
              onDelete={() => handleDeleteJob(job.id, job.title)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateJobModal
          onClose={handleModalClose}
          onCreated={handleJobSaved}
          initialJob={editingJob}
        />
      )}
    </div>
  )
}
