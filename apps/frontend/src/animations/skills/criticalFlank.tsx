import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
} from '../types'

// Diagonal slash effect
const SlashEffect = styled(motion.div)`
  position: absolute;
  width: 100px;
  height: 8px;
  background: linear-gradient(90deg, transparent 0%, rgba(220, 38, 38, 1) 20%, rgba(255, 255, 255, 1) 50%, rgba(220, 38, 38, 1) 80%, transparent 100%);
  pointer-events: none;
  z-index: 150;
  border-radius: 4px;
  box-shadow: 
    0 0 20px rgba(220, 38, 38, 1),
    0 0 40px rgba(220, 38, 38, 0.7),
    inset 0 0 10px rgba(255, 255, 255, 0.5);
  transform-origin: center center;
`

// Secondary slash for X pattern
const SecondSlash = styled(motion.div)`
  position: absolute;
  width: 100px;
  height: 8px;
  background: linear-gradient(90deg, transparent 0%, rgba(185, 28, 28, 1) 20%, rgba(255, 200, 200, 1) 50%, rgba(185, 28, 28, 1) 80%, transparent 100%);
  pointer-events: none;
  z-index: 149;
  border-radius: 4px;
  box-shadow: 
    0 0 15px rgba(185, 28, 28, 1),
    0 0 30px rgba(185, 28, 28, 0.6);
  transform-origin: center center;
`

// Execution skull icon
const ExecutionIcon = styled(motion.div)`
  position: absolute;
  width: 50px;
  height: 50px;
  pointer-events: none;
  z-index: 160;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 15px rgba(220, 38, 38, 1));
`

// Dark aura at target position
const DeathAura = styled(motion.div)`
  position: absolute;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(55, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.5) 50%, transparent 100%);
  pointer-events: none;
  z-index: 140;
  box-shadow: 0 0 40px rgba(139, 0, 0, 0.9);
`

// Impact ring
const ImpactRing = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid rgba(220, 38, 38, 0.9);
  background: radial-gradient(circle, rgba(220, 38, 38, 0.4) 0%, transparent 70%);
  pointer-events: none;
  z-index: 155;
  box-shadow: 
    0 0 30px rgba(220, 38, 38, 0.8),
    inset 0 0 20px rgba(220, 38, 38, 0.5);
`

// Blood/death particle
const DeathParticle = styled(motion.div)`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220, 38, 38, 1) 0%, rgba(139, 0, 0, 0.8) 100%);
  box-shadow: 0 0 12px rgba(220, 38, 38, 0.9);
  pointer-events: none;
  z-index: 145;
`

// Attacker dash effect (motion blur trail)
const DashTrail = styled(motion.div)`
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200, 155, 60, 0.6) 0%, rgba(200, 155, 60, 0.2) 50%, transparent 100%);
  pointer-events: none;
  z-index: 135;
`

// Attacker icon for the dash animation
const AttackerIcon = styled(motion.div)`
  position: absolute;
  width: 36px;
  height: 36px;
  pointer-events: none;
  z-index: 165;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 10px rgba(200, 155, 60, 0.9));
