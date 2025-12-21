import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled, { keyframes } from 'styled-components'
import { ChessPosition } from '../hooks/useGame'
import { AttackProjectile } from '../hooks/useChampions'
import { getPixelPosition, ImpactEffect } from './types'

export interface AttackProjectileConfig {
  attackerPosition: ChessPosition
  targetPosition: ChessPosition
  projectile: AttackProjectile
  boardRef: React.RefObject<HTMLDivElement>
  isRedPlayer?: boolean
  onComplete?: () => void
}

// Animation keyframes
const pulseGlow = keyframes`
  0%, 100% { filter: brightness(1) drop-shadow(0 0 8px currentColor); }
  50% { filter: brightness(1.5) drop-shadow(0 0 16px currentColor); }
`

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

const sparkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
`

// Pre-fire charging effect
const ChargingEffect = styled(motion.div) <{ $color: string }>`
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 101;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, ${props => props.$color}80 0%, transparent 70%);
    animation: ${pulseGlow} 0.3s ease-in-out infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    border: 2px solid ${props => props.$color};
    opacity: 0.6;
  }
`

const ChargingRing = styled(motion.div) <{ $color: string; $delay: number }>`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid ${props => props.$color};
  opacity: 0;
`

const ChargingParticle = styled(motion.div) <{ $color: string }>`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => props.$color};
  box-shadow: 0 0 8px ${props => props.$color}, 0 0 16px ${props => props.$color};
`

// Styled components for different projectile shapes - ENHANCED
const ProjectileWrapper = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 102;
`

const ProjectileGlow = styled.div<{ $color: string; $size: number }>`
  position: absolute;
  inset: ${props => -20 * props.$size}px;
  border-radius: 50%;
  background: radial-gradient(circle, ${props => props.$color}40 0%, transparent 70%);
  filter: blur(${props => 8 * props.$size}px);
`

const BulletProjectile = styled(motion.div) <{ $color: string; $size: number }>`
  position: relative;
  width: ${props => 32 * props.$size}px;
  height: ${props => 20 * props.$size}px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: linear-gradient(
    135deg, 
    white 0%, 
    ${props => props.$color} 30%, 
    ${props => adjustColor(props.$color, -40)} 100%
  );
  box-shadow: 
    0 0 ${props => 15 * props.$size}px ${props => props.$color},
    0 0 ${props => 30 * props.$size}px ${props => props.$color}80,
    0 0 ${props => 45 * props.$size}px ${props => props.$color}40,
    inset 0 ${props => -3 * props.$size}px ${props => 6 * props.$size}px ${props => adjustColor(props.$color, -60)};
  animation: ${pulseGlow} 0.15s ease-in-out infinite;
  
  &::before {
    content: '';
    position: absolute;
    top: 20%;
    left: 15%;
    width: 30%;
    height: 30%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    filter: blur(2px);
  }
`

const ArrowProjectile = styled(motion.div) <{ $color: string; $size: number }>`
  position: relative;
  width: ${props => 44 * props.$size}px;
  height: ${props => 12 * props.$size}px;
  background: linear-gradient(
    90deg, 
    ${props => adjustColor(props.$color, -30)} 0%, 
    ${props => props.$color} 40%,
    white 50%,
    ${props => props.$color} 60%,
    ${props => adjustColor(props.$color, -20)} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 0.5s linear infinite;
  clip-path: polygon(0 50%, 60% 0, 60% 25%, 100% 25%, 100% 75%, 60% 75%, 60% 100%);
  box-shadow: 
    0 0 ${props => 12 * props.$size}px ${props => props.$color},
    0 0 ${props => 24 * props.$size}px ${props => props.$color}60;
  
  &::after {
    content: '';
    position: absolute;
    top: 35%;
    left: 10%;
    width: 40%;
    height: 30%;
    background: rgba(255, 255, 255, 0.6);
    filter: blur(1px);
  }
`

