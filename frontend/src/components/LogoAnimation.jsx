import { useState, useEffect, useRef } from 'react'

const TOTAL_FRAMES = 232
const BASE_PATH    = '/images/logo/ezgif-frame-'
const FPS          = 28   // ~8s full animation pass

function pad(n) { return String(n).padStart(3, '0') }

const FRAMES = Array.from({ length: TOTAL_FRAMES }, (_, i) =>
  `${BASE_PATH}${pad(i + 1)}.jpg`
)

// The "assembled" resting frame — first frame looks like the composed 3D object
const RESTING_FRAME = 0

export default function LogoAnimation() {
  const [currentFrame, setCurrentFrame] = useState(RESTING_FRAME)
  const [loaded, setLoaded]     = useState(false)
  const [animating, setAnimating] = useState(false)
  const [hovered, setHovered]   = useState(false)
  const frameRef    = useRef(RESTING_FRAME)
  const intervalRef = useRef(null)

  // ── Progressive preload all frames silently ──────────
  useEffect(() => {
    let count = 0
    FRAMES.forEach(src => {
      const img = new Image()
      img.onload = () => { count++; if (count >= 10) setLoaded(true) }
      img.src = src
    })
  }, [])

  // ── Click → play deconstruction once, then snap back ─
  function handleClick() {
    if (!loaded || animating) return

    setAnimating(true)
    frameRef.current = 0

    intervalRef.current = setInterval(() => {
      const next = frameRef.current + 1
      if (next >= TOTAL_FRAMES) {
        // Animation complete — snap back to resting state
        clearInterval(intervalRef.current)
        frameRef.current = RESTING_FRAME
        setCurrentFrame(RESTING_FRAME)
        setAnimating(false)
      } else {
        frameRef.current = next
        setCurrentFrame(next)
      }
    }, 1000 / FPS)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={animating ? '' : 'Click to see AI deconstruct'}
      style={{
        width:        '62px',
        height:       '62px',
        flexShrink:   0,
        position:     'relative',
        cursor:       loaded && !animating ? 'pointer' : 'default',
        transition:   'transform .3s cubic-bezier(0.16,1,0.3,1)',
        transform:    hovered && loaded && !animating ? 'scale(1.06)' : 'scale(1)',
      }}
    >
      {/* ── Idle breathing halo — always present ─────── */}
      <div style={{
        position: 'absolute', inset: '-10px',
        borderRadius: '22px', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(20,200,200,0.12) 0%, transparent 70%)',
        animation: animating ? 'none' : 'breathe 3.5s ease-in-out infinite',
        opacity: animating ? 0 : 1,
        transition: 'opacity .4s ease',
      }} />

      {/* ── Active pulse rings during animation ─────── */}
      {animating && (
        <>
          <div style={{
            position: 'absolute', inset: '-4px', borderRadius: '18px',
            border: '1.5px solid rgba(20,210,200,0.55)',
            animation: 'pulse-ring 1.4s cubic-bezier(0.25,0.46,0.45,0.94) infinite',
            pointerEvents: 'none', zIndex: 3,
          }} />
          <div style={{
            position: 'absolute', inset: '-4px', borderRadius: '18px',
            border: '1px solid rgba(212,175,55,0.35)',
            animation: 'pulse-ring 1.4s cubic-bezier(0.25,0.46,0.45,0.94) .7s infinite',
            pointerEvents: 'none', zIndex: 3,
          }} />
        </>
      )}

      {/* ── Frame container: looks like a 3D object, not a video ── */}
      <div style={{
        width: '100%', height: '100%',
        borderRadius: '14px',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        background: '#07090a',
        boxShadow: animating
          ? '0 0 28px rgba(20,210,200,0.45), 0 0 12px rgba(212,175,55,0.25), 0 0 0 1px rgba(20,210,200,0.2)'
          : hovered && loaded
            ? '0 0 12px rgba(20,210,200,0.18), 0 0 0 1px rgba(20,210,200,0.1)'
            : '0 0 0 1px rgba(255,255,255,0.05)',
        transition: 'box-shadow .4s ease',
      }}>
        {/* Vignette: blends edges into the dark sidebar — removes "screen" feel */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(7,9,10,0.72) 100%)',
          borderRadius: '14px',
        }} />

        {/* Subtle shimmer on hover — feels like light reflecting off 3D object */}
        {hovered && !animating && loaded && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 9, pointerEvents: 'none',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)',
            borderRadius: '14px',
            transition: 'opacity .3s ease',
          }} />
        )}

        {/* Loading state */}
        {!loaded && (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0b1616, #07090a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              border: '2px solid rgba(20,200,200,0.2)',
              borderTopColor: '#14C8C8',
              animation: 'spin .7s linear infinite',
            }} />
          </div>
        )}

        {/* The 3D frame — always shown, no play controls */}
        {loaded && (
          <img
            src={FRAMES[currentFrame]}
            alt="Cymonic AI Core"
            draggable={false}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              display: 'block',
              // Slight brightness boost makes it feel like a material, not a screenshot
              filter: animating
                ? 'brightness(1.12) saturate(1.1) contrast(1.05)'
                : 'brightness(0.92) saturate(0.85)',
              transition: animating ? 'none' : 'filter .6s ease',
            }}
          />
        )}
      </div>
    </div>
  )
}
