const TABS = [
  { key: 'all',         label: 'All',        icon: '📋' },
  { key: 'shortlisted', label: 'Shortlisted', icon: '✅', color: '#00C853' },
  { key: 'on_hold',     label: 'On Hold',     icon: '⏸', color: '#FFB300' },
  { key: 'rejected',    label: 'Rejected',    icon: '❌', color: '#FF1744' },
]

export default function WorkflowFilterTabs({ results, activeTab, onTabChange }) {
  // Build counts per status from the results array
  const counts = { all: results.length }
  results.forEach(r => {
    const s = r.workflow_status || 'pending'
    counts[s] = (counts[s] || 0) + 1
  })

  return (
    <div className="workflow-tabs">
      {TABS.map(tab => {
        const count = tab.key === 'all' ? counts.all : (counts[tab.key] || 0)
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            className={`workflow-tab ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
            style={isActive && tab.color ? {
              borderBottomColor: tab.color,
              color: tab.color,
            } : {}}
          >
            <span>{tab.icon} {tab.label}</span>
            {count > 0 && (
              <span
                className="workflow-tab-count"
                style={isActive && tab.color ? { background: tab.color + '22', color: tab.color } : {}}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
