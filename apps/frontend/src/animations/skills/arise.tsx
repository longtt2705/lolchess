import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled, { keyframes } from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

// Sand swirl animation
const sandSwirl = keyframes`
  0% { transform: rotate(0deg) translateX(50px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
`

const sandFall = keyframes`
  0% { transform: translateY(-20px); opacity: 1; }
  100% { transform: translateY(30px); opacity: 0; }
`

// Sand particle swirling around target
const SandParticle = styled(motion.div)<{ $delay: number }>`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, #FFD700 0%, #DAA520 50%, #B8860B 100%);
  box-shadow: 0 0 8px #DAA520, 0 0 16px #FFD70080;
  pointer-events: none;
  z-index: 100;
  animation: ${sandSwirl} 1s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
`

// Falling sand grain
const SandGrain = styled(motion.div)`
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD700, #DAA520);
  box-shadow: 0 0 4px #DAA520;
  pointer-events: none;
  z-index: 99;
`

// Transformation burst
const TransformationBurst = styled(motion.div)`
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.9) 0%, rgba(218, 165, 32, 0.6) 40%, transparent 70%);
  pointer-events: none;
  z-index: 150;
  box-shadow: 
    0 0 40px rgba(255, 215, 0, 0.8),
    0 0 80px rgba(218, 165, 32, 0.5),
    inset 0 0 30px rgba(255, 255, 255, 0.4);
`

// Golden aura around the transforming minion
const GoldenAura = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.5) 0%, rgba(218, 165, 32, 0.3) 50%, transparent 100%);
  pointer-events: none;
  z-index: 98;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
`

// Expanding ring effect
const RingEffect = styled(motion.div)`
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid rgba(218, 165, 32, 0.8);
  background: transparent;
  pointer-events: none;
  z-index: 97;
  box-shadow: 0 0 20px rgba(218, 165, 32, 0.6);
`

// Sand Soldier silhouette emerging
const SoldierSilhouette = styled(motion.div)`
  position: absolute;
  width: 40px;
  height: 60px;
  background: linear-gradient(
    180deg, 
    rgba(255, 215, 0, 0.9) 0%,
    rgba(218, 165, 32, 0.8) 50%,
    rgba(184, 134, 11, 0.7) 100%
  );
  clip-path: polygon(
    50% 0%, 
    65% 20%, 
    80% 20%, 
    70% 40%, 
    85% 45%, 
    65% 55%, 
    75% 100%, 
    50% 85%, 
    25% 100%, 
    35% 55%, 
    15% 45%, 
    30% 40%, 
    20% 20%, 
    35% 20%
  );
  pointer-events: none;
  z-index: 151;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
