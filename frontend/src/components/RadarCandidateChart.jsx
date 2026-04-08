import { useEffect, useRef, useState } from 'react'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts'

export default function RadarCandidateChart({ result }) {
  const containerRef = useRef(null)
  const [rotation, setRotation] = useState({ x: 15, y: -10 })
  const [isHovering, setIsHovering] = useState(false)

  // We are creating a 5-point radar: Experience, Tech Skills, Domain Fit, Education, Credibility
  // Using 100 as the benchmark
  const credibilityScore = result.credibility_score ? (result.credibility_score * 100) : 100

  const data = [
    {
      subject: 'Experience',
      A: result.experience_match_score || 0,
      B: 100, // Ideal benchmark
      fullMark: 100,
    },
    {
      subject: 'Tech Skills',
      A: result.skills_match_score || 0,
      B: 100,
      fullMark: 100,
    },
    {
      subject: 'Domain Fit',
      A: result.domain_fit_score || 0,
      B: 100,
      fullMark: 100,
    },
    {
      subject: 'Education',
      A: result.education_match_score || 0,
      B: 100,
      fullMark: 100,
    },
    {
      subject: 'Credibility',
      A: credibilityScore,
      B: 100,
      fullMark: 100,
    },
  ]

  // Holographic 3D mouse tracking effect
  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    
    // Calculate mouse position relative to the center of the container (-1 to 1)
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    
    // Max rotation is 20 degrees
    setRotation({
      x: -y * 20, 
      y: x * 20
    })
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    // Settle back to default isometric tilt
    setRotation({ x: 15, y: -10 })
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  return (
    <div 
      className="radar-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '260px',
        perspective: '1000px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, rgba(212,175,55,0.03) 0%, transparent 70%)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(255,255,255,0.02)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative center glow */}
      <div style={{
        position: 'absolute', width: 100, height: 100,
        background: 'var(--primary)', filter: 'blur(80px)', opacity: 0.15,
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%', 
        height: '100%',
        transition: isHovering ? 'transform 0.1s ease-out' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${isHovering ? 1.05 : 1})`,
        transformStyle: 'preserve-3d',
        willChange: 'transform'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
            {/* Darker subtle web grid */}
            <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}
              axisLine={false}
            />
            
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={false} 
              axisLine={false} 
            />
            
            {/* Benchmark Ideal Layer (Background) */}
            <Radar
              name="Ideal Candidate"
              dataKey="B"
              stroke="rgba(255,255,255,0.2)"
              fill="rgba(255,255,255,0.02)"
              fillOpacity={1}
            />
            
            {/* Candidate Score Layer (Foreground Gold) */}
            <Radar
              name="Candidate Score"
              dataKey="A"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="var(--primary)"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Glossy overlay effect for glass 3D feel */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
        pointerEvents: 'none',
        borderRadius: 'var(--radius-lg)'
      }} />
    </div>
  )
}
