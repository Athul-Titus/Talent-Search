import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobsApi } from '../api/client'
import CreateJobModal from '../components/CreateJobModal'

function initials(name = '') {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '18' }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
          {icon}
        </svg>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function JobCard({ job, onUpload, onRank }) {
  return (
    <div className="job-card">
      <div className="job-card-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <h3>{job.title}</h3>
          <span className="dept-badge">{job.department}</span>
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

  const totalCandidates  = jobs.reduce((s, j) => s + (j.candidate_count  || 0), 0)
  const totalParsed       = jobs.reduce((s, j) => s + (j.parsed_count     || 0), 0)
  const totalShortlisted  = jobs.reduce((s, j) => s + (j.shortlisted_count || 0), 0)
  const totalRejected     = jobs.reduce((s, j) => s + (j.rejected_count    || 0), 0)

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

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Active Roles"
          value={jobs.length}
          sub="Open positions"
          color="#1E3A5F"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
        />
        <StatCard
          label="Total Resumes"
          value={totalCandidates}
          sub="Across all roles"
          color="#4A90C4"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
        />
        <StatCard
          label="✅ Shortlisted"
          value={totalShortlisted}
          sub="Ready for interview"
          color="#00C853"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatCard
          label="❌ Rejected"
          value={totalRejected}
          sub="Not a fit"
          color="#FF1744"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
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
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3>No job roles yet</h3>
            <p>Create your first job role to start collecting and ranking candidates.</p>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setShowModal(true)}>
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
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateJobModal
          onClose={() => setShowModal(false)}
          onCreated={(job) => { setJobs(prev => [job, ...prev]) }}
        />
      )}
    </div>
  )
}
