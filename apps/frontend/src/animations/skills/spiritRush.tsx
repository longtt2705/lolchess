import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion, animate } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

const DashTrail = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 95;
`

const TrailOrb = styled(motion.div)`
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 182, 193, 1) 0%, rgba(255, 105, 180, 0.8) 50%, rgba(199, 21, 133, 0.6) 100%);
  box-shadow: 
    0 0 15px rgba(255, 105, 180, 0.9),
    0 0 30px rgba(255, 105, 180, 0.6),
    inset 0 0 10px rgba(255, 255, 255, 0.5);
  filter: blur(1px);
`

const MagicAura = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 182, 193, 0.6) 0%, rgba(255, 105, 180, 0.4) 50%, transparent 100%);
  pointer-events: none;
  z-index: 98;
  box-shadow: 0 0 40px rgba(255, 105, 180, 0.8);
`

const ImpactWave = styled(motion.div)`
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid rgba(255, 105, 180, 0.8);
  background: radial-gradient(circle, rgba(255, 182, 193, 0.4) 0%, transparent 70%);
  pointer-events: none;
  z-index: 97;
  box-shadow: 
    0 0 30px rgba(255, 105, 180, 0.8),
    inset 0 0 20px rgba(255, 182, 193, 0.5);
`

/**
 * Ahri's Spirit Rush animation
 * Shows Ahri dashing to the target location with magical orbs trailing behind
 * and an impact effect that damages nearby enemies
 */
const SpiritRushAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    casterId,
    boardRef,
    isRedPlayer = false
}) => {
    const [showImpact, setShowImpact] = useState(false)
    const [showParticles, setShowParticles] = useState(false)

    if (!targetPosition) {
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

    // Calculate angle and distance for the dash
    const deltaX = targetPixels.x - casterPixels.x
    const deltaY = targetPixels.y - casterPixels.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Generate trail orb positions along the path
    const numOrbs = 8
    const orbPositions = Array.from({ length: numOrbs }, (_, i) => {
        const progress = i / (numOrbs - 1)
        return {
            x: casterPixels.x + deltaX * progress,
            y: casterPixels.y + deltaY * progress,
            delay: progress * 0.3 // Stagger the orb appearances
        }
    })

    // Animate Ahri (the caster) dashing to the target position
    useEffect(() => {
        if (casterId) {

            // Find Ahri's piece element by ID
            const pieceElement = document.querySelector(`[data-piece-id="${casterId}"]`)


            if (pieceElement && pieceElement instanceof HTMLElement) {
                // Calculate the dash offset
                const dashOffsetX = targetPixels.x - casterPixels.x
                const dashOffsetY = targetPixels.y - casterPixels.y

                // Animate Ahri dashing
                const controls = animate(
                    pieceElement,
                    {
                        x: [0, dashOffsetX],
                        y: [0, dashOffsetY],
                        scale: [1, 1.15, 1.05, 1]
                    },
                    {
                        duration: 0.5,
                        ease: [0.4, 0, 0.2, 1] // Custom easing for dash feel
                    }
                )

                // Show impact effects when dash completes
                controls.then(() => {
                    setShowImpact(true)
                    setShowParticles(true)

                    // Clean up effects after duration
                    setTimeout(() => {
                        setShowImpact(false)
                        setShowParticles(false)
                    }, 600)
                })

                // Cleanup: stop animation if component unmounts early
                return () => {
                    controls.stop()
                    // Let React handle the re-render after state swap
                    // Don't manually clear transforms - causes positioning issues
                }
            } else {
            }
        }
    }, [casterId, targetPixels.x, targetPixels.y, casterPixels.x, casterPixels.y])

    return (
        <>
            {/* Magical aura at the starting position */}
            <MagicAura
                style={{
                    left: casterPixels.x - 40,
                    top: casterPixels.y - 40
                }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: [0, 1.2, 0], opacity: [0.8, 0.5, 0] }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Trail of magical orbs following the dash path */}
            <DashTrail>
                {orbPositions.map((pos, i) => (
                    <TrailOrb
                        key={i}
                        style={{
                            left: pos.x - 8,
                            top: pos.y - 8
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1.2, 0.8, 0],
                            opacity: [0, 1, 0.8, 0]
                        }}
                        transition={{
                            duration: 0.8,
                            delay: pos.delay,
                            ease: 'easeOut'
                        }}
                    />
                ))}
            </DashTrail>

            {/* Magical aura at the destination (appears when dash completes) */}
            {showImpact && (
                <MagicAura
                    style={{
                        left: targetPixels.x - 40,
                        top: targetPixels.y - 40
                    }}
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: [0, 1.5, 1], opacity: [0.8, 0.6, 0] }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            )}

            {/* Impact wave at destination */}
            {showImpact && (
                <ImpactWave
                    style={{
                        left: targetPixels.x - 50,
                        top: targetPixels.y - 50
                    }}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: [0, 1.8, 2], opacity: [1, 0.6, 0] }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    onAnimationComplete={() => {
                        setShowImpact(false)
                    }}
                />
            )}

            {/* Particle explosion at destination */}
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

export const spiritRushRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <SpiritRushAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1200 // 500ms dash + 600ms impact effects + 100ms buffer
}

