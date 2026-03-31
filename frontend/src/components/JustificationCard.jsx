import ScoreBar from './ScoreBar'
import SkillTag from './SkillTag'

function initials(name = '') {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'
}

export default function JustificationCard({ result, rank }) {
  const rankColors = ['#F59E0B','#9CA3AF','#CD7C45']
  const rankColor  = rankColors[rank - 1] || 'var(--primary)'

  return (
    <div className="justification-card">
      <div className="jc-header">
        <div className="jc-avatar" style={{ background: `linear-gradient(135deg, ${rankColor}, ${rankColor}cc)` }}>
          {initials(result.candidate_name)}
        </div>
        <div>
          <div className="jc-name">{result.candidate_name}</div>
          <div style={{ fontSize:'.75rem', color:'var(--text-muted)' }}>
            #{rank} · {result.total_professional_years?.toFixed(1) || '–'} yrs experience
          </div>
        </div>
        <div className="jc-score">
          <div style={{ fontSize:'1.4rem', fontWeight:800, color: result.overall_score >= 70 ? 'var(--accent)' : result.overall_score >= 50 ? '#F59E0B' : '#EF4444', lineHeight:1 }}>
            {result.overall_score?.toFixed(0)}%
          </div>
          <div style={{ fontSize:'.65rem', color:'var(--text-muted)', textAlign:'right' }}>match</div>
        </div>
      </div>

      {/* Sub-scores */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
        {[
          { label:'Skills',     val: result.skills_match_score },
          { label:'Experience', val: result.experience_match_score },
          { label:'Education',  val: result.education_match_score },
          { label:'Domain Fit', val: result.domain_fit_score },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize:'.7rem', color:'var(--text-muted)', marginBottom:'3px', fontWeight:600 }}>{s.label}</div>
            <ScoreBar score={s.val} height={5} />
          </div>
        ))}
      </div>

      {/* Justification */}
      {result.justification && (
        <p className="jc-text">
          <span style={{ color:'var(--primary)', fontWeight:600 }}>🤖 AI Summary: </span>
          {result.justification}
        </p>
      )}

      {/* Matched skills */}
      {result.matched_skills?.length > 0 && (
        <div className="jc-skills" style={{ marginTop:'10px' }}>
          <span style={{ fontSize:'.7rem', color:'var(--text-muted)', fontWeight:600, marginRight:4 }}>Matched:</span>
          {result.matched_skills.slice(0,6).map(s => (
            <SkillTag key={s} label={s} variant="green" />
          ))}
        </div>
      )}
      {result.missing_skills?.length > 0 && (
        <div className="jc-skills" style={{ marginTop:'6px' }}>
          <span style={{ fontSize:'.7rem', color:'var(--text-muted)', fontWeight:600, marginRight:4 }}>Missing:</span>
          {result.missing_skills.slice(0,4).map(s => (
            <SkillTag key={s} label={s} variant="warn" />
          ))}
        </div>
      )}
    </div>
  )
}
