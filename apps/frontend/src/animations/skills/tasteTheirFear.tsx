import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ImpactEffect,
    ParticleEffectComponent
} from '../types'

const LeapingIcon = styled(motion.div)`
  position: absolute;
  width: 32px;
  height: 32px;
  pointer-events: none;
  z-index: 100;
  font-size: 32px;
  filter: drop-shadow(0 0 12px rgba(147, 51, 234, 0.9));
`

const ClawSlash = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 10px;
  background: linear-gradient(90deg, transparent 0%, rgba(147, 51, 234, 1) 20%, rgba(147, 51, 234, 1) 80%, transparent 100%);
  pointer-events: none;
  z-index: 150;
  border-radius: 5px;
  box-shadow: 
    0 0 15px rgba(147, 51, 234, 1),
    0 0 30px rgba(147, 51, 234, 0.6),
    inset 0 0 10px rgba(255, 255, 255, 0.5);
  transform-origin: center center;
`

const PredatorAura = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(147, 51, 234, 0.5) 0%, rgba(15, 32, 39, 0.4) 50%, transparent 100%);
  pointer-events: none;
  z-index: 98;
  box-shadow: 0 0 30px rgba(147, 51, 234, 0.6);
`

/**
 * Kha'Zix's Taste Their Fear animation
 * Shows Kha'Zix leaping to the target with claw slash effects and predator-themed particles
 */
const TasteTheirFearAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    boardRef,
    isRedPlayer = false
}) => {
    const [showSlashes, setShowSlashes] = useState(false)
    const [showImpact, setShowImpact] = useState(false)
    const [showParticles, setShowParticles] = useState(false)

    if (!targetPosition) {
        console.warn('[TasteTheirFear] Missing targetPosition')
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

    // Calculate angle and midpoint for the leap arc
    const deltaX = targetPixels.x - casterPixels.x
    const deltaY = targetPixels.y - casterPixels.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Define claw slash angles for X pattern
    const slashAngles = [45, -45]

    return (
        <>
            {/* Predator aura at starting position */}
            <PredatorAura
                style={{
                    left: casterPixels.x - 40,
                    top: casterPixels.y - 40
                }}
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: [0, 1.3, 0], opacity: [0.6, 0.4, 0] }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Leaping Kha'Zix icon - travels from caster to target with arc */}
            <LeapingIcon
                initial={{
                    x: casterPixels.x - 16,
                    y: casterPixels.y - 16,
                    scale: 0.8,
                    rotate: 0
                }}
                animate={{
                    x: targetPixels.x - 16,
                    y: targetPixels.y - 16,
                    scale: [0.8, 1.3, 1.1],
                    rotate: [0, 180, 360]
                }}
                transition={{
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1], // Custom easing for leap feel
                    y: {
                        // Add a bounce/arc to the leap
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1]
                    }
                }}
                onAnimationComplete={() => {
                    // When leap completes, show slashes and impact
                    setShowSlashes(true)
                    setShowImpact(true)
                    setShowParticles(true)

                    // Clean up effects after duration
                    setTimeout(() => {
                        setShowSlashes(false)
                        setShowParticles(false)
                    }, 800)
                }}
            >
                🦗
            </LeapingIcon>

            {/* Claw slash marks - appear when Kha'Zix lands */}
            {showSlashes && slashAngles.map((angle, i) => (
                <ClawSlash
                    key={i}
                    style={{
                        left: targetPixels.x - 40,
                        top: targetPixels.y - 5,
                        rotate: angle
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{
                        scaleX: [0, 1.8, 1.5],
                        opacity: [0, 1, 1, 0.6, 0]
                    }}
                    transition={{
                        duration: 0.7,
                        delay: i * 0.08, // Stagger the slashes slightly
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Impact effect at target */}
            {showImpact && (
                <ImpactEffect
                    style={{
                        left: targetPixels.x - 40,
                        top: targetPixels.y - 40,
                        zIndex: 150,
                        pointerEvents: 'none'
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.8, 0],
                        opacity: [1, 0.6, 0]
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    onAnimationComplete={() => {
                        setShowImpact(false)
                    }}
                />
            )}

            {/* Predator aura at target (when impact happens) */}
            {showImpact && (
                <PredatorAura
                    style={{
                        left: targetPixels.x - 40,
                        top: targetPixels.y - 40
                    }}
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: [0, 1.5, 1.2], opacity: [0.8, 0.5, 0] }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
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
                        count={14}
                        duration={500}
                    />
                </motion.div>
            )}
        </>
    )
}

export const tasteTheirFearRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <TasteTheirFearAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1300 // 400ms leap + 700ms slashes/impact + 200ms buffer
}

