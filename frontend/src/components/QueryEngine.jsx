import { useState, useRef, useEffect } from 'react'
import { queryApi } from '../api/client'
import './QueryEngine.css'

const SUGGESTIONS = [
  'Who has the highest overall score?',
  'Show me all shortlisted candidates',
  'Which candidate has the most Python experience?',
  'Who has credibility flags I should worry about?',
  'Compare the top 3 ranked candidates',
  'Who is missing React skills?',
]

function Message({ role, text, loading }) {
  return (
    <div className={`qe-message qe-message--${role}`}>
      {role === 'ai' && (
        <div className="qe-avatar">
          <span>⚡</span>
        </div>
      )}
      <div className="qe-bubble">
        {loading ? (
          <div className="qe-typing">
            <span /><span /><span />
          </div>
        ) : (
          <p>{text}</p>
        )}
      </div>
    </div>
  )
}

export default function QueryEngine() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm the **Cymonic Query Engine**. Ask me anything about your candidates — e.g. *\"Who has the best Python skills?\"* or *\"Show me all shortlisted candidates.\"*" }
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef(null)
  const inputRef                = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function sendMessage(question) {
    if (!question.trim() || loading) return
    const q = question.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)

    try {
      const res = await queryApi.ask(q)
      setMessages(prev => [...prev, { role: 'ai', text: res.answer }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Sorry, I encountered an error fetching the data. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <button
        className={`qe-trigger ${open ? 'qe-trigger--active' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Cymonic Query Engine"
      >
        {open ? '✕' : '🔍'}
        {!open && <span className="qe-trigger-label">Ask AI</span>}
      </button>

      {/* ── Chat Panel ── */}
      {open && (
        <div className="qe-panel">
          {/* Header */}
          <div className="qe-header">
            <div className="qe-header-left">
              <div className="qe-header-icon">⚡</div>
              <div>
                <div className="qe-header-title">Cymonic Query Engine</div>
                <div className="qe-header-sub">AI-powered database search</div>
              </div>
            </div>
            <button className="qe-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div className="qe-messages">
            {messages.map((m, i) => (
              <Message key={i} role={m.role} text={m.text} />
            ))}
            {loading && <Message role="ai" loading />}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only when chat is empty/fresh) */}
          {messages.length <= 1 && !loading && (
            <div className="qe-suggestions">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className="qe-suggestion-pill"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="qe-input-row">
            <textarea
              ref={inputRef}
              className="qe-input"
              placeholder="Ask anything about your candidates..."
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="qe-send"
              disabled={!input.trim() || loading}
              onClick={() => sendMessage(input)}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
