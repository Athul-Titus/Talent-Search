import { useState, useRef } from 'react'
import ScoreBar from './ScoreBar'
import SkillTag from './SkillTag'
import CredibilityBadge from './CredibilityBadge'
import ActionButtons from './ActionButtons'
import WorkflowFilterTabs from './WorkflowFilterTabs'
import InterviewPanel from './InterviewPanel'
import EmailDrafterModal from './EmailDrafterModal'
import DossierTemplate from './DossierTemplate'
import ResumeViewerModal from './ResumeViewerModal'
import { exportToPdf } from '../utils/pdfExport'

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function RankBadge({ rank }) {
  const cls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''
  return <div className={`rank-number ${cls}`}>{rank}</div>
}

function rowStyle(workflowStatus) {
  switch (workflowStatus) {
    case 'shortlisted': return { background: 'rgba(0,200,83,0.04)',  borderLeft: '3px solid rgba(0,200,83,0.5)' }
    case 'on_hold':     return { background: 'rgba(255,179,0,0.04)', borderLeft: '3px solid rgba(255,179,0,0.5)' }
    case 'rejected':    return { background: 'rgba(255,23,68,0.04)',  borderLeft: '3px solid rgba(255,23,68,0.4)', opacity: 0.55 }
    default:            return {}
  }
}

