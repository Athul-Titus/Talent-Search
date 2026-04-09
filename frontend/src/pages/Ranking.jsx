import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jobsApi, rankingApi } from '../api/client'
import RankTable from '../components/RankTable'
import JustificationCard from '../components/JustificationCard'
import { InfoTip } from '../components/Tooltip'
import { useToast } from '../contexts/ToastContext'

const ROLE_PRESETS = {
  Default: { experience: 35, skills: 30, domain: 20, education: 15 },
  Technical: { experience: 30, skills: 50, domain: 10, education: 10 },
  Managing: { experience: 50, skills: 10, domain: 30, education: 10 },
  Internship: { experience: 5, skills: 20, domain: 30, education: 45 },
}

export default function Ranking() {
  const { jobId }   = useParams()
  const navigate    = useNavigate()
  const toast       = useToast()

  const [jobs, setJobs]             = useState([])
  const [selectedJob, setSelectedJob] = useState(jobId || '')
  const [jdText, setJdText]         = useState('')
  const [results, setResults]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [polling, setPolling]       = useState(false)
  const [step, setStep]             = useState('')  // status message
  const [isBlindMode, setIsBlindMode] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('Default')
  const pollRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load jobs
  useEffect(() => {
    jobsApi.list().then(data => {
      setJobs(data)
      if (!selectedJob && data.length > 0) setSelectedJob(String(data[0].id))
    })
  }, [])

  // Load existing results and JD when job changes
  useEffect(() => {
    if (!selectedJob) return
    setResults([])

    // 1. Auto-restore Job Description text
    const cachedJd = localStorage.getItem(`cymonic_jd_${selectedJob}`)
    if (cachedJd) {
      setJdText(cachedJd)
    } else {
      const jobObj = jobs.find(j => String(j.id) === String(selectedJob))
      if (jobObj && jobObj.description) {
        setJdText(jobObj.description)
      } else {
        setJdText('')
      }
    }

    // 2. Fetch results and see if a ranking is already/still active in the background
    rankingApi.getResults(selectedJob)
      .then(data => {
        setResults(data)
        
        // Check for underlying background task
        rankingApi.getStatus(selectedJob).then(status => {
          if (status && !status.is_complete) {
            // Re-mount the active polling state
            setPolling(true)
            setLoading(true)
            setStep('AI is still scoring candidates… (resumed connection)')
            
            pollRef.current = setInterval(async () => {
              try {
                const s = await rankingApi.getStatus(selectedJob)
                if (s.is_complete) {
                  const d = await rankingApi.getResults(selectedJob)
                  setResults(d)
                  setStep(`Ranked ${d.length} candidates`)
                  toast.success(`Semantic ranking complete!`)
                  setLoading(false)
                  stopPolling()
                }
              } catch (e) { /* continue polling */ }
            }, 5000)
          }
        }).catch(() => {})

      })
      .catch(() => {})
  }, [selectedJob, jobs])

  // Save the JD text when the user types it in
  useEffect(() => {
    if (selectedJob && jdText) {
      localStorage.setItem(`cymonic_jd_${selectedJob}`, jdText)
    }
  }, [selectedJob, jdText])

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setPolling(false)
  }

  async function handleRank() {
    if (!selectedJob) { toast.warning('Select a job role first.'); return }
    if (!jdText.trim()) { toast.warning('Paste or upload a Job Description first.'); return }
    setLoading(true)
    setStep('Queuing AI scoring…')
    toast.info('AI ranking queued. This may take a minute...')
    setResults([])
    stopPolling()

    try {
      const w = ROLE_PRESETS[selectedPreset]
      const weights = {
        experience_match_score: w.experience / 100,
        skills_match_score: w.skills / 100,
        domain_fit_score: w.domain / 100,
        education_match_score: w.education / 100
      }
      await rankingApi.trigger(parseInt(selectedJob), jdText, weights)
      setStep('AI is scoring candidates… (this may take 30–60 s)')
      setPolling(true)

      // Poll every 5 seconds until results arrive
      pollRef.current = setInterval(async () => {
        try {
          const status = await rankingApi.getStatus(selectedJob)
          if (status.is_complete) {
            const data = await rankingApi.getResults(selectedJob)
            setResults(data)
            setStep(`Ranked ${data.length} candidates`)
            toast.success(`Semantic ranking complete! ${data.length} candidates scored.`)
            setLoading(false)
            stopPolling()
          }
        } catch (e) { /* continue polling */ }
      }, 5000)

      // Safety timeout after 3 minutes
      setTimeout(() => {
        if (polling) {
          stopPolling()
          setLoading(false)
          setStep('Timed out — please try again or check backend logs.')
        }
      }, 3 * 60 * 1000)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message
      toast.error('Ranking failed: ' + msg)
      setLoading(false)
      setStep('')
    }
  }

  async function handleJdFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    setJdText(text)
    e.target.value = ''
  }

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [])

  const selectedJobObj = jobs.find(j => String(j.id) === String(selectedJob))
  const top5 = results.slice(0, 5)

  return (
    <div className="page-wrapper" style={{ animation:'fadeIn .4s ease' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2>Talent Ranking</h2>
            {/* ── Premium Toggle Switch (Bias-Free Mode) ── */}
            <div 
              className={`premium-toggle ${isBlindMode ? 'active' : ''}`}
              onClick={() => setIsBlindMode(!isBlindMode)}
            >
              <div className="toggle-track">
                <div className="toggle-thumb" />
              </div>
              <span className="premium-toggle-label">
                {isBlindMode ? 'Blind Mode Active' : 'Enable Blind Mode'}
              </span>
            </div>
            <InfoTip text="Blind Hiring Mode dynamically hides all Personally Identifiable Information (name, email, phone) during the ranking review. This prevents unconscious bias and ensures candidates are evaluated purely on merit and skill." position="bottom" />
          </div>
          <p>Paste a Job Description to semantically rank all parsed candidates</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      {/* Job selector */}
      <div style={{ marginBottom:24, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <label style={{ fontSize:'.875rem', fontWeight:600, color:'var(--text)' }}>Job Role:</label>
        <select
          className="form-select"
          value={selectedJob}
          onChange={e => setSelectedJob(e.target.value)}
          style={{ minWidth:280 }}
        >
          <option value="">Select a role…</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>
              {j.title} ({j.parsed_count} parsed)
            </option>
          ))}
        </select>
        {selectedJobObj && (
          <span className="badge badge-blue">{selectedJobObj.department}</span>
        )}
      </div>

      <div className="ranking-layout">
        {/* ── Left: JD Panel ── */}
        <div className="jd-panel">
          <h3>Job Description</h3>
          <p>Paste or upload the JD — our AI will semantically match candidates</p>

          <textarea
            className="jd-textarea"
            placeholder={`Paste the full job description here…\n\nExample:\n"We are looking for a Senior React Developer with 5+ years experience in TypeScript, Redux, and REST APIs. Knowledge of AWS and Docker is a plus."`}
            value={jdText}
            onChange={e => setJdText(e.target.value)}
          />

          <div className="divider-text" style={{ margin:'12px 0' }}>or</div>

          <button
            className="btn btn-ghost btn-full"
            style={{ marginBottom:16 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload JD File (.txt, .docx, .pdf)
          </button>
          <input
            ref={fileInputRef} type="file" hidden
            accept=".txt,.md,.doc,.docx,.pdf"
            onChange={handleJdFile}
          />

          {jdText && (
            <div style={{ fontSize:'.75rem', color:'var(--accent)', fontWeight:600, marginBottom:12 }}>
              ✓ {jdText.split(/\s+/).length} words loaded
            </div>
          )}

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleRank}
            disabled={loading || !jdText.trim() || !selectedJob}
          >
            {loading
              ? <><span className="spinner" /> Ranking…</>
              : <>🚀 Rank Candidates</>
            }
          </button>

          {step && (
            <div style={{
              marginTop:12, padding:'10px 14px',
              background: loading ? '#EBF4FF' : '#D1FAE5',
              borderRadius:'var(--radius-sm)',
              fontSize:'.8rem',
              color: loading ? 'var(--primary)' : 'var(--accent-dark)',
              fontWeight:500,
            }}>
              {loading && <span className="spinner spinner-dark" style={{ width:12, height:12, marginRight:6 }} />}
              {step}
            </div>
          )}

          {/* Quick guide */}
          <div style={{ marginTop:20, padding:'14px', background:'var(--bg)', borderRadius:'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.5, display: 'flex', alignItems: 'center' }}>
                AI Scoring Weights
                <InfoTip text="These weights control how the Llama-3.3 AI engine prioritizes different dimensions when scoring candidates. Switch presets to tune for Technical (skills-heavy), Managing (experience-heavy), or Internship (education-heavy) roles." position="bottom" />
              </div>
              <select 
                className="form-select btn-sm" 
                style={{ fontSize: '.75rem', padding: '2px 24px 2px 8px', minHeight: 'auto', height: 26, backgroundPosition: 'right 4px center' }}
                value={selectedPreset}
                onChange={e => setSelectedPreset(e.target.value)}
              >
                {Object.keys(ROLE_PRESETS).map(key => (
                  <option key={key} value={key}>{key} Role</option>
                ))}
              </select>
            </div>
            {[
              ['Experience', ROLE_PRESETS[selectedPreset].experience, '#3B82F6'],
              ['Skills Match', ROLE_PRESETS[selectedPreset].skills, '#10B981'],
              ['Domain Fit', ROLE_PRESETS[selectedPreset].domain, '#F59E0B'],
              ['Education', ROLE_PRESETS[selectedPreset].education, '#8B5CF6'],
            ].map(([label, pct, color]) => (
              <div key={label} style={{ marginBottom:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.72rem', color:'var(--text-secondary)', marginBottom:2 }}>
                  <span>{label}</span><span style={{ fontWeight:700, color }}>{pct}%</span>
                </div>
                <div style={{ height:4, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="results-panel">
          {results.length > 0 ? (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <h3 style={{ fontWeight:700, fontSize:'1.1rem' }}>
                  Ranked Candidates
                  <span style={{ marginLeft:10, fontSize:'.8rem', fontWeight:500, color:'var(--text-muted)' }}>
                    ({results.length} total)
                  </span>
                </h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => rankingApi.getResults(selectedJob).then(setResults)}
                >
                  ↻ Refresh
                </button>
              </div>

              <RankTable results={results} jdText={jdText} isBlindMode={isBlindMode} />

              {/* Top 5 AI Justifications */}
              {top5.length > 0 && (
                <div className="justification-section">
                  <h3 style={{ fontSize:'1rem', fontWeight:700, marginBottom:14 }}>
                    🤖 AI Justifications — Top {top5.length} Candidates
                  </h3>
                  {top5.map((r, i) => (
                    <JustificationCard key={r.id} result={r} rank={i + 1} isBlindMode={isBlindMode} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ minHeight:'400px' }}>
              {loading ? (
                <>
                  <div className="empty-state-illustration">
                    <div className="spinner spinner-dark" style={{ width:40, height:40 }} />
                  </div>
                  <h3>AI Ranking in Progress…</h3>
                  <p>
                    Our Llama-3.3 engine is reading each candidate's profile and scoring them semantically against your JD.
                  </p>
                  <div className="empty-hint">⏱ This takes 30–60 seconds depending on the number of candidates.</div>
                </>
              ) : (
                <>
                  <div className="empty-state-illustration">
                    <span className="empty-emoji">🏆</span>
                  </div>
                  <h3>Ready to Rank</h3>
                  <p>
                    Select a job role, paste a Job Description on the left, then click <strong>Rank Candidates</strong> to let our AI semantically score everyone.
                  </p>
                  <div className="empty-hint">💡 Tip: Use <code>Blind Mode</code> to remove unconscious bias from your review.</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
