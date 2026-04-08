import { useState } from 'react'
import ScoreBar from './ScoreBar'
import SkillTag from './SkillTag'
import CredibilityBadge from './CredibilityBadge'
import ActionButtons from './ActionButtons'
import WorkflowFilterTabs from './WorkflowFilterTabs'

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function RankBadge({ rank }) {
  const cls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''
  return <div className={`rank-number ${cls}`}>{rank}</div>
}

/** Row background tint based on workflow status */
function rowStyle(workflowStatus) {
  switch (workflowStatus) {
    case 'shortlisted': return { background: 'rgba(0,200,83,0.04)',  borderLeft: '3px solid rgba(0,200,83,0.5)' }
    case 'on_hold':     return { background: 'rgba(255,179,0,0.04)', borderLeft: '3px solid rgba(255,179,0,0.5)' }
    case 'rejected':    return { background: 'rgba(255,23,68,0.04)',  borderLeft: '3px solid rgba(255,23,68,0.4)', opacity: 0.55 }
    default:            return {}
  }
}

export default function RankTable({ results: initialResults }) {
  const [sortKey, setSortKey]       = useState('rank')
  const [sortDir, setSortDir]       = useState('asc')
  const [filter, setFilter]         = useState('')
  const [workflowTab, setWorkflowTab] = useState('all')
  // Local mirror of workflow statuses so updates are instant (no refetch needed)
  const [localStatuses, setLocalStatuses] = useState({})

  function getStatus(r) {
    return localStatuses[r.candidate_id] ?? r.workflow_status ?? 'pending'
  }

  function handleStatusChange(candidateId, newStatus) {
    setLocalStatuses(prev => ({ ...prev, [candidateId]: newStatus }))
  }

  // Inject local statuses into results for tab counting
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
      {/* Workflow filter tabs */}
      <WorkflowFilterTabs
        results={results}
        activeTab={workflowTab}
        onTabChange={setWorkflowTab}
      />

      {/* Search bar */}
      <div className="filters-row" style={{ marginTop: 12 }}>
        <input
          className="form-input"
          style={{ maxWidth: '220px' }}
          placeholder="🔍  Search candidates…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filtered.length} candidate{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrap">
        <table className="rank-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('rank')} style={{ width: 60 }}>
                Rank <SortIcon k="rank" />
              </th>
              <th onClick={() => toggleSort('candidate_name')}>
                Candidate <SortIcon k="candidate_name" />
              </th>
              <th onClick={() => toggleSort('overall_score')} style={{ width: 150 }}>
                Score <SortIcon k="overall_score" />
              </th>
              <th onClick={() => toggleSort('total_professional_years')} style={{ width: 90 }}>
                Exp <SortIcon k="total_professional_years" />
              </th>
              <th>Top Skills</th>
              <th onClick={() => toggleSort('credibility_score')} style={{ width: 120 }} title="Credibility">
                Credibility <SortIcon k="credibility_score" />
              </th>
              <th style={{ width: 260 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={rowStyle(r.workflow_status)}>
                {/* Rank */}
                <td><RankBadge rank={r.rank} /></td>

                {/* Candidate */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg,var(--primary),var(--primary-mid))',
                      color: 'white', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {initials(r.candidate_name)}
                    </div>
                    <div>
                      <div className="cname">{r.candidate_name}</div>
                      {r.candidate_email && <div className="cemail">{r.candidate_email}</div>}
                      {r.status_note && (
                        <div
                          title={r.status_note}
                          style={{ fontSize: '.68rem', color: 'var(--primary-light)', marginTop: 1,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}
                        >
                          📝 {r.status_note}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Score */}
                <td style={{ minWidth: 140 }}>
                  <ScoreBar score={r.overall_score} />
                </td>

                {/* Experience */}
                <td style={{ fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
                  {r.total_professional_years?.toFixed(1) || '–'}
                </td>

                {/* Skills */}
                <td>
                  <div className="skills-wrap">
                    {(r.skills || []).slice(0, 3).map(s => (
                      <SkillTag key={s} label={s} />
                    ))}
                    {(r.skills || []).length > 3 && (
                      <span className="badge badge-gray">+{r.skills.length - 3}</span>
                    )}
                  </div>
                </td>

                {/* Credibility */}
                <td>
                  {r.flag_level ? (
                    <CredibilityBadge
                      flagLevel={r.flag_level}
                      reason={r.flag_reason}
                      score={r.credibility_score}
                    />
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>—</span>
                  )}
                </td>

                {/* Action buttons */}
                <td>
                  <ActionButtons
                    candidateId={r.candidate_id}
                    initialStatus={r.workflow_status}
                    initialNote={r.status_note || ''}
                    onStatusChange={handleStatusChange}
                  />
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
                ? 'Paste a job description and click "Rank Candidates" to see results.'
                : 'Use the action buttons to assign candidates to this category.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