`

// Spear emerging effect
const SpearEmerg = styled(motion.div)`
  position: absolute;
  width: 60px;
  height: 6px;
  background: linear-gradient(90deg, #B8860B, #DAA520, #FFD700, #DAA520, #B8860B);
  border-radius: 2px;
  pointer-events: none;
  z-index: 152;
  box-shadow: 0 0 10px rgba(218, 165, 32, 0.8);
  
  &::after {
    content: '';
    position: absolute;
    right: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid #FFD700;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
  }
`

/**
 * Azir's Arise animation
 * Shows a minion being transformed into a Sand Soldier with swirling sand particles,
 * a golden transformation burst, and a Sand Soldier emerging
 */
const AriseAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    boardRef,
    isRedPlayer = false
}) => {
    const [phase, setPhase] = useState<'swirl' | 'burst' | 'emerge' | 'done'>('swirl')
    const [showParticles, setShowParticles] = useState(false)

    // Target position is where the minion is being promoted
    const transformPosition = targetPosition || casterPosition
    const targetPixels = getPixelPosition(transformPosition, boardRef, isRedPlayer)
    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)

    // Generate swirling sand particle positions
    const numParticles = 12
    const sandParticles = Array.from({ length: numParticles }, (_, i) => ({
        id: i,
        angle: (i / numParticles) * 360,
        delay: i * 0.08
    }))

    // Generate falling sand grains
    const numGrains = 20
    const sandGrains = Array.from({ length: numGrains }, (_, i) => ({
        id: i,
        offsetX: (Math.random() - 0.5) * 80,
        offsetY: (Math.random() - 0.5) * 40,
        delay: Math.random() * 0.4
    }))

    // Phase transitions
    useEffect(() => {
        const timers: NodeJS.Timeout[] = []

        // Start burst phase after swirl
        timers.push(setTimeout(() => {
            setPhase('burst')
            setShowParticles(true)
        }, 500))

        // Start emerge phase after burst
        timers.push(setTimeout(() => {
            setPhase('emerge')
        }, 700))

        // End animation
        timers.push(setTimeout(() => {
            setPhase('done')
            setShowParticles(false)
        }, 1100))

        return () => timers.forEach(t => clearTimeout(t))
    }, [])

    return (
        <>
            {/* Connection line from Azir to target (golden energy beam) */}
            {phase === 'swirl' && (
                <motion.div
                    style={{
                        position: 'absolute',
                        left: casterPixels.x,
                        top: casterPixels.y,
                        width: Math.sqrt(
                            Math.pow(targetPixels.x - casterPixels.x, 2) +
                            Math.pow(targetPixels.y - casterPixels.y, 2)
                        ),
                        height: 4,
                        background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.8), rgba(218, 165, 32, 0.6), rgba(255, 215, 0, 0.4))',
                        transformOrigin: '0 50%',
                        transform: `rotate(${Math.atan2(
                            targetPixels.y - casterPixels.y,
                            targetPixels.x - casterPixels.x
                        ) * (180 / Math.PI)}deg)`,
                        borderRadius: 2,
                        pointerEvents: 'none',
                        zIndex: 96,
                        boxShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            )}

            {/* Swirling sand particles around target */}
            {phase === 'swirl' && sandParticles.map(particle => (
                <SandParticle
                    key={particle.id}
                    $delay={particle.delay}
                    style={{
                        left: targetPixels.x - 4,
                        top: targetPixels.y - 4,
                        transformOrigin: 'center center',
                    }}
                    initial={{ 
                        opacity: 0, 
                        scale: 0,
                        rotate: particle.angle
                    }}
                    animate={{ 
                        opacity: [0, 1, 1, 0.8],
                        scale: [0, 1, 1.2, 1],
                        rotate: [particle.angle, particle.angle + 360]
                    }}
                    transition={{ 
                        duration: 0.5,
                        delay: particle.delay,
                        ease: 'easeInOut'
                    }}
                />
            ))}

            {/* Falling sand grains during transformation */}
            {(phase === 'swirl' || phase === 'burst') && sandGrains.map(grain => (
                <SandGrain
                    key={grain.id}
                    style={{
                        left: targetPixels.x + grain.offsetX,
                        top: targetPixels.y + grain.offsetY - 30,
                    }}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ 
                        opacity: [0, 1, 1, 0],
                        y: [-20, 0, 20, 40]
                    }}
                    transition={{ 
                        duration: 0.6,
                        delay: grain.delay,
                        ease: 'easeIn'
                    }}
                />
            ))}

            {/* Golden aura building up */}
            <GoldenAura
                style={{
                    left: targetPixels.x - 40,
                    top: targetPixels.y - 40
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                    scale: phase === 'swirl' ? [0, 1, 1.2] : phase === 'burst' ? [1.2, 1.5] : [1.5, 0],
                    opacity: phase === 'done' ? 0 : [0, 0.6, 0.8]
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Transformation burst */}
            {phase === 'burst' && (
                <TransformationBurst
                    style={{
                        left: targetPixels.x - 50,
                        top: targetPixels.y - 50
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.5, 2], opacity: [0, 1, 0] }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                />
            )}

            {/* Expanding rings */}
            {phase === 'burst' && [0, 1, 2].map(i => (
                <RingEffect
                    key={i}
                    style={{
                        left: targetPixels.x - 60,
                        top: targetPixels.y - 60
                    }}
                    initial={{ scale: 0.3, opacity: 1 }}
                    animate={{ scale: [0.3, 1.5, 2], opacity: [1, 0.6, 0] }}
                    transition={{ 
                        duration: 0.5,
                        delay: i * 0.1,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Sand Soldier silhouette emerging */}
            {phase === 'emerge' && (
                <SoldierSilhouette
                    style={{
                        left: targetPixels.x - 20,
                        top: targetPixels.y - 40
                    }}
                    initial={{ scale: 0, opacity: 0, y: 20 }}
                    animate={{ 
                        scale: [0, 1.3, 1],
                        opacity: [0, 1, 0.8, 0],
                        y: [20, -5, 0]
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                />
            )}

            {/* Spear emerging */}
            {phase === 'emerge' && (
                <SpearEmerg
                    style={{
                        left: targetPixels.x - 30,
                        top: targetPixels.y
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ 
                        scaleX: [0, 1.2, 1],
                        opacity: [0, 1, 0.8, 0]
                    }}
                    transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
                />
            )}

            {/* Particle explosion at target */}
            {showParticles && (
                <motion.div
                    style={{
                        position: 'absolute',
                        zIndex: 150,
                        pointerEvents: 'none',
                        left: 0,
                        top: 0
                    }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                >
                    <ParticleEffectComponent
                        position={targetPixels}
                        count={16}
                        duration={500}
                    />
                </motion.div>
            )}
        </>
    )
}

export const ariseRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <AriseAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1200 // 500ms swirl + 400ms burst/emerge + 300ms buffer
}

