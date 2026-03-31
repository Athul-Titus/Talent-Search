/**
 * ScoreBar – visual progress bar colored by score range
 * Props: score (0–100), showLabel (bool)
 */
export default function ScoreBar({ score = 0, showLabel = true, height = 8 }) {
  const pct = Math.min(100, Math.max(0, score))

  let color = '#EF4444'  // red   < 40
  if (pct >= 80) color = '#10B981'      // green
  else if (pct >= 60) color = '#F59E0B' // yellow
  else if (pct >= 40) color = '#F97316' // orange

  return (
    <div className="score-bar-wrap">
      <div className="score-bar-track" style={{ height }}>
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="score-value" style={{ color }}>
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