`

/**
 * The Critical Flank animation
 * Shows a diagonal execution attack where a minion instantly kills another minion
 * and advances into their position
 * 
 * Animation sequence:
 * 1. Attacker lunges diagonally with slash effect
 * 2. Dramatic X-slash execution at target
 * 3. Skull/death effect with blood particles
 * 4. Attacker slides into the vacated position
 */
const CriticalFlankAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    criticalFlankAdvancePosition,
    boardRef,
    isRedPlayer = false
}) => {
    const [showSlash, setShowSlash] = useState(false)
    const [showExecution, setShowExecution] = useState(false)
    const [showAdvance, setShowAdvance] = useState(false)

    // Use targetPosition as the advance position if criticalFlankAdvancePosition is not provided
    const advancePosition = criticalFlankAdvancePosition || targetPosition

    if (!targetPosition || !advancePosition) {
        console.warn('[CriticalFlank] Missing targetPosition or advancePosition')
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)
    const advancePixels = getPixelPosition(advancePosition, boardRef, isRedPlayer)

    // Calculate attack angle for slash direction
    const deltaX = targetPixels.x - casterPixels.x
    const deltaY = targetPixels.y - casterPixels.y
    const attackAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Generate death particles
    const particleCount = 16
    const deathParticles = Array.from({ length: particleCount }, (_, i) => {
        const particleAngle = (i / particleCount) * Math.PI * 2
        const distance = 50 + Math.random() * 30
        return {
            angle: particleAngle,
            distance,
            delay: i * 0.02,
            size: 6 + Math.random() * 6
        }
    })

    // Generate dash trail positions
    const trailCount = 4
    const dashTrails = Array.from({ length: trailCount }, (_, i) => {
        const progress = (i + 1) / (trailCount + 1)
        return {
            x: casterPixels.x + (targetPixels.x - casterPixels.x) * progress,
            y: casterPixels.y + (targetPixels.y - casterPixels.y) * progress,
            delay: i * 0.05,
            opacity: 0.3 + (i * 0.15)
        }
    })

    // Animation timing sequence
    useEffect(() => {
        // Start slash after brief charge
        const slashTimer = setTimeout(() => {
            setShowSlash(true)
        }, 100)

        // Show execution at impact
        const executionTimer = setTimeout(() => {
            setShowExecution(true)
        }, 350)

        // Start advance after execution
        const advanceTimer = setTimeout(() => {
            setShowAdvance(true)
        }, 700)

        return () => {
            clearTimeout(slashTimer)
            clearTimeout(executionTimer)
            clearTimeout(advanceTimer)
        }
    }, [])

    return (
        <>
            {/* Initial charge aura at caster */}
            <DeathAura
                style={{
                    left: casterPixels.x - 45,
                    top: casterPixels.y - 45,
                    background: 'radial-gradient(circle, rgba(200, 155, 60, 0.6) 0%, rgba(200, 155, 60, 0.2) 50%, transparent 100%)',
                    boxShadow: '0 0 30px rgba(200, 155, 60, 0.8)'
                }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: [0, 1.3, 0], opacity: [0.8, 0.5, 0] }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Dash trails from caster to target */}
            {showSlash && dashTrails.map((trail, i) => (
                <DashTrail
                    key={`trail-${i}`}
                    style={{
                        left: trail.x - 20,
                        top: trail.y - 20
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.2, 0.8],
                        opacity: [0, trail.opacity, 0]
                    }}
                    transition={{
                        duration: 0.3,
                        delay: trail.delay,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Attacker icon lunging toward target */}
            {showSlash && (
                <AttackerIcon
                    initial={{
                        x: casterPixels.x - 18,
                        y: casterPixels.y - 18,
                        scale: 1,
                        opacity: 1
                    }}
                    animate={{
                        x: targetPixels.x - 18,
                        y: targetPixels.y - 18,
                        scale: [1, 1.3, 1],
                        opacity: [1, 1, 0]
                    }}
                    transition={{
                        duration: 0.25,
                        ease: [0.4, 0, 0.2, 1]
                    }}
                >
                    ⚔️
                </AttackerIcon>
            )}

            {/* Primary diagonal slash */}
            {showSlash && (
                <SlashEffect
                    style={{
                        left: targetPixels.x - 50,
                        top: targetPixels.y - 4,
                        rotate: attackAngle
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{
                        scaleX: [0, 1.5, 1.2],
                        opacity: [0, 1, 0]
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                />
            )}

            {/* Execution effects at target */}
            {showExecution && (
                <>
                    {/* Death aura */}
                    <DeathAura
                        style={{
                            left: targetPixels.x - 45,
                            top: targetPixels.y - 45
                        }}
                        initial={{ scale: 0, opacity: 0.9 }}
                        animate={{ scale: [0, 1.5, 1.2], opacity: [0.9, 0.7, 0] }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />

                    {/* X-slash pattern - first slash */}
                    <SlashEffect
                        style={{
                            left: targetPixels.x - 50,
                            top: targetPixels.y - 4,
                            rotate: 45
                        }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{
                            scaleX: [0, 1.8, 1.5],
                            opacity: [0, 1, 0.7, 0]
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />

                    {/* X-slash pattern - second slash */}
                    <SecondSlash
                        style={{
                            left: targetPixels.x - 50,
                            top: targetPixels.y - 4,
                            rotate: -45
                        }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{
                            scaleX: [0, 1.8, 1.5],
                            opacity: [0, 1, 0.7, 0]
                        }}
                        transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
                    />

                    {/* Execution skull icon */}
                    <ExecutionIcon
                        style={{
                            left: targetPixels.x - 25,
                            top: targetPixels.y - 25
                        }}
                        initial={{ scale: 0, opacity: 0, rotate: -180 }}
                        animate={{
                            scale: [0, 1.5, 1.2, 0],
                            opacity: [0, 1, 0.9, 0],
                            rotate: [-180, 0, 0, 0]
                        }}
                        transition={{ duration: 0.8, ease: 'backOut' }}
                    >
                        💀
                    </ExecutionIcon>

                    {/* Impact rings */}
                    <ImpactRing
                        style={{
                            left: targetPixels.x - 40,
                            top: targetPixels.y - 40
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{
                            scale: [0, 1.5, 2],
                            opacity: [1, 0.6, 0]
                        }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />

                    <ImpactRing
                        style={{
                            left: targetPixels.x - 40,
                            top: targetPixels.y - 40
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{
                            scale: [0, 1.2, 1.8],
                            opacity: [1, 0.8, 0]
                        }}
                        transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
                    />

                    {/* Death particles exploding outward */}
                    {deathParticles.map((particle, i) => (
                        <DeathParticle
                            key={`death-${i}`}
                            style={{
                                left: targetPixels.x - 4,
                                top: targetPixels.y - 4,
                                width: particle.size,
                                height: particle.size
                            }}
                            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                            animate={{
                                x: Math.cos(particle.angle) * particle.distance,
                                y: Math.sin(particle.angle) * particle.distance,
                                scale: [0, 1.2, 0],
                                opacity: [1, 0.8, 0]
                            }}
                            transition={{
                                duration: 0.6,
                                delay: particle.delay,
                                ease: 'easeOut'
                            }}
                        />
                    ))}
                </>
            )}

            {/* Attacker advancing to target position */}
            {showAdvance && (
                <>
                    {/* Advance dash trail from old position */}
                    <DashTrail
                        style={{
                            left: casterPixels.x - 20,
                            top: casterPixels.y - 20
                        }}
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{
                            scale: [1, 0.5],
                            opacity: [0.6, 0]
                        }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    />

                    {/* Flash/dash effect trail between positions */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            left: Math.min(casterPixels.x, advancePixels.x),
                            top: Math.min(casterPixels.y, advancePixels.y),
                            width: Math.abs(advancePixels.x - casterPixels.x) + 40,
                            height: Math.abs(advancePixels.y - casterPixels.y) + 40,
                            background: 'linear-gradient(135deg, rgba(200, 155, 60, 0.3) 0%, transparent 100%)',
                            pointerEvents: 'none',
                            zIndex: 130,
                            filter: 'blur(10px)'
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.8, 0] }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    />

                    {/* Arrival effect at new position */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            left: advancePixels.x - 30,
                            top: advancePixels.y - 30,
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            border: '2px solid rgba(200, 155, 60, 0.8)',
                            pointerEvents: 'none',
                            zIndex: 130
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{
                            scale: [0, 1.5, 1.2],
                            opacity: [1, 0.6, 0]
                        }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    />

                    {/* Flash at arrival position */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            left: advancePixels.x - 40,
                            top: advancePixels.y - 40,
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(200, 155, 60, 0.8) 0%, transparent 70%)',
                            pointerEvents: 'none',
                            zIndex: 129
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1.3, 0],
                            opacity: [0, 0.9, 0]
                        }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                </>
            )}
        </>
    )
}

export const criticalFlankRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <CriticalFlankAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1200 // 100ms charge + 350ms slash + 350ms execution + 400ms advance
}

