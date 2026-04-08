import ScoreBar from './ScoreBar'
import SkillTag from './SkillTag'
import CredibilityBadge from './CredibilityBadge'
import RadarCandidateChart from './RadarCandidateChart'

function initials(name = '') {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'
}

export default function JustificationCard({ result, rank }) {
  const rankColors = ['#FBBF24','#9CA3AF','#CD7C45']
  const rankColor  = rankColors[rank - 1] || 'var(--primary)'

  const isSuspicious = result.flag_level === 'High Suspicion'
  const isModerate   = result.flag_level === 'Moderate'
  const showWarning  = isSuspicious || isModerate

  return (
    <div
      className="justification-card"
      style={isSuspicious ? { borderLeftColor: '#EF4444', borderLeftWidth: 4 } : {}}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '32px', alignItems: 'center' }}>
        
        {/* ── Left Side: Details & AI ── */}
        <div>
          {/* ── Header ── */}
          <div className="jc-header" style={{ marginBottom: '20px' }}>
            <div className="jc-avatar" style={{ background: `linear-gradient(135deg, ${rankColor}, rgba(212,175,55,0.4))` }}>
              {initials(result.candidate_name)}
            </div>
            <div>
              <div className="jc-name" style={{ fontSize: '1.05rem', color: 'var(--primary-light)' }}>{result.candidate_name}</div>
              <div style={{ fontSize:'.8rem', color:'var(--text-muted)', fontWeight: 600 }}>
                #{rank} · {result.total_professional_years?.toFixed(1) || '–'} yrs experience
              </div>
            </div>
            <div className="jc-score">
              <div style={{
                fontSize:'1.6rem', fontWeight:800, lineHeight:1, letterSpacing: '-0.5px',
                color: result.overall_score >= 70 ? 'var(--primary-light)'
                     : result.overall_score >= 50 ? '#F59E0B' : '#EF4444',
              }}>
                {result.overall_score?.toFixed(0)}%
              </div>
              <div style={{ fontSize:'.7rem', color:'var(--text-muted)', textAlign:'right', fontWeight: 600, textTransform: 'uppercase' }}>match</div>
            </div>
          </div>

          {/* ── Mini Sub-scores ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
            {[
              { label:'Skills',     val: result.skills_match_score },
              { label:'Experience', val: result.experience_match_score },
              { label:'Education',  val: result.education_match_score },
              { label:'Domain Fit', val: result.domain_fit_score },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:'.7rem', color:'var(--text-muted)', marginBottom:'4px', fontWeight:700, textTransform: 'uppercase' }}>{s.label}</div>
                <ScoreBar score={s.val} height={5} />
              </div>
            ))}
          </div>

          {/* ── AI Justification ── */}
          {result.justification && (
            <p className="jc-text" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ color:'var(--primary)', fontWeight:700, display: 'block', marginBottom: '4px' }}>🤖 AI Summary </span>
              {result.justification}
            </p>
          )}

          {/* ── Matched / Missing skills ── */}
          {result.matched_skills?.length > 0 && (
            <div className="jc-skills" style={{ marginTop:'16px' }}>
              <span style={{ fontSize:'.75rem', color:'var(--text-muted)', fontWeight:700, marginRight:6 }}>Matched:</span>
              {result.matched_skills.slice(0,6).map(s => (
                <SkillTag key={s} label={s} variant="green" />
              ))}
            </div>
          )}
          {result.missing_skills?.length > 0 && (
            <div className="jc-skills" style={{ marginTop:'8px' }}>
              <span style={{ fontSize:'.75rem', color:'var(--text-muted)', fontWeight:700, marginRight:6 }}>Missing:</span>
              {result.missing_skills.slice(0,4).map(s => (
                <SkillTag key={s} label={s} variant="warn" />
              ))}
            </div>
          )}
        </div>

        {/* ── Right Side: 3D Radar Chart ── */}
        <div style={{ height: '100%', minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RadarCandidateChart result={result} />
        </div>

      </div>

      {/* ── Keyword Stuffing Warning Banner (Full width below) ── */}
      {showWarning && result.flag_level && (
        <div className={`fraud-banner ${isSuspicious ? 'fraud-high' : 'fraud-moderate'}`} style={{ marginTop: '24px' }}>
          <div className="fraud-banner-header">
            <span className="fraud-banner-icon">{isSuspicious ? '⚠️' : '⚡'}</span>
            <span className="fraud-banner-title">
              {isSuspicious ? 'Keyword Stuffing Detected' : 'Possible Keyword Inflation'}
            </span>
            <CredibilityBadge
              flagLevel={result.flag_level}
              reason={result.flag_reason}
              score={result.credibility_score}
            />
          </div>

          {result.flag_reason && (
            <p className="fraud-reason">{result.flag_reason}</p>
          )}

          {result.stuffed_keywords?.length > 0 && (
            <div className="fraud-keywords">
              <span className="fraud-keywords-label">Suspected keywords:</span>
              <div className="fraud-keywords-list">
                {result.stuffed_keywords.map(k => (
                  <span key={k} className="fraud-keyword-tag">{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

