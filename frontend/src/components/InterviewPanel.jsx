import { useState } from 'react'
import { candidatesApi } from '../api/client'

function copyToClipboard(questions) {
  const text = questions
    .map((q, i) => `Q${i + 1}. ${q.question}\n    💡 ${q.reason}`)
    .join('\n\n')
  navigator.clipboard.writeText(text).catch(() => {})
}

export default function InterviewPanel({ candidateId, candidateName, jdText }) {
  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [questions, setQuestions] = useState(null)
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)

  async function handleGenerate() {
    if (open && questions) {
      // Second click — collapse
      setOpen(false)
      return
    }
    if (!jdText?.trim()) {
      setError('Paste a Job Description first (left panel).')
      setOpen(true)
      return
    }

    setLoading(true)
    setOpen(true)
    setError('')
    setQuestions(null)

    try {
      const data = await candidatesApi.generateQuestions(candidateId, jdText)
      setQuestions(data.questions || [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate questions. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (questions) {
      copyToClipboard(questions)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        className={`action-btn interview-btn ${open ? 'interview-btn-active' : ''}`}
        onClick={handleGenerate}
        disabled={loading}
        title="Generate AI interview questions for this candidate"
      >
        {loading ? (
          <>
            <span className="spinner spinner-dark" style={{ width: 11, height: 11, borderWidth: 2 }} />
            Analyzing…
          </>
        ) : (
          <>🎤 {open && questions ? 'Hide' : 'Questions'}</>
        )}
      </button>

      {/* Expandable panel — rendered outside the button, as a sibling */}
      {open && (
        <div className="interview-panel">
          <div className="interview-panel-header">
            <span className="interview-panel-title">
              🎤 Interview Questions
            </span>
            <span className="interview-panel-name">{candidateName}</span>
            <button
              className="interview-close"
              onClick={() => setOpen(false)}
              title="Close"
            >✕</button>
          </div>

          {loading && (
            <div className="interview-loading">
              <div className="spinner spinner-dark" style={{ width: 24, height: 24 }} />
              <p>Analyzing candidate profile against JD…</p>
            </div>
          )}

          {error && !loading && (
            <div className="interview-error">{error}</div>
          )}

          {questions && !loading && (
            <>
              <div className="interview-questions-list">
                {questions.map((q, i) => (
                  <div key={i} className="interview-question-item">
                    <div className="interview-q-number">Q{i + 1}</div>
                    <div className="interview-q-body">
                      <p className="interview-q-text">"{q.question}"</p>
                      {q.reason && (
                        <span className="interview-reason-tag">💡 {q.reason}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="interview-panel-footer">
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                  {questions.length} targeted question{questions.length !== 1 ? 's' : ''} generated
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCopy}
                  style={{ fontSize: '.75rem' }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy All'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
