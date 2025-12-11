import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

// Styled components for Sion's Soul Furnace

const SoulParticle = styled(motion.div)`
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220, 20, 60, 1) 0%, rgba(139, 0, 0, 0.8) 50%, rgba(100, 0, 0, 0.6) 100%);
  box-shadow: 
    0 0 15px rgba(220, 20, 60, 0.9),
    0 0 25px rgba(220, 20, 60, 0.6),
    inset 0 0 8px rgba(255, 100, 100, 0.5);
  pointer-events: none;
  z-index: 100;
`

const DrainBeam = styled(motion.div)`
  position: absolute;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(220, 20, 60, 0.6) 20%, 
    rgba(139, 0, 0, 0.8) 50%, 
    rgba(220, 20, 60, 0.6) 80%, 
    transparent 100%
  );
  transform-origin: left center;
  pointer-events: none;
  z-index: 99;
  box-shadow: 0 0 8px rgba(220, 20, 60, 0.7);
`

const ConvergencePulse = styled(motion.div)`
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220, 20, 60, 0.8) 0%, rgba(139, 0, 0, 0.5) 50%, transparent 100%);
  pointer-events: none;
  z-index: 98;
  box-shadow: 
    0 0 30px rgba(220, 20, 60, 0.9),
    inset 0 0 20px rgba(255, 50, 50, 0.4);
`

const ShieldAura = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(220, 20, 60, 0.9);
  background: radial-gradient(circle, 
    rgba(200, 50, 50, 0.3) 0%, 
    rgba(220, 20, 60, 0.2) 40%, 
    transparent 70%
  );
  pointer-events: none;
  z-index: 97;
  box-shadow: 
    0 0 25px rgba(220, 20, 60, 0.8),
    inset 0 0 20px rgba(255, 80, 80, 0.4),
    0 0 40px rgba(139, 0, 0, 0.6);
`

const ShieldWave = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(220, 20, 60, 0.7);
  background: transparent;
  pointer-events: none;
  z-index: 96;
  box-shadow: 0 0 15px rgba(220, 20, 60, 0.6);
`

/**
 * Sion's Soul Furnace animation
 * Shows soul particles draining from all adjacent enemy positions toward Sion,
 * converging at his location, then forming a protective crimson shield
 */
const SoulFurnaceAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    casterId,
    boardRef,
    isRedPlayer = false
}) => {
    const [showConvergence, setShowConvergence] = useState(false)
    const [showShield, setShowShield] = useState(false)

    console.log('[SoulFurnace] Animation component rendered with:', { casterPosition, casterId })

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)

    // Calculate all 8 adjacent square positions
    const adjacentOffsets = [
        { x: -1, y: -1 }, // Northwest
        { x: 0, y: -1 },  // North
        { x: 1, y: -1 },  // Northeast
        { x: 1, y: 0 },   // East
        { x: 1, y: 1 },   // Southeast
        { x: 0, y: 1 },   // South
        { x: -1, y: 1 },  // Southwest
        { x: -1, y: 0 }   // West
    ]

    const adjacentPositions = adjacentOffsets.map(offset => ({
        x: casterPosition.x + offset.x,
        y: casterPosition.y + offset.y
    }))

    const adjacentPixels = adjacentPositions.map(pos =>
        getPixelPosition(pos, boardRef, isRedPlayer)
    )

    // Create multiple particles per adjacent position for richer effect
    const particlesPerPosition = 3
    const allParticles = adjacentPixels.flatMap((pixels, posIndex) =>
        Array.from({ length: particlesPerPosition }, (_, particleIndex) => {
            const angle = (particleIndex / particlesPerPosition) * Math.PI * 2
            const offset = 8
            return {
                startX: pixels.x + Math.cos(angle) * offset,
                startY: pixels.y + Math.sin(angle) * offset,
                endX: casterPixels.x,
                endY: casterPixels.y,
                delay: posIndex * 0.05 + particleIndex * 0.02, // Stagger particles
                positionIndex: posIndex
            }
        })
    )

    // Trigger convergence pulse when particles arrive
    useEffect(() => {
        const timer = setTimeout(() => {
            console.log('[SoulFurnace] Showing convergence pulse')
            setShowConvergence(true)

            // Show shield after convergence
            setTimeout(() => {
                console.log('[SoulFurnace] Showing shield')
                setShowShield(true)
            }, 200)
        }, 800) // After drain phase completes

        return () => clearTimeout(timer)
    }, [])

    console.log('[SoulFurnace] Render state:', { showConvergence, showShield })
    console.log('[SoulFurnace] Caster position pixels:', casterPixels)
    console.log('[SoulFurnace] Number of particles:', allParticles.length)

    return (
        <>
            {/* Drain beams from adjacent positions to Sion */}
            {adjacentPixels.map((pixels, index) => {
                const deltaX = casterPixels.x - pixels.x
                const deltaY = casterPixels.y - pixels.y
                const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

                return (
                    <DrainBeam
                        key={`beam-${index}`}
                        style={{
                            left: pixels.x,
                            top: pixels.y,
                            rotate: angle,
                            width: distance
                        }}
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{
                            opacity: [0, 0.8, 0.6, 0],
                            scaleX: [0, 1, 1, 0.5]
                        }}
                        transition={{
                            duration: 0.8,
                            delay: index * 0.05,
                            ease: 'easeInOut'
                        }}
                    />
                )
            })}

            {/* Soul particles traveling from adjacent positions to Sion */}
            {allParticles.map((particle, index) => (
                <SoulParticle
                    key={`particle-${index}`}
                    initial={{
                        x: particle.startX - 6,
                        y: particle.startY - 6,
                        scale: 0,
                        opacity: 0
                    }}
                    animate={{
                        x: particle.endX - 6,
                        y: particle.endY - 6,
                        scale: [0, 1.2, 1, 0.8],
                        opacity: [0, 1, 1, 0]
                    }}
                    transition={{
                        duration: 0.7,
                        delay: particle.delay,
                        ease: [0.4, 0, 0.2, 1]
                    }}
                />
            ))}

            {/* Convergence pulse at Sion's position */}
            {showConvergence && (
                <ConvergencePulse
                    style={{
                        left: casterPixels.x - 30,
                        top: casterPixels.y - 30
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.5, 1, 1.2, 0],
                        opacity: [0, 0.9, 0.7, 0.5, 0]
                    }}
                    transition={{
                        duration: 0.6,
                        ease: 'easeOut'
                    }}
                />
            )}

            {/* Shield aura around Sion */}
            {showShield && (
                <ShieldAura
                    style={{
                        left: casterPixels.x - 50,
                        top: casterPixels.y - 50,
                        width: 100,
                        height: 100
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.3, 1],
                        opacity: [0, 0.9, 0.7]
                    }}
                    transition={{
                        duration: 0.4,
                        ease: 'easeOut'
                    }}
                />
            )}

            {/* Expanding shield waves */}
            {showShield && [0, 1, 2].map((waveIndex) => (
                <ShieldWave
                    key={`wave-${waveIndex}`}
                    style={{
                        left: casterPixels.x - 50,
                        top: casterPixels.y - 50,
                        width: 100,
                        height: 100
                    }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                        scale: [0.8, 2.5],
                        opacity: [0.8, 0]
                    }}
                    transition={{
                        duration: 1,
                        delay: waveIndex * 0.15,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Particle burst when shield forms */}
            {showConvergence && (
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
                        position={casterPixels}
                        count={12}
                        duration={500}
                    />
                </motion.div>
            )}
        </>
    )
}

export const soulFurnaceRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <SoulFurnaceAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1400 // 800ms drain + 200ms convergence + 400ms shield formation
}









