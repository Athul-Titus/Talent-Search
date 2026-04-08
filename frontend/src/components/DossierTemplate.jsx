import React, { forwardRef } from 'react'
import ScoreBar from './ScoreBar'

const DossierTemplate = forwardRef(({ candidate, jdText }, ref) => {
  return (
    <div 
      ref={ref}
      style={{
        width: '800px', /* Fixed A4 approximate width */
        padding: '60px',
        backgroundColor: '#ffffff',
        color: '#111827',
        fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box'
      }}
    >
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1f2937', fontWeight: 800 }}>{candidate.candidateName}</h1>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>{candidate.candidateEmail !== 'Hidden' ? candidate.candidateEmail : 'Email Redacted (Blind Mode)'} · {candidate.total_professional_years?.toFixed(1) || '–'} Yrs Experience</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, letterSpacing: '1px' }}>Cymonic Engine Rank</div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#d4af37' }}>#{candidate.rank}</div>
        </div>
      </div>

      {/* CORE METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px', marginBottom: '40px' }}>
        <div>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px', marginBottom: '16px' }}>Performance Metrics</h3>
          <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '42px', fontWeight: 900, color: '#1f2937', lineHeight: 1 }}>{candidate.overall_score?.toFixed(0)}%</div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, marginTop: '4px' }}>Overall Match</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Skills', val: candidate.skills_match_score, color: '#3b82f6' },
                { label: 'Experience', val: candidate.experience_match_score, color: '#10b981' },
                { label: 'Education', val: candidate.education_match_score, color: '#8b5cf6' },
                { label: 'Domain Fit', val: candidate.domain_fit_score, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#4b5563', marginBottom: '4px' }}>
                    <span style={{ textTransform: 'uppercase' }}>{s.label}</span>
                    <span>{s.val?.toFixed(0)}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${s.val}%`, height: '100%', backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* CREDIBILITY */}
          {candidate.flag_level && (
            <div style={{ marginTop: '20px', padding: '16px', background: candidate.flag_level === 'High Suspicion' ? '#fef2f2' : '#fffbeb', border: `1px solid ${candidate.flag_level === 'High Suspicion' ? '#fecaca' : '#fde68a'}`, borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: candidate.flag_level === 'High Suspicion' ? '#dc2626' : '#d97706', fontWeight: 700, marginBottom: '6px' }}>Credibility Flag: {candidate.flag_level}</div>
              <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.5 }}>{candidate.flag_reason}</div>
            </div>
          )}
        </div>

        {/* AI JUSTIFICATION & SKILLS */}
        <div>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px', marginBottom: '16px' }}>AI Justification Summary</h3>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#374151', padding: '0 0 20px 0', borderBottom: '1px solid #e5e7eb', margin: '0 0 24px 0', whiteSpace: 'pre-wrap' }}>
            {candidate.justification || 'No AI analysis available.'}
          </p>

          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '1px', marginBottom: '16px' }}>Skill Gap Analysis</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669', marginBottom: '8px' }}>Matched Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {candidate.matched_skills?.slice(0, 15).map(s => (
                  <span key={s} style={{ background: '#ecfdf5', color: '#065f46', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid #d1fae5' }}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>Missing Skills (Required by JD)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {candidate.missing_skills?.slice(0, 10).map(s => (
                  <span key={s} style={{ background: '#fef2f2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid #fee2e2' }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '10px' }}>
        <div>Generated by Cymonic Smart Talent Selection Engine</div>
        <div>Date: {new Date().toLocaleDateString()}</div>
      </div>
    </div>
  )
})

export default DossierTemplate
