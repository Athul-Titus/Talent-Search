import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Premium glassmorphism tooltip with auto-positioning.
 * 
 * Usage: <Tooltip text="Explanation here"><span>(?)</span></Tooltip>
 *    or: <Tooltip text="...">Any children</Tooltip>
 */
export default function Tooltip({ text, children, position = 'top', maxWidth = 280 }) {
  const [show, setShow] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)

  function handleEnter() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    let top, left

    switch (position) {
      case 'bottom':
        top = rect.bottom + 10
        left = rect.left + rect.width / 2
        break
      case 'left':
        top = rect.top + rect.height / 2
        left = rect.left - 10
        break
      case 'right':
        top = rect.top + rect.height / 2
        left = rect.right + 10
        break
      case 'top':
      default:
        top = rect.top - 10
        left = rect.left + rect.width / 2
        break
    }

    setCoords({ top, left })
    setShow(true)
  }

  function handleLeave() {
    setShow(false)
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="tooltip-trigger"
      >
        {children}
      </span>
      {show && createPortal(
        <div
          className={`tooltip-bubble tooltip-${position}`}
          style={{
            top: coords.top,
            left: coords.left,
            maxWidth,
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  )
}

/**
 * Small info icon that triggers a tooltip on hover.
 * Use next to labels: <InfoTip text="Explanation" />
 */
export function InfoTip({ text, position = 'top' }) {
  return (
    <Tooltip text={text} position={position}>
      <span className="info-tip-icon">?</span>
    </Tooltip>
  )
}
