import React from 'react'

/**
 * GlobalErrorBoundary catches all runtime JavaScript errors in the component tree below it.
 * It displays a premium glassmorphism fallback UI instead of crashing the whole app.
 */
export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("Cymonic Error Boundary caught:", error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleClear = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0B0E',
          color: '#F3F4F6',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '48px',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '24px'
            }}>⚠️</div>
            
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>
              Interface Disruption
            </h1>
            
            <p style={{ color: '#9CA3AF', marginBottom: '32px', lineHeight: 1.6 }}>
              A critical error occurred while rendering this view. This is often caused by unexpected data formats or transient interface issues.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#F87171',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                marginBottom: '32px',
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: '100px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  background: 'var(--primary, #D4AF37)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Reload Interface
              </button>
              
              <button 
                onClick={this.handleClear}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#F3F4F6',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Back to Safety
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
