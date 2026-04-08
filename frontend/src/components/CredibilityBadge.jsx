/**
 * CredibilityBadge — shows the flag_level as a colored pill.
 * Hovering reveals the full AI reason as a tooltip.
 */
const FLAG_CONFIG = {
  'High Suspicion': {
    bg:     'rgba(239,68,68,0.12)',
    border: '#FCA5A5',
    color:  '#991B1B',
    icon:   '🔴',
    label:  'Suspicious',
  },
  'Moderate': {
    bg:     'rgba(245,158,11,0.12)',
    border: '#FCD34D',
    color:  '#92400E',
    icon:   '🟡',
    label:  'Moderate',
  },
  'Credible': {
    bg:     'rgba(16,185,129,0.12)',
    border: '#6EE7B7',
    color:  '#065F46',
    icon:   '🟢',
    label:  'Credible',
  },
}

export default function CredibilityBadge({ flagLevel, reason, score }) {
  const cfg = FLAG_CONFIG[flagLevel] || {
    bg: '#F1F5F9', border: '#CBD5E1', color: '#475569', icon: '⚪', label: '—',
  }

  return (
    <span
      title={reason ? `${flagLevel} (${score ?? '?'}/100)\n${reason}` : flagLevel}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            5,
        padding:        '4px 10px',
        borderRadius:   20,
        fontSize:       '.7rem',
        fontWeight:     700,
        background:     cfg.bg,
        color:          cfg.color,
        border:         `1.5px solid ${cfg.border}`,
        cursor:         reason ? 'help' : 'default',
        whiteSpace:     'nowrap',
        letterSpacing:  '.2px',
        transition:     'opacity .15s',
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  )
}
