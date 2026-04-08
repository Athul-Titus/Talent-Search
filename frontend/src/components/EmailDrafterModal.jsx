import { useState, useEffect } from 'react'
import { candidatesApi } from '../api/client'

export default function EmailDrafterModal({ candidateId, candidateName, candidateEmail, jdText, intent, onClose }) {
  const [loading, setLoading] = useState(true)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchEmail() {
      try {
        setLoading(true)
        const res = await candidatesApi.generateEmail(candidateId, jdText, intent)
        setEmailSubject(res.subject)
        setEmailBody(res.body)
      } catch (err) {
        setError('Failed to generate email. Make sure NVIDIA NIM API is running.')
      } finally {
        setLoading(false)
      }
    }
    fetchEmail()
  }, [candidateId, jdText, intent])

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`)
    alert('Copied to clipboard!')
  }

  const intentColor = intent === 'shortlist' ? '#00C853' : '#FF1744'
  const title = intent === 'shortlist' ? 'Interview Offer' : 'Rejection Notice'

  const activeEmail = candidateEmail === 'Hidden' ? '' : candidateEmail || ''
  const safeSubject = encodeURIComponent(emailSubject)
  const safeBody = encodeURIComponent(emailBody)
  const mailtoLink = `mailto:${activeEmail}?subject=${safeSubject}&body=${safeBody}`
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${activeEmail}&su=${safeSubject}&body=${safeBody}`

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--panel-bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '700px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)', overflow: 'hidden',
        animation: 'springUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div>
            <div style={{ fontSize: '.8rem', color: intentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              Automated Draft
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
              {title} for {candidateName}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            fontSize: '1.5rem', cursor: 'pointer'
          }}>&times;</button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div className="spinner spinner-dark" style={{ width: 40, height: 40, marginBottom: 20 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Cymonic AI is crafting the perfect email...</p>
              <p style={{ fontSize: '.8rem', opacity: 0.7 }}>Analyzing resume and JD to personalize the reasoning.</p>
            </div>
          ) : error ? (
            <div style={{ background: '#FF174422', color: '#FF1744', padding: '16px', borderRadius: 8, border: '1px solid #FF174455' }}>
              ⚠️ {error}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Subject</label>
                <input 
                  type="text" 
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)', fontSize: '.95rem', fontWeight: 600
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Message Body</label>
                <textarea 
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  rows={8}
                  style={{
                    width: '100%', padding: '14px', background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)', fontSize: '.95rem', lineHeight: 1.6, resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!loading && !error && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)',
            display: 'flex', justifyContent: 'flex-end', gap: '12px'
          }}>
            <button className="btn btn-ghost" onClick={handleCopy}>
              📋 Copy to Clipboard
            </button>
            <a 
              href={gmailLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary" 
              style={{ background: '#EA4335', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
            >
              🌐 Open in Gmail
            </a>
            <a 
              href={mailtoLink}
              className="btn btn-primary" 
              style={{ background: 'var(--accent)', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
            >
              ✉️ OS Mail App
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