export default function RankTable({ results: initialResults, jdText = '', isBlindMode = false }) {
  const [sortKey, setSortKey]         = useState('rank')
  const [sortDir, setSortDir]         = useState('asc')
  const [filter, setFilter]           = useState('')
  const [workflowTab, setWorkflowTab] = useState('all')
  const [localStatuses, setLocalStatuses] = useState({})
  // One floating interview panel open at a time
  const [interviewCandidate, setInterviewCandidate] = useState(null) // { id, name }
  const [emailCandidate, setEmailCandidate] = useState(null) // { id, name, email, intent }
  const [resumeCandidate, setResumeCandidate] = useState(null) // { id, name }

  // PDF Export
  const [exportingCandidate, setExportingCandidate] = useState(null)
  const [exportLoadingId, setExportLoadingId] = useState(null)
  const dossierRef = useRef(null)

  const triggerExport = async (r) => {
    setExportLoadingId(r.candidate_id)
    const candidateData = {
      ...r,
      candidateName: isBlindMode ? `Candidate #${String(r.candidate_id).padStart(4, '0')}` : r.candidate_name,
      candidateEmail: isBlindMode ? 'Hidden' : r.candidate_email
    }
    setExportingCandidate(candidateData)
    
    // Wait for the DOM to update and render the hidden template
    setTimeout(async () => {
      const success = await exportToPdf(dossierRef, `Dossier_${candidateData.candidateName.replace(/ /g, '_')}.pdf`)
      if (!success) alert('Failed to generate PDF')
      setExportingCandidate(null)
      setExportLoadingId(null)
    }, 150)
  }

  function getStatus(r) {
    return localStatuses[r.candidate_id] ?? r.workflow_status ?? 'pending'
  }

  function handleStatusChange(candidateId, newStatus) {
    setLocalStatuses(prev => ({ ...prev, [candidateId]: newStatus }))
  }

  const results = initialResults.map(r => ({
    ...r,
    workflow_status: getStatus(r),
  }))

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = results
    .filter(r => !filter || r.candidate_name.toLowerCase().includes(filter.toLowerCase()))
    .filter(r => workflowTab === 'all' || r.workflow_status === workflowTab)
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase() }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span style={{ opacity: .3 }}>↕</span>
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      {/* ── Filter tabs ── */}
      <WorkflowFilterTabs results={results} activeTab={workflowTab} onTabChange={setWorkflowTab} />

      {/* ── Search bar ── */}
      <div className="filters-row" style={{ marginTop: 12 }}>
        <input
          className="form-input"
          style={{ maxWidth: '200px' }}
          placeholder="🔍  Search candidates…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        {!jdText && (
          <span style={{ fontSize: '.72rem', color: '#F59E0B', fontWeight: 600 }}>
            ⚠️ Paste JD to enable 🎤 questions
          </span>
        )}
        <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filtered.length} candidate{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="table-wrap">
        <table className="rank-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('rank')} style={{ width: 52 }}>
                # <SortIcon k="rank" />
              </th>
              <th onClick={() => toggleSort('candidate_name')}>
                Candidate <SortIcon k="candidate_name" />
              </th>
              <th onClick={() => toggleSort('overall_score')} style={{ width: 138 }}>
                Score <SortIcon k="overall_score" />
              </th>
              <th onClick={() => toggleSort('total_professional_years')} style={{ width: 68 }}>
                Exp <SortIcon k="total_professional_years" />
              </th>
              <th style={{ width: 155 }}>Skills</th>
              <th onClick={() => toggleSort('credibility_score')} style={{ width: 108 }}>
                Credibility <SortIcon k="credibility_score" />
              </th>
              <th>Actions &amp; 🎤 Interview</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={rowStyle(r.workflow_status)}>

                {/* Rank */}
                <td><RankBadge rank={r.rank} /></td>

                {/* Candidate */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'linear-gradient(135deg,var(--primary),var(--primary-mid))',
                      color: 'white', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {isBlindMode ? '🔒' : initials(r.candidate_name)}
                    </div>
                    <div>
                      <div className="cname">
                        {isBlindMode ? `Candidate #${String(r.candidate_id).padStart(4, '0')}` : r.candidate_name}
                      </div>
                      {!isBlindMode && r.candidate_email && (
                        <div className="cemail">{r.candidate_email}</div>
                      )}
                      {r.status_note && (
                        <div title={r.status_note} style={{
                          fontSize: '.63rem', color: 'var(--primary-light)', marginTop: 1,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 145,
                        }}>
                          📝 {r.status_note}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Score */}
                <td><ScoreBar score={r.overall_score} /></td>

                {/* Exp */}
                <td style={{ fontWeight: 700, color: 'var(--text)', textAlign: 'center', fontSize: '.82rem' }}>
                  {r.total_professional_years?.toFixed(1) || '–'}
                </td>

                {/* Skills */}
                <td>
                  <div className="skills-wrap">
                    {(r.skills || []).slice(0, 3).map(s => <SkillTag key={s} label={s} />)}
                    {(r.skills || []).length > 3 && (
                      <span className="badge badge-gray">+{r.skills.length - 3}</span>
                    )}
                  </div>
                </td>

                {/* Credibility */}
                <td>
                  {r.flag_level
                    ? <CredibilityBadge flagLevel={r.flag_level} reason={r.flag_reason} score={r.credibility_score} />
                    : <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>—</span>}
                </td>

                {/* Actions + 🎤 in one cell */}
                <td style={{ verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <ActionButtons
                        candidateId={r.candidate_id}
                        initialStatus={r.workflow_status}
                        initialNote={r.status_note || ''}
                        onStatusChange={handleStatusChange}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)', width: 'fit-content' }}>
                      <button
                        className={`action-btn interview-btn${interviewCandidate?.id === r.candidate_id ? ' interview-btn-active' : ''}`}
                        style={{ border: 'none', background: interviewCandidate?.id === r.candidate_id ? 'var(--primary)' : 'rgba(212,175,55,0.1)', color: interviewCandidate?.id === r.candidate_id ? '#000' : 'var(--primary)', padding: '6px 12px' }}
                        title={jdText ? 'Generate AI interview questions' : 'Paste the JD first to enable this'}
                        onClick={() => {
                          setInterviewCandidate(
                            interviewCandidate?.id === r.candidate_id
                              ? null
                              : { id: r.candidate_id, name: r.candidate_name }
                          )
                        }}
                      >
                        🎤 Questions
                      </button>
                      
                      {(getStatus(r) === 'shortlisted' || getStatus(r) === 'rejected') && (
                        <button
                          className="action-btn"
                          style={{ padding: '6px 12px', border: 'none', color: 'var(--primary-light)', background: 'rgba(255,255,255,0.05)' }}
                          title={jdText ? 'Draft personalized email with AI' : 'Paste JD to draft email'}
                          onClick={() => {
                            if (jdText) {
                              setEmailCandidate({
                                id: r.candidate_id,
                                name: isBlindMode ? `Candidate #${String(r.candidate_id).padStart(4, '0')}` : r.candidate_name,
                                email: isBlindMode ? 'Hidden' : r.candidate_email,
                                intent: getStatus(r) === 'shortlisted' ? 'shortlist' : 'reject'
                              })
                            }
                          }}
                        >
                          📧 Email
                        </button>
                      )}
                      
                      <button
                        className="action-btn"
                        style={{ padding: '6px 12px', border: 'none', color: '#60A5FA', background: 'rgba(59,130,246,0.08)' }}
                        title="View full resume"
                        onClick={() => setResumeCandidate({ id: r.candidate_id, name: r.candidate_name })}
                      >
                        👁 Resume
                      </button>
                      <button
                        className="action-btn"
                        style={{ padding: '6px 12px', border: 'none', color: '#e5e7eb', background: 'rgba(255,255,255,0.05)' }}
                        title="Download PDF Dossier"
                        disabled={exportLoadingId === r.candidate_id}
                        onClick={() => triggerExport(r)}
                      >
                        {exportLoadingId === r.candidate_id ? '⏳' : '📄'} PDF
                      </button>
                    </div>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding: '48px' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3>{workflowTab === 'all' ? 'No results yet' : `No ${workflowTab.replace('_', ' ')} candidates`}</h3>
            <p>
              {workflowTab === 'all'
                ? 'Paste a JD and click "Rank Candidates".'
                : 'Use the action buttons to move candidates here.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Global floating interview panel (fixed bottom-right) ── */}
      {interviewCandidate && (
        <InterviewPanel
          key={interviewCandidate.id}
          candidateId={interviewCandidate.id}
          candidateName={isBlindMode ? `Candidate #${String(interviewCandidate.id).padStart(4, '0')}` : interviewCandidate.name}
          jdText={jdText}
          onClose={() => setInterviewCandidate(null)}
        />
      )}

      {/* ── Global floating Email Drafter Modal ── */}
      {emailCandidate && (
        <EmailDrafterModal
          candidateId={emailCandidate.id}
          candidateName={emailCandidate.name}
          candidateEmail={emailCandidate.email}
          jdText={jdText}
          intent={emailCandidate.intent}
          onClose={() => setEmailCandidate(null)}
        />
      )}

      {/* ── Resume Viewer Modal ── */}
      {resumeCandidate && (
        <ResumeViewerModal
          candidateId={resumeCandidate.id}
          candidateName={isBlindMode ? `Candidate #${String(resumeCandidate.id).padStart(4, '0')}` : resumeCandidate.name}
          isBlindMode={isBlindMode}
          onClose={() => setResumeCandidate(null)}
        />
      )}

      {/* ── Hidden PDF Template Container ── */}
      {exportingCandidate && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <DossierTemplate 
            ref={dossierRef} 
            candidate={exportingCandidate} 
            jdText={jdText} 
          />
        </div>
      )}
    </div>
  )
}
