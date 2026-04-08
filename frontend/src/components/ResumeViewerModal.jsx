import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { resumesApi } from '../api/client'

const SECTION_ICONS = {
  summary: '📋',
  experience: '💼',
  education: '🎓',
  skills: '⚡',
  certifications: '🏅',
  raw: '📄',
}

function SectionHeader({ icon, title, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      marginBottom: '16px', paddingBottom: '10px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span style={{
        fontSize: '.8rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '1.2px', color: 'var(--text-secondary)',
      }}>{title}</span>
      {count != null && (
        <span style={{
          fontSize: '.7rem', fontWeight: 700, padding: '2px 10px',
          borderRadius: '12px', background: 'rgba(212,175,55,0.12)',
          color: 'var(--primary)', marginLeft: 'auto',
        }}>{count}</span>
      )}
    </div>
  )
}

function ExperienceCard({ exp, index }) {
  const typeColors = {
    professional: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: '#34D399' },
    internship:   { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', color: '#60A5FA' },
    freelance:    { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', color: '#FBBF24' },
    academic:     { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', color: '#A78BFA' },
  }
  const tc = typeColors[exp.type] || typeColors.professional

  return (
    <div style={{
      padding: '16px', borderRadius: '12px', marginBottom: '10px',
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
      transition: 'all .3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text)', marginBottom: '4px' }}>
            {exp.title || 'Untitled Role'}
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>
            {exp.company || 'Unknown Company'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {exp.duration_years != null && (
            <span style={{
              fontSize: '.72rem', fontWeight: 700, padding: '3px 10px',
              borderRadius: '12px', background: 'rgba(212,175,55,0.1)',
              color: 'var(--primary)', whiteSpace: 'nowrap',
            }}>{exp.duration_years} yr{exp.duration_years !== 1 ? 's' : ''}</span>
          )}
          <span style={{
            fontSize: '.65rem', fontWeight: 700, padding: '3px 10px', textTransform: 'uppercase',
            letterSpacing: '.5px', borderRadius: '12px',
            background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
          }}>{exp.type || 'professional'}</span>
        </div>
      </div>
      {exp.description && (
        <div style={{
          marginTop: '10px', fontSize: '.82rem', color: 'var(--text-muted)',
          lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.04)',
          paddingTop: '10px',
        }}>
          {exp.description}
        </div>
      )}
    </div>
  )
}

function EducationCard({ edu }) {
  return (
    <div style={{
      padding: '14px', borderRadius: '12px', marginBottom: '8px',
      background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)',
    }}>
      <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text)', marginBottom: '4px' }}>
        {edu.degree || 'Degree'} {edu.field ? `— ${edu.field}` : ''}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '.82rem', color: 'var(--text-secondary)' }}>
          {edu.institution || 'Institution'}
        </span>
        {edu.year && (
          <span style={{
            fontSize: '.72rem', fontWeight: 700, padding: '2px 10px',
            borderRadius: '12px', background: 'rgba(139,92,246,0.1)',
            color: '#A78BFA',
          }}>{edu.year}</span>
        )}
      </div>
    </div>
  )
}