const OrbProjectile = styled(motion.div) <{ $color: string; $size: number }>`
  position: relative;
  width: ${props => 28 * props.$size}px;
  height: ${props => 28 * props.$size}px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%, 
    white 0%, 
    ${props => adjustColor(props.$color, 40)} 20%,
    ${props => props.$color} 50%, 
    ${props => adjustColor(props.$color, -50)} 100%
  );
  box-shadow: 
    0 0 ${props => 20 * props.$size}px ${props => props.$color},
    0 0 ${props => 40 * props.$size}px ${props => props.$color}80,
    0 0 ${props => 60 * props.$size}px ${props => props.$color}40,
    inset 0 0 ${props => 15 * props.$size}px ${props => props.$color}60;
  animation: ${pulseGlow} 0.2s ease-in-out infinite;
  
  &::before {
    content: '';
    position: absolute;
    top: 15%;
    left: 20%;
    width: 35%;
    height: 35%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    filter: blur(2px);
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 20%;
    right: 15%;
    width: 15%;
    height: 15%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    filter: blur(1px);
  }
`

const BoltProjectile = styled(motion.div) <{ $color: string; $size: number }>`
  position: relative;
  width: ${props => 36 * props.$size}px;
  height: ${props => 16 * props.$size}px;
  background: linear-gradient(
    90deg, 
    transparent 0%, 
    ${props => props.$color}80 10%,
    white 30%,
    ${props => props.$color} 50%,
    white 70%,
    ${props => props.$color}80 90%,
    transparent 100%
  );
  clip-path: polygon(
    0 50%, 12% 20%, 20% 50%, 35% 0, 50% 50%, 65% 5%, 
    80% 50%, 100% 25%, 88% 50%, 100% 75%, 80% 50%, 
    65% 95%, 50% 50%, 35% 100%, 20% 50%, 12% 80%
  );
  box-shadow: 
    0 0 ${props => 15 * props.$size}px ${props => props.$color},
    0 0 ${props => 30 * props.$size}px ${props => props.$color}80;
  animation: ${pulseGlow} 0.1s ease-in-out infinite;
  
  &::before {
    content: '';
    position: absolute;
    inset: -${props => 4 * props.$size}px;
    background: inherit;
    opacity: 0.3;
    filter: blur(${props => 4 * props.$size}px);
  }
`

const MissileProjectile = styled(motion.div) <{ $color: string; $size: number }>`
  position: relative;
  width: ${props => 38 * props.$size}px;
  height: ${props => 18 * props.$size}px;
  background: linear-gradient(
    135deg, 
    white 0%,
    ${props => props.$color} 30%, 
    ${props => adjustColor(props.$color, -50)} 70%, 
    #222 100%
  );
  border-radius: ${props => `${5 * props.$size}px ${15 * props.$size}px ${15 * props.$size}px ${5 * props.$size}px`};
  box-shadow: 
    0 0 ${props => 12 * props.$size}px ${props => props.$color},
    0 0 ${props => 24 * props.$size}px ${props => props.$color}60,
    0 ${props => 3 * props.$size}px ${props => 6 * props.$size}px rgba(0,0,0,0.4);
  
  &::before {
    content: '';
    position: absolute;
    top: 15%;
    left: 10%;
    width: 25%;
    height: 40%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.7);
    filter: blur(1px);
  }
  
  &::after {
    content: '';
    position: absolute;
    left: -${props => 12 * props.$size}px;
    top: 50%;
    transform: translateY(-50%);
    width: ${props => 18 * props.$size}px;
    height: ${props => 12 * props.$size}px;
    background: radial-gradient(ellipse at right, #ff4500 0%, #ff6600 40%, #ffaa00 70%, transparent 100%);
    border-radius: 50%;
    filter: blur(${props => 3 * props.$size}px);
    animation: ${pulseGlow} 0.1s ease-in-out infinite;
  }
`

const TrailParticle = styled(motion.div) <{ $color: string; $size: number }>`
  position: absolute;
  pointer-events: none;
  z-index: 100;
  border-radius: 50%;
  background: radial-gradient(circle, white 0%, ${props => props.$color} 50%, transparent 100%);
  box-shadow: 0 0 ${props => 8 * props.$size}px ${props => props.$color};
`

