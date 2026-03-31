import { useState } from 'react'
import ScoreBar from './ScoreBar'
import SkillTag from './SkillTag'

function initials(name = '') {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'
}

function RankBadge({ rank }) {
  const cls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''
  return <div className={`rank-number ${cls}`}>{rank}</div>
}

export default function RankTable({ results }) {
  const [sortKey, setSortKey]   = useState('rank')
  const [sortDir, setSortDir]   = useState('asc')
  const [filter, setFilter]     = useState('')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...results]
    .filter(r => !filter || r.candidate_name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase()
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span style={{ opacity:.3 }}>↕</span>
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      {/* Filter */}
      <div className="filters-row">
        <input
          className="form-input"
          style={{ maxWidth:'220px' }}
          placeholder="🔍  Search candidates…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <span style={{ fontSize:'.8rem', color:'var(--text-muted)', marginLeft:'auto' }}>
          {sorted.length} candidate{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrap">
        <table className="rank-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('rank')} style={{ width:60 }}>
                Rank <SortIcon k="rank" />
              </th>
              <th onClick={() => toggleSort('candidate_name')}>
                Candidate <SortIcon k="candidate_name" />
              </th>
              <th onClick={() => toggleSort('overall_score')} style={{ width:160 }}>
                Score <SortIcon k="overall_score" />
              </th>
              <th onClick={() => toggleSort('total_professional_years')} style={{ width:100 }}>
                Exp (yrs) <SortIcon k="total_professional_years" />
              </th>
              <th>Top Skills</th>
              <th style={{ width:100 }}>Domain</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id}>
                <td><RankBadge rank={r.rank} /></td>
                <td>
                  <div className="candidate-cell">
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{
                        width:32, height:32, borderRadius:'50%',
                        background:'linear-gradient(135deg,var(--primary),var(--primary-mid))',
                        color:'white', display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'.7rem', fontWeight:700, flexShrink:0,
                      }}>
                        {initials(r.candidate_name)}
                      </div>
                      <div>
                        <div className="cname">{r.candidate_name}</div>
                        {r.candidate_email && (
                          <div className="cemail">{r.candidate_email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ minWidth:140 }}>
                  <ScoreBar score={r.overall_score} />
                </td>
                <td style={{ fontWeight:700, color:'var(--text)' }}>
                  {r.total_professional_years?.toFixed(1) || '–'}
                </td>
                <td>
                  <div className="skills-wrap">
                    {(r.skills || []).slice(0,4).map(s => (
                      <SkillTag key={s} label={s} />
                    ))}
                    {(r.skills || []).length > 4 && (
                      <span className="badge badge-gray">+{r.skills.length - 4}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                    {(r.domain_tags || []).slice(0,2).map(d => (
                      <span key={d} className="badge badge-blue" style={{ fontSize:'.65rem' }}>{d}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="empty-state" style={{ padding:'48px' }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3>No results yet</h3>
            <p>Paste a job description and click "Rank Candidates" to see the ranked list.</p>
          </div>
        )}
      </div>
    </div>
  )
}