export default function ResumeViewerModal({ candidateId, candidateName, isBlindMode, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [activeTab, setActiveTab] = useState('parsed') // 'parsed' | 'raw'

  useEffect(() => {
    resumesApi.viewResume(candidateId)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => {
        setError(e.response?.data?.detail || 'Failed to load resume')
        setLoading(false)
      })
  }, [candidateId])

  const profile = data?.parsed_profile || {}
  const displayName = isBlindMode
    ? `Candidate #${String(candidateId).padStart(4, '0')}`
    : (data?.name || candidateName)

  const modal = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 700,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 701, width: '720px', maxWidth: 'calc(100vw - 48px)',
        maxHeight: 'calc(100vh - 64px)',
        background: '#111215',
        border: '1px solid rgba(212,175,55,0.15)',
        borderRadius: '20px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp .35s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent)',
        }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '.85rem', color: '#000',
          }}>
            {isBlindMode ? '🔒' : (displayName?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>{displayName}</div>
            {!isBlindMode && data?.email && (
              <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{data.email}</div>
            )}
          </div>
          {/* Meta badges */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {data?.file_name && (
              <span style={{
                fontSize: '.68rem', fontWeight: 700, padding: '4px 12px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {data.file_type?.replace('.','').toUpperCase() || 'FILE'}
              </span>
            )}
            {profile.total_professional_years != null && (
              <span style={{
                fontSize: '.68rem', fontWeight: 700, padding: '4px 12px', borderRadius: '16px',
                background: 'rgba(212,175,55,0.1)', color: 'var(--primary)',
                border: '1px solid rgba(212,175,55,0.2)',
              }}>
                {profile.total_professional_years} yrs exp
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white',
              width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.9rem', transition: 'all .2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >✕</button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex', gap: '4px', padding: '12px 28px 0',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          {[
            { key: 'parsed', label: '📊 Parsed Resume', },
            { key: 'raw', label: '📄 Raw Text', },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px', fontSize: '.82rem', fontWeight: 700,
                border: 'none', cursor: 'pointer', borderRadius: '10px 10px 0 0',
                transition: 'all .2s',
                background: activeTab === tab.key ? 'rgba(212,175,55,0.1)' : 'transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
              <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '.9rem' }}>Loading resume…</p>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#F87171' }}>
              ⚠️ {error}
            </div>
          )}

          {data && !loading && activeTab === 'parsed' && (
            <div>
              {/* Domain Tags */}
              {(profile.domain_tags || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                  {profile.domain_tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '.72rem', fontWeight: 700, padding: '4px 14px',
                      borderRadius: '20px', background: 'rgba(212,175,55,0.08)',
                      color: 'var(--primary)', border: '1px solid rgba(212,175,55,0.2)',
                      textTransform: 'capitalize',
                    }}>{tag}</span>
                  ))}
                </div>
              )}

              {/* Summary */}
              {profile.summary && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader icon={SECTION_ICONS.summary} title="Professional Summary" />
                  <div style={{
                    padding: '16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '.9rem', color: 'var(--text-secondary)', lineHeight: '1.7',
                    fontStyle: 'italic',
                  }}>
                    "{profile.summary}"
                  </div>
                </div>
              )}

              {/* Skills */}
              {(profile.skills || []).length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader icon={SECTION_ICONS.skills} title="Technical Skills" count={profile.skills.length} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {profile.skills.map((s, i) => (
                      <span key={i} style={{
                        fontSize: '.78rem', fontWeight: 600, padding: '6px 14px',
                        borderRadius: '20px', background: 'rgba(255,255,255,0.04)',
                        color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)',
                        transition: 'all .2s',
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {(profile.experience || []).length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader icon={SECTION_ICONS.experience} title="Experience" count={profile.experience.length} />
                  {profile.experience.map((exp, i) => (
                    <ExperienceCard key={i} exp={exp} index={i} />
                  ))}
                </div>
              )}

              {/* Education */}
              {(profile.education || []).length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader icon={SECTION_ICONS.education} title="Education" count={profile.education.length} />
                  {profile.education.map((edu, i) => (
                    <EducationCard key={i} edu={edu} />
                  ))}
                </div>
              )}

              {/* Certifications */}
              {(profile.certifications || []).length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader icon={SECTION_ICONS.certifications} title="Certifications" count={profile.certifications.length} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {profile.certifications.map((cert, i) => (
                      <span key={i} style={{
                        fontSize: '.78rem', fontWeight: 600, padding: '6px 14px',
                        borderRadius: '20px', background: 'rgba(16,185,129,0.06)',
                        color: '#34D399', border: '1px solid rgba(16,185,129,0.15)',
                      }}>{cert}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info (non-blind) */}
              {!isBlindMode && (data.phone || data.email) && (
                <div style={{
                  marginTop: '8px', padding: '14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', gap: '24px', fontSize: '.82rem', color: 'var(--text-secondary)',
                }}>
                  {data.email && <span>📧 {data.email}</span>}
                  {data.phone && <span>📞 {data.phone}</span>}
                </div>
              )}
            </div>
          )}

          {data && !loading && activeTab === 'raw' && (
            <div>
              <SectionHeader icon={SECTION_ICONS.raw} title="Original Resume Text" />
              <pre style={{
                padding: '20px', borderRadius: '12px',
                background: '#0a0b0d', border: '1px solid rgba(255,255,255,0.05)',
                fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: '1.7',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: "'Inter', monospace",
                maxHeight: '500px', overflow: 'auto',
              }}>
                {data.raw_text || 'No raw text available.'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(modal, document.body)
}