const SparkleEffect = styled(motion.div) <{ $color: string }>`
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 0 6px ${props => props.$color}, 0 0 12px white;
`

const ProjectileIcon = styled.span<{ $size: number }>`
  position: relative;
  z-index: 2;
  font-size: ${props => 18 * props.$size}px;
  filter: drop-shadow(0 0 6px white) drop-shadow(0 0 12px currentColor);
`

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  if (color.startsWith('#')) {
    const num = parseInt(color.slice(1), 16)
    const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount))
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount))
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }
  return color
}

// Animation phases
type AnimationPhase = 'charging' | 'firing' | 'impact' | 'done'

const AttackProjectileAnimation: React.FC<AttackProjectileConfig> = ({
  attackerPosition,
  targetPosition,
  projectile,
  boardRef,
  isRedPlayer = false,
  onComplete
}) => {
  const [phase, setPhase] = useState<AnimationPhase>('charging')
  const [trails, setTrails] = useState<Array<{ id: number; x: number; y: number; size: number }>>([])
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; angle: number }>>([])

  // Get pixel positions
  const attackerPixels = getPixelPosition(attackerPosition, boardRef, isRedPlayer)
  const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

  // Calculate angle and distance
  const deltaX = targetPixels.x - attackerPixels.x
  const deltaY = targetPixels.y - attackerPixels.y
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  // Projectile properties with defaults
  const size = projectile.size ?? 1
  const speed = projectile.speed ?? 1
  const trailColor = projectile.trailColor ?? projectile.color

  // Duration based on actual distance - minimum 0.25s, scales with distance
  const flightDuration = Math.max(0.25, (distance / 400) / speed)
  const chargeDuration = 0.2 // Pre-fire charging time

  // Phase transitions
  useEffect(() => {
    if (phase === 'charging') {
      const timer = setTimeout(() => setPhase('firing'), chargeDuration * 1000)
      return () => clearTimeout(timer)
    }
  }, [phase])

  // Generate charging particles
  useEffect(() => {
    if (phase === 'charging') {
      const interval = setInterval(() => {
        const angle = Math.random() * Math.PI * 2
        const dist = 30 + Math.random() * 20
        setSparkles(prev => [...prev.slice(-6), {
          id: Date.now() + Math.random(),
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          angle
        }])
      }, 40)
      return () => clearInterval(interval)
    } else {
      setSparkles([])
    }
  }, [phase])

  const renderProjectile = () => {
    const commonStyle = {
      transform: `rotate(${angle}deg)`,
    }

    const ProjectileComponent = (() => {
      switch (projectile.shape) {
        case 'bullet':
          return <BulletProjectile $color={projectile.color} $size={size} style={commonStyle} />
        case 'arrow':
          return <ArrowProjectile $color={projectile.color} $size={size} style={commonStyle} />
        case 'orb':
          return <OrbProjectile $color={projectile.color} $size={size} />
        case 'bolt':
          return <BoltProjectile $color={projectile.color} $size={size} style={commonStyle} />
        case 'missile':
          return <MissileProjectile $color={projectile.color} $size={size} style={commonStyle} />
        default:
          return <OrbProjectile $color={projectile.color} $size={size} />
      }
    })()

    return (
      <>
        <ProjectileGlow $color={projectile.color} $size={size} />
        {ProjectileComponent}
        {projectile.icon && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ProjectileIcon $size={size}>{projectile.icon}</ProjectileIcon>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* Pre-fire charging effect at attacker position */}
      <AnimatePresence>
        {phase === 'charging' && (
          <ChargingEffect
            $color={projectile.color}
            style={{
              left: attackerPixels.x - 30,
              top: attackerPixels.y - 30,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: chargeDuration, ease: 'easeOut' }}
          >
            {/* Converging rings */}
            {[0, 1, 2].map(i => (
              <ChargingRing
                key={i}
                $color={projectile.color}
                $delay={i * 0.05}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: [0, 0.8, 0] }}
                transition={{
                  duration: chargeDuration,
                  delay: i * 0.05,
                  ease: 'easeIn'
                }}
              />
            ))}

            {/* Charging particles converging to center */}
            {sparkles.map(sparkle => (
              <ChargingParticle
                key={sparkle.id}
                $color={projectile.color}
                style={{
                  left: '50%',
                  top: '50%',
                }}
                initial={{
                  x: sparkle.x,
                  y: sparkle.y,
                  opacity: 1,
                  scale: 1
                }}
                animate={{
                  x: 0,
                  y: 0,
                  opacity: 0,
                  scale: 0.5
                }}
                transition={{ duration: 0.15, ease: 'easeIn' }}
              />
            ))}
          </ChargingEffect>
        )}
      </AnimatePresence>

      {/* Trail particles */}
      <AnimatePresence>
        {trails.map(trail => (
          <TrailParticle
            key={trail.id}
            $color={trailColor}
            $size={size}
            style={{
              left: trail.x - (6 * trail.size),
              top: trail.y - (6 * trail.size),
              width: 12 * trail.size * size,
              height: 12 * trail.size * size,
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Main projectile */}
      {phase === 'firing' && (
        <ProjectileWrapper
          initial={{
            left: attackerPixels.x - (18 * size),
            top: attackerPixels.y - (14 * size),
            scale: 0.3,
            opacity: 0
          }}
          animate={{
            left: targetPixels.x - (18 * size),
            top: targetPixels.y - (14 * size),
            scale: [0.3, 1.2, 1],
            opacity: 1
          }}
          transition={{
            duration: flightDuration,
            ease: [0.2, 0.8, 0.3, 1], // Custom ease for snappy launch, smooth flight
            scale: { duration: 0.15, ease: 'easeOut' }
          }}
          onUpdate={(latest) => {
            // Add trail particles during flight with varying sizes
            if (typeof latest.left === 'number' && typeof latest.top === 'number') {
              const trailSize = 0.5 + Math.random() * 0.5
              setTrails(prev => [...prev, {
                id: Date.now() + Math.random(),
                x: (latest.left as number) + (18 * size),
                y: (latest.top as number) + (14 * size),
                size: trailSize
              }].slice(-12))
            }
          }}
          onAnimationComplete={() => {
            setPhase('impact')
            setTimeout(() => {
              setPhase('done')
              onComplete?.()
            }, 300)
          }}
        >
          {renderProjectile()}
        </ProjectileWrapper>
      )}

      {/* Impact effect */}
      <AnimatePresence>
        {phase === 'impact' && (
          <>
            {/* Main impact burst */}
            <ImpactEffect
              style={{
                left: targetPixels.x - 50,
                top: targetPixels.y - 50,
                width: 100,
                height: 100,
                background: `radial-gradient(circle, white 0%, ${projectile.color} 30%, ${projectile.color}80 60%, transparent 100%)`,
                zIndex: 150,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 1.8, 2], opacity: [1, 0.9, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Impact ring */}
            <motion.div
              style={{
                position: 'absolute',
                left: targetPixels.x - 40,
                top: targetPixels.y - 40,
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: `3px solid ${projectile.color}`,
                pointerEvents: 'none',
                zIndex: 149,
              }}
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Impact sparkles */}
            {[...Array(8)].map((_, i) => {
              const sparkAngle = (i / 8) * Math.PI * 2
              const sparkDist = 40 + Math.random() * 20
              return (
                <SparkleEffect
                  key={i}
                  $color={projectile.color}
                  style={{
                    left: targetPixels.x,
                    top: targetPixels.y,
                    zIndex: 151,
                  }}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{
                    x: Math.cos(sparkAngle) * sparkDist,
                    y: Math.sin(sparkAngle) * sparkDist,
                    scale: 0,
                    opacity: 0
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              )
            })}
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export const AttackProjectileRenderer: React.FC<AttackProjectileConfig> = (props) => {
  return (
    <AnimatePresence>
      <AttackProjectileAnimation {...props} />
    </AnimatePresence>
  )
}

export default AttackProjectileRenderer
