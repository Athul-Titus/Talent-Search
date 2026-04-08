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
        width:        '110px',  /* Increased layout size */
        height:       '110px',
        flexShrink:   0,
        position:     'relative',
        cursor:       loaded && !animating ? 'pointer' : 'default',
        transition:   'transform .3s cubic-bezier(0.16,1,0.3,1)',
        transform:    hovered && loaded && !animating ? 'scale(1.05)' : 'scale(1)',
        animation:    animating ? 'none' : 'float-3d 6s ease-in-out infinite',
        /* This perfectly fades the image edges to transparent so there's no square box */
        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 45%, transparent 68%)',
        maskImage: 'radial-gradient(circle at 50% 50%, black 45%, transparent 68%)',
      }}
    >
      <style>{`
        @keyframes float-3d {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-3px) scale(1.02); }
        }
      `}</style>
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
            position: 'absolute', inset: '0', borderRadius: '50%',
            border: '2px solid rgba(100,250,250,0.8)',
            animation: 'electric-wave 1s ease-out infinite',
            pointerEvents: 'none', zIndex: 12,
          }} />
          <div style={{
            position: 'absolute', inset: '0', borderRadius: '50%',
            border: '2px solid rgba(100,250,250,0.6)',
            animation: 'electric-wave 1.2s ease-out .3s infinite',
            pointerEvents: 'none', zIndex: 12,
          }} />
          <div style={{
            position: 'absolute', inset: '0', borderRadius: '50%',
            border: '2px solid rgba(100,250,250,0.4)',
            animation: 'electric-wave 1.5s ease-out .6s infinite',
            pointerEvents: 'none', zIndex: 12,
          }} />
        </>
      )}

      {/* ── Frame container: totally borderless and blended ── */}
      <div style={{
        width: '100%', height: '100%',
        position: 'relative',
        zIndex: 1,
        transition: 'all .4s ease',
      }}>
        {/* Subtle shimmer on hover — feels like light reflecting off 3D object */}
        {hovered && !animating && loaded && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 9, pointerEvents: 'none',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)',
            mixBlendMode: 'overlay',
            borderRadius: '50%',
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

        {/* The 3D frame — fully masked circular fade */}
        {loaded && (
          <img
            src={FRAMES[currentFrame]}
            alt="Cymonic AI Core"
            draggable={false}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              display: 'block',
              transform: 'scale(1.5)', /* Moderate zoom inside the larger 110px box */
              transformOrigin: '50% 50%',
              mixBlendMode: 'lighten', /* Ensures the pure black drops out seamlessly */
              filter: animating
                ? 'brightness(1.2) saturate(1.1) contrast(1.1)'
                : 'brightness(1) saturate(1.05)',
              transition: animating ? 'none' : 'filter .6s ease',
            }}
          />
        )}
      </div>
    </div>
  )
}
