import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition
} from '../types'

const HealParticle = styled(motion.div)`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 255, 127, 1) 0%, rgba(50, 205, 50, 0.8) 50%, rgba(144, 238, 144, 0.6) 100%);
  box-shadow: 
    0 0 15px rgba(0, 255, 127, 0.9),
    0 0 25px rgba(50, 205, 50, 0.6),
    inset 0 0 8px rgba(255, 255, 255, 0.5);
  pointer-events: none;
  z-index: 100;
`

const HealBeam = styled(motion.div)`
  position: absolute;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(0, 255, 127, 0.6) 20%, 
    rgba(50, 205, 50, 0.8) 50%, 
    rgba(0, 255, 127, 0.6) 80%, 
    transparent 100%
  );
  transform-origin: left center;
  pointer-events: none;
  z-index: 98;
  box-shadow: 0 0 10px rgba(0, 255, 127, 0.7);
`

const RestorationRing = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(0, 255, 127, 0.8);
  background: radial-gradient(circle, rgba(50, 205, 50, 0.3) 0%, rgba(0, 255, 127, 0.2) 40%, transparent 70%);
  pointer-events: none;
  z-index: 97;
  box-shadow: 
    0 0 25px rgba(0, 255, 127, 0.7),
    inset 0 0 20px rgba(144, 238, 144, 0.4);
`

const Sparkle = styled(motion.div)`
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 12px rgba(0, 255, 127, 0.8);
  pointer-events: none;
  z-index: 101;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
`

const HealAura = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(0, 255, 127, 0.4) 0%, 
    rgba(50, 205, 50, 0.3) 40%, 
    transparent 70%
  );
  pointer-events: none;
  z-index: 96;
  box-shadow: 
    0 0 40px rgba(0, 255, 127, 0.6),
    inset 0 0 30px rgba(144, 238, 144, 0.4);
  filter: blur(2px);
`

/**
 * Heal summoner spell animation
 * Shows green healing energy flowing between caster and ally with rising particles
 */
const HealAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    boardRef,
    isRedPlayer = false
}) => {
    const [showTargetEffects, setShowTargetEffects] = useState(false)

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = targetPosition 
        ? getPixelPosition(targetPosition, boardRef, isRedPlayer)
        : null

    // Calculate beam angle if there's a target
    let deltaX = 0
    let deltaY = 0
    let distance = 0
    let angle = 0

    if (targetPixels) {
        deltaX = targetPixels.x - casterPixels.x
        deltaY = targetPixels.y - casterPixels.y
        distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    }

    // Generate rising heal particles for caster
    const numCasterParticles = 12
    const casterParticles = Array.from({ length: numCasterParticles }, (_, i) => {
        const angleOffset = (i / numCasterParticles) * 360
        const radius = 15
        return {
            startX: casterPixels.x + Math.cos((angleOffset * Math.PI) / 180) * radius,
            startY: casterPixels.y + 30,
            endX: casterPixels.x + Math.cos((angleOffset * Math.PI) / 180) * (radius * 0.5),
            endY: casterPixels.y - 40,
            delay: i * 0.04
        }
    })

    // Generate rising heal particles for target (if exists)
    const targetParticles = targetPixels ? Array.from({ length: numCasterParticles }, (_, i) => {
        const angleOffset = (i / numCasterParticles) * 360
        const radius = 15
        return {
            startX: targetPixels.x + Math.cos((angleOffset * Math.PI) / 180) * radius,
            startY: targetPixels.y + 30,
            endX: targetPixels.x + Math.cos((angleOffset * Math.PI) / 180) * (radius * 0.5),
            endY: targetPixels.y - 40,
            delay: i * 0.04 + 0.3
        }
    }) : []

    // Generate sparkles around both positions
    const numSparkles = 8
    const casterSparkles = Array.from({ length: numSparkles }, (_, i) => {
        const angle = (i / numSparkles) * 360
        const radius = 35
        return {
            x: casterPixels.x + Math.cos((angle * Math.PI) / 180) * radius,
            y: casterPixels.y + Math.sin((angle * Math.PI) / 180) * radius,
            delay: i * 0.06
        }
    })

    const targetSparkles = targetPixels ? Array.from({ length: numSparkles }, (_, i) => {
        const angle = (i / numSparkles) * 360
        const radius = 35
        return {
            x: targetPixels.x + Math.cos((angle * Math.PI) / 180) * radius,
            y: targetPixels.y + Math.sin((angle * Math.PI) / 180) * radius,
            delay: i * 0.06 + 0.3
        }
    }) : []

    // Show target effects after initial caster effects
    useEffect(() => {
        if (targetPixels) {
            const timer = setTimeout(() => {
                setShowTargetEffects(true)
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [targetPixels])

    return (
        <>
            {/* Caster healing aura */}
            <HealAura
                style={{
                    left: casterPixels.x - 50,
                    top: casterPixels.y - 50,
                    width: 100,
                    height: 100
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: [0, 1.3, 1],
                    opacity: [0, 0.8, 0.5]
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            />

            {/* Caster restoration rings */}
            {[0, 1, 2].map((ringIndex) => (
                <RestorationRing
                    key={`caster-ring-${ringIndex}`}
                    style={{
                        left: casterPixels.x - 45,
                        top: casterPixels.y - 45,
                        width: 90,
                        height: 90
                    }}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{
                        scale: [0.3, 1.5],
                        opacity: [0.8, 0]
                    }}
                    transition={{
                        duration: 0.8,
                        delay: ringIndex * 0.15,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Rising heal particles for caster */}
            {casterParticles.map((particle, i) => (
                <HealParticle
                    key={`caster-particle-${i}`}
                    initial={{
                        x: particle.startX - 5,
                        y: particle.startY - 5,
                        scale: 0,
                        opacity: 0
                    }}
                    animate={{
                        x: particle.endX - 5,
                        y: particle.endY - 5,
                        scale: [0, 1.2, 1, 0.8],
                        opacity: [0, 1, 1, 0]
                    }}
                    transition={{
                        duration: 0.9,
                        delay: particle.delay,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Sparkles around caster */}
            {casterSparkles.map((sparkle, i) => (
                <Sparkle
                    key={`caster-sparkle-${i}`}
                    style={{
                        left: sparkle.x - 4,
                        top: sparkle.y - 4
                    }}
                    initial={{ scale: 0, opacity: 0, rotate: 0 }}
                    animate={{
                        scale: [0, 1.5, 0],
                        opacity: [0, 1, 0],
                        rotate: [0, 180]
                    }}
                    transition={{
                        duration: 0.6,
                        delay: sparkle.delay,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Healing beam connecting caster and target */}
            {targetPixels && (
                <HealBeam
                    style={{
                        left: casterPixels.x,
                        top: casterPixels.y,
                        width: distance,
                        transform: `rotate(${angle}deg)`,
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{
                        scaleX: [0, 1, 1, 0],
                        opacity: [0, 0.9, 0.7, 0]
                    }}
                    transition={{ duration: 0.9, delay: 0.2, ease: 'easeInOut' }}
                />
            )}

            {/* Target healing effects */}
            {showTargetEffects && targetPixels && (
                <>
                    {/* Target healing aura */}
                    <HealAura
                        style={{
                            left: targetPixels.x - 50,
                            top: targetPixels.y - 50,
                            width: 100,
                            height: 100
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1.3, 1],
                            opacity: [0, 0.8, 0.5]
                        }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />

                    {/* Target restoration rings */}
                    {[0, 1, 2].map((ringIndex) => (
                        <RestorationRing
                            key={`target-ring-${ringIndex}`}
                            style={{
                                left: targetPixels.x - 45,
                                top: targetPixels.y - 45,
                                width: 90,
                                height: 90
                            }}
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{
                                scale: [0.3, 1.5],
                                opacity: [0.8, 0]
                            }}
                            transition={{
                                duration: 0.8,
                                delay: ringIndex * 0.15,
                                ease: 'easeOut'
                            }}
                        />
                    ))}

                    {/* Rising heal particles for target */}
                    {targetParticles.map((particle, i) => (
                        <HealParticle
                            key={`target-particle-${i}`}
                            initial={{
                                x: particle.startX - 5,
                                y: particle.startY - 5,
                                scale: 0,
                                opacity: 0
                            }}
                            animate={{
                                x: particle.endX - 5,
                                y: particle.endY - 5,
                                scale: [0, 1.2, 1, 0.8],
                                opacity: [0, 1, 1, 0]
                            }}
                            transition={{
                                duration: 0.9,
                                delay: particle.delay,
                                ease: 'easeOut'
                            }}
                        />
                    ))}

                    {/* Sparkles around target */}
                    {targetSparkles.map((sparkle, i) => (
                        <Sparkle
                            key={`target-sparkle-${i}`}
                            style={{
                                left: sparkle.x - 4,
                                top: sparkle.y - 4
                            }}
                            initial={{ scale: 0, opacity: 0, rotate: 0 }}
                            animate={{
                                scale: [0, 1.5, 0],
                                opacity: [0, 1, 0],
                                rotate: [0, 180]
                            }}
                            transition={{
                                duration: 0.6,
                                delay: sparkle.delay,
                                ease: 'easeOut'
                            }}
                        />
                    ))}
                </>
            )}
        </>
    )
}

export const healRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <HealAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1200 // Initial effects + beam + target effects
}
