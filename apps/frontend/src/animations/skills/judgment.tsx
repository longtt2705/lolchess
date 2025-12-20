import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

// Golden/yellow color scheme for Garen's Judgment
const GOLD_PRIMARY = '#FFD700'
const GOLD_SECONDARY = '#DAA520'
const GOLD_DARK = '#B8860B'

// Spinning sword arc/trail
const SpinArc = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 100;
`

// Ground impact circle beneath Garen
const GroundCircle = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(255, 215, 0, 0.3) 0%, 
    rgba(218, 165, 32, 0.2) 40%, 
    transparent 70%
  );
  pointer-events: none;
  z-index: 95;
  box-shadow: 
    0 0 30px rgba(255, 215, 0, 0.5),
    inset 0 0 20px rgba(255, 215, 0, 0.3);
`

// Expanding wave effect
const SpinWave = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(255, 215, 0, 0.8);
  background: transparent;
  pointer-events: none;
  z-index: 96;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
`

// Sword slash trail
const SlashTrail = styled(motion.div)`
  position: absolute;
  height: 6px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 215, 0, 0.9) 30%, 
    rgba(255, 255, 255, 1) 50%,
    rgba(255, 215, 0, 0.9) 70%, 
    transparent 100%
  );
  border-radius: 3px;
  transform-origin: center center;
  pointer-events: none;
  z-index: 101;
  box-shadow: 
    0 0 10px rgba(255, 215, 0, 0.9),
    0 0 20px rgba(255, 215, 0, 0.6);
`

// Central spinning core/aura
const SpinCore = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(255, 255, 255, 0.9) 0%, 
    rgba(255, 215, 0, 0.8) 30%, 
    rgba(218, 165, 32, 0.5) 60%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 99;
  box-shadow: 
    0 0 40px rgba(255, 215, 0, 0.9),
    0 0 60px rgba(255, 215, 0, 0.6),
    inset 0 0 20px rgba(255, 255, 255, 0.5);
`

// Sword icon representation
const SwordElement = styled(motion.div)`
  position: absolute;
  width: 50px;
  height: 8px;
  background: linear-gradient(90deg, 
    rgba(200, 200, 220, 0.9) 0%, 
    rgba(255, 255, 255, 1) 40%,
    rgba(255, 215, 0, 0.9) 80%, 
    rgba(184, 134, 11, 0.8) 100%
  );
  border-radius: 2px;
  transform-origin: left center;
  pointer-events: none;
  z-index: 102;
  box-shadow: 
    0 0 8px rgba(255, 215, 0, 0.8),
    0 0 15px rgba(255, 255, 255, 0.5);
`

// Golden particle for the spin effect
const GoldParticle = styled(motion.div)`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 215, 0, 1) 50%, rgba(218, 165, 32, 0.8) 100%);
  box-shadow: 
    0 0 10px rgba(255, 215, 0, 0.9),
    0 0 20px rgba(255, 215, 0, 0.6);
  pointer-events: none;
  z-index: 103;
`

/**
 * Garen's Judgment animation
 * Shows a dramatic spinning sword effect with golden trails and impact waves
 */
const JudgmentAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    casterId,
    boardRef,
    isRedPlayer = false
}) => {
    const [showWaves, setShowWaves] = useState(false)

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)

    // Create multiple sword blades for the spin effect
    const swordCount = 3
    const swords = Array.from({ length: swordCount }, (_, i) => ({
        id: i,
        startAngle: (i / swordCount) * 360,
    }))

    // Create particles that fly outward during spin
    const particleCount = 16
    const particles = Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * Math.PI * 2
        const distance = 60 + Math.random() * 20
        return {
            id: i,
            angle,
            endX: Math.cos(angle) * distance,
            endY: Math.sin(angle) * distance,
            delay: i * 0.03,
        }
    })

    // Show impact waves after initial spin starts
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWaves(true)
        }, 200)

        return () => clearTimeout(timer)
    }, [])

    return (
        <>
            {/* Ground impact circle */}
            <GroundCircle
                style={{
                    left: casterPixels.x - 70,
                    top: casterPixels.y - 70,
                    width: 140,
                    height: 140
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                    scale: [0, 1.2, 1],
                    opacity: [0, 0.8, 0.6]
                }}
                transition={{ 
                    duration: 0.4,
                    ease: 'easeOut'
                }}
            />

            {/* Central spinning core/aura */}
            <SpinCore
                style={{
                    left: casterPixels.x - 35,
                    top: casterPixels.y - 35,
                    width: 70,
                    height: 70
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                    scale: [0, 1.3, 1, 1.1, 1],
                    opacity: [0, 1, 0.9, 0.95, 0.8]
                }}
                transition={{ 
                    duration: 0.5,
                    ease: 'easeOut'
                }}
            />

            {/* Spinning swords */}
            {swords.map((sword) => (
                <SwordElement
                    key={`sword-${sword.id}`}
                    style={{
                        left: casterPixels.x,
                        top: casterPixels.y - 4,
                    }}
                    initial={{ 
                        rotate: sword.startAngle,
                        opacity: 0,
                        scale: 0.5
                    }}
                    animate={{ 
                        rotate: [sword.startAngle, sword.startAngle + 720],
                        opacity: [0, 1, 1, 0.8],
                        scale: [0.5, 1, 1, 0.9]
                    }}
                    transition={{ 
                        duration: 1.0,
                        ease: 'linear'
                    }}
                />
            ))}

            {/* Sword slash trails (concentric arcs) */}
            {[40, 55, 70].map((radius, ringIndex) => (
                Array.from({ length: 4 }, (_, i) => {
                    const startAngle = (i / 4) * 360 + ringIndex * 30
                    return (
                        <SlashTrail
                            key={`trail-${ringIndex}-${i}`}
                            style={{
                                left: casterPixels.x - radius,
                                top: casterPixels.y - 3,
                                width: radius * 2,
                            }}
                            initial={{ 
                                rotate: startAngle,
                                opacity: 0,
                                scaleX: 0.3
                            }}
                            animate={{ 
                                rotate: [startAngle, startAngle + 540 + ringIndex * 60],
                                opacity: [0, 0.9, 0.7, 0],
                                scaleX: [0.3, 1, 0.8, 0.5]
                            }}
                            transition={{ 
                                duration: 0.9,
                                delay: ringIndex * 0.08,
                                ease: 'easeInOut'
                            }}
                        />
                    )
                })
            ))}

            {/* Golden particles flying outward */}
            {particles.map((particle) => (
                <GoldParticle
                    key={`particle-${particle.id}`}
                    initial={{
                        x: casterPixels.x - 4,
                        y: casterPixels.y - 4,
                        scale: 0,
                        opacity: 0
                    }}
                    animate={{
                        x: casterPixels.x - 4 + particle.endX,
                        y: casterPixels.y - 4 + particle.endY,
                        scale: [0, 1.5, 1, 0],
                        opacity: [0, 1, 0.8, 0]
                    }}
                    transition={{
                        duration: 0.7,
                        delay: 0.2 + particle.delay,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Expanding wave effects */}
            {showWaves && [0, 1, 2].map((waveIndex) => (
                <SpinWave
                    key={`wave-${waveIndex}`}
                    style={{
                        left: casterPixels.x - 50,
                        top: casterPixels.y - 50,
                        width: 100,
                        height: 100
                    }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                        scale: [0.5, 2.0],
                        opacity: [0.9, 0]
                    }}
                    transition={{
                        duration: 0.6,
                        delay: waveIndex * 0.15,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Final burst particle effect */}
            {showWaves && (
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
                        duration={400}
                    />
                </motion.div>
            )}
        </>
    )
}

export const judgmentRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <JudgmentAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1200 // 1.2 seconds for the dramatic spin effect
}

