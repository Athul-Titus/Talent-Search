import { useNavigate, useLocation } from 'react-router-dom'
import LogoAnimation from './LogoAnimation'

const NAV = [
  {
    label: 'Main',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )},
      { path: '/upload', label: 'Upload Resumes', icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )},
      { path: '/ranking', label: 'Rank Candidates', icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )},
    ],
  },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        {/* Animated AI core — click to play */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <LogoAnimation />
        </div>

        {/* Premium wordmark */}
        <div style={{ textAlign: 'center' }}>
          <div className="logo-wordmark">
            Cymonic
          </div>
          <div style={{
            fontSize: '.6rem',
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'transparent',
            background: 'linear-gradient(90deg, rgba(20,200,200,0.5), rgba(212,175,55,0.6), rgba(20,200,200,0.5))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Talent · AI · Engine
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(section => (
          <div key={section.label}>
            <div className="sidebar-nav-section">{section.label}</div>
            {section.items.map(item => (
              <button
                key={item.path}
                className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:2 }}>Cymonic v1.0</div>
        <div>AI-Powered HR Tech</div>
      </div>
    </aside>
  )
}
