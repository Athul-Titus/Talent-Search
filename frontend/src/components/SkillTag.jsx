export default function SkillTag({ label, variant = 'default' }) {
  const styles = {
    default: { background: '#EBF4FF', color: '#1E3A5F', border: '1px solid #BFDBFE' },
    green:   { background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7' },
    gray:    { background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' },
    warn:    { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' },
  }
  return (
    <span
      className="skill-tag"
      style={styles[variant] || styles.default}
    >
      {label}
    </span>
  )
}
