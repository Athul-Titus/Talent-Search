import { useState, useEffect } from 'react'
import { candidatesApi } from '../api/client'
import { useToast } from '../contexts/ToastContext'

function copyToClipboard(questions) {
  const text = questions
    .map((q, i) => `Q${i + 1}. ${q.question}\n    💡 ${q.reason}`)
    .join('\n\n')
  navigator.clipboard.writeText(text).catch(() => {})
}

/**
 * Floating fixed-position interview panel.
 * Rendered by RankTable as a global overlay — one at a time.
 * Opens immediately on mount and fetches questions right away.
 */
export default function InterviewPanel({ candidateId, candidateName, jdText, onClose }) {
  const [loading, setLoading]     = useState(true)
  const [questions, setQuestions] = useState(null)
  const [error, setError]         = useState('')
  const toast = useToast()

  // Auto-fetch on mount
  useEffect(() => {
    if (!jdText?.trim()) {
      setError('No Job Description found. Paste a JD in the left panel first.')
      setLoading(false)
      return
    }
    candidatesApi.generateQuestions(candidateId, jdText)
      .then(data => {
        setQuestions(data.questions || [])
        toast.success('Interview questions generated!')
        setLoading(false)
      })
      .catch(e => {
        const msg = e.response?.data?.detail || 'Failed to generate questions. Please try again.'
        setError(msg)
        toast.error(msg)
        setLoading(false)
      })
  }, [])

  function handleCopy() {
    if (questions) {
      copyToClipboard(questions)
      toast.success('Questions copied to clipboard!')
    }
  }

  return (
    <div className="interview-panel">
      {/* Header */}
      <div className="interview-panel-header">
        <span className="interview-panel-title">🎤 Interview Questions</span>
        <span className="interview-panel-name">{candidateName}</span>
        <button className="interview-close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="interview-loading">
          <div className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
          <p>Analyzing candidate profile against JD…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="interview-error">
          ⚠️ {error}
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      )}

      {/* Questions */}
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
            <span style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>
              {questions.length} targeted question{questions.length !== 1 ? 's' : ''}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCopy}
              style={{ fontSize: '.73rem' }}
            >
              📋 Copy All
            </button>
          </div>
        </>
      )}
    </div>
  )
}
