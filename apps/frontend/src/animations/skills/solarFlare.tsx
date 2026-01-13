import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

// Adjustable timing constants
const BEAM_STAGGER_DELAY = 150 // milliseconds between each sun beam

// Sun beam styled component
const SunBeam = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 100;
  background: linear-gradient(180deg,
    rgba(255, 215, 0, 0) 0%,
    rgba(255, 215, 0, 0.8) 10%,
    rgba(255, 165, 0, 1) 30%,
    rgba(255, 215, 0, 1) 50%,
    rgba(255, 165, 0, 1) 70%,
    rgba(255, 215, 0, 0.8) 90%,
    rgba(255, 215, 0, 0) 100%
  );
  box-shadow: 
    0 0 25px rgba(255, 215, 0, 0.9),
    0 0 50px rgba(255, 165, 0, 0.7),
    inset 0 0 20px rgba(255, 255, 255, 0.6);
  filter: blur(1.5px);
`

// Secondary beam for depth effect
const SunBeamGlow = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 99;
  background: linear-gradient(180deg,
    rgba(255, 215, 0, 0) 0%,
    rgba(255, 140, 0, 0.6) 20%,
    rgba(255, 215, 0, 0.8) 50%,
    rgba(255, 140, 0, 0.6) 80%,
    rgba(255, 215, 0, 0) 100%
  );
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
  filter: blur(2px);
`

// Sun particle
const SunParticle = styled(motion.div)`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 215, 0, 0.9) 40%, rgba(255, 140, 0, 0.7) 100%);
  box-shadow: 
    0 0 15px rgba(255, 215, 0, 1),
    0 0 25px rgba(255, 165, 0, 0.8),
    inset 0 0 10px rgba(255, 255, 255, 0.9);
  pointer-events: none;
  z-index: 101;
`

// Impact burst effect
const ImpactBurst = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(255, 215, 0, 1);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 215, 0, 0.6) 30%, rgba(255, 140, 0, 0.4) 60%, transparent 80%);
  pointer-events: none;
  z-index: 98;
  box-shadow: 
    0 0 40px rgba(255, 215, 0, 1),
    inset 0 0 30px rgba(255, 215, 0, 0.8);
`

// Sunlight mark indicator (pulsing sun)
const SunlightMark = styled(motion.div)`
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 215, 0, 0.9) 50%, rgba(255, 140, 0, 0.7) 100%);
  pointer-events: none;
  z-index: 102;
  box-shadow: 
    0 0 20px rgba(255, 215, 0, 1),
    inset 0 0 15px rgba(255, 255, 255, 0.8);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
`

// Slow effect overlay (icy blue tint)
const SlowEffect = styled(motion.div)`
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(135, 206, 250, 0.4) 0%, rgba(30, 144, 255, 0.3) 50%, transparent 100%);
  border: 2px solid rgba(135, 206, 250, 0.6);
  pointer-events: none;
  z-index: 97;
  box-shadow: 0 0 15px rgba(135, 206, 250, 0.5);
`

// Sun ray beams radiating from impact
const SunRay = styled(motion.div)`
  position: absolute;
  width: 4px;
  height: 30px;
  background: linear-gradient(180deg,
    rgba(255, 255, 255, 1) 0%,
    rgba(255, 215, 0, 0.9) 50%,
    rgba(255, 140, 0, 0) 100%
  );
  pointer-events: none;
  z-index: 96;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.9);
`

interface BeamData {
    id: number
    targetIndex: number
    launched: boolean
}

/**
 * Leona's Solar Flare animation
 * Calls down golden sun beams on up to 3 targets sequentially
 * Shows impact effects, particles, slow overlay, and sunlight marks
 */
const SolarFlareAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    sunlightTargets,
    boardRef,
    isRedPlayer = false
}) => {
    const [beams, setBeams] = useState<BeamData[]>([])
    const [activeBeamIndex, setActiveBeamIndex] = useState(0)
    const [impacts, setImpacts] = useState<{ id: number; position: { x: number; y: number } }[]>([])
    const [particles, setParticles] = useState<{ id: number; position: { x: number; y: number } }[]>([])

    if (!sunlightTargets || sunlightTargets.length === 0) {
        console.warn('[Solar Flare] No sunlightTargets provided')
        return null
    }

    // Build target positions map
    const targetPixelsMap = new Map<number, { x: number; y: number }>()
    sunlightTargets.forEach((target, index) => {
        targetPixelsMap.set(index, getPixelPosition(target.targetPosition, boardRef, isRedPlayer))
    })

    // Initialize beams on mount
    useEffect(() => {
        const initialBeams: BeamData[] = []
        for (let i = 0; i < sunlightTargets.length; i++) {
            initialBeams.push({
                id: i,
                targetIndex: i,
                launched: i === 0 // Launch first beam immediately
            })
        }
        setBeams(initialBeams)
    }, [sunlightTargets.length])

    // Launch beams sequentially with stagger delay
    useEffect(() => {
        if (activeBeamIndex < sunlightTargets.length) {
            const timer = setTimeout(() => {
                setBeams(prev => prev.map((beam, idx) =>
                    idx === activeBeamIndex ? { ...beam, launched: true } : beam
                ))
                setActiveBeamIndex(prev => prev + 1)
            }, activeBeamIndex === 0 ? 0 : BEAM_STAGGER_DELAY)

            return () => clearTimeout(timer)
        }
    }, [activeBeamIndex, sunlightTargets.length])

    const handleBeamImpact = (beamId: number, targetIndex: number) => {
        const targetPixels = targetPixelsMap.get(targetIndex)
        if (targetPixels) {
            // Add impact effect
            setImpacts(prev => [...prev, { id: beamId, position: targetPixels }])

            // Add particle effect
            setParticles(prev => [...prev, { id: beamId, position: targetPixels }])

            // Clean up impact after animation
            setTimeout(() => {
                setImpacts(prev => prev.filter(i => i.id !== beamId))
            }, 600)

            // Clean up particles after animation
            setTimeout(() => {
                setParticles(prev => prev.filter(p => p.id !== beamId))
            }, 700)
        }
    }

    return (
        <>
            {/* Render all sun beams */}
            {beams.map(beam => {
                if (!beam.launched) return null

                const targetPixels = targetPixelsMap.get(beam.targetIndex)
                if (!targetPixels) return null

                // Sun beam starts from top of screen
                const beamStartY = -100
                const beamHeight = targetPixels.y - beamStartY + 20

                return (
                    <React.Fragment key={beam.id}>
                        {/* Main sun beam */}
                        <SunBeam
                            style={{
                                left: targetPixels.x - 6,
                                top: beamStartY,
                                width: 12,
                                height: beamHeight
                            }}
                            initial={{ scaleY: 0, opacity: 0 }}
                            animate={{
                                scaleY: [0, 1.2, 1],
                                opacity: [0, 1, 0.9, 0]
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            onAnimationComplete={() => handleBeamImpact(beam.id, beam.targetIndex)}
                        />

                        {/* Secondary glow beam for depth */}
                        <SunBeamGlow
                            style={{
                                left: targetPixels.x - 10,
                                top: beamStartY,
                                width: 20,
                                height: beamHeight
                            }}
                            initial={{ scaleY: 0, opacity: 0 }}
                            animate={{
                                scaleY: [0, 1.1, 0.9],
                                opacity: [0, 0.8, 0.6, 0]
                            }}
                            transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
                        />

                        {/* Slow effect indicator (icy overlay, 2 seconds = 2 turns) */}
                        <SlowEffect
                            style={{
                                left: targetPixels.x - 20,
                                top: targetPixels.y - 20
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: [0, 1.2, 1],
                                opacity: [0, 0.7, 0.5, 0.3, 0]
                            }}
                            transition={{ duration: 2, delay: 0.3, ease: 'easeOut' }}
                        />

                        {/* Sunlight mark (pulsing sun, 3 seconds = 3 turns) */}
                        <SunlightMark
                            style={{
                                left: targetPixels.x - 15,
                                top: targetPixels.y - 35
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: [0, 1.3, 1, 1.1, 1, 1.1, 1],
                                opacity: [0, 1, 0.9, 1, 0.9, 1, 0.8, 0]
                            }}
                            transition={{ duration: 3, delay: 0.4, ease: 'easeInOut' }}
                        >
                            ☀️
                        </SunlightMark>
                    </React.Fragment>
                )
            })}

            {/* Render impact bursts */}
            {impacts.map(impact => (
                <React.Fragment key={`impact-${impact.id}`}>
                    {/* Main impact burst */}
                    <ImpactBurst
                        style={{
                            left: impact.position.x - 50,
                            top: impact.position.y - 50,
                            width: 100,
                            height: 100
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1.5, 1],
                            opacity: [0, 1, 0.6, 0]
                        }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />

                    {/* Secondary impact wave */}
                    <ImpactBurst
                        style={{
                            left: impact.position.x - 40,
                            top: impact.position.y - 40,
                            width: 80,
                            height: 80
                        }}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{
                            scale: [0.5, 2],
                            opacity: [0.8, 0]
                        }}
                        transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
                    />

                    {/* Sun rays radiating from impact */}
                    {Array.from({ length: 8 }).map((_, i) => {
                        const angle = (i / 8) * 360
                        const distance = 35
                        return (
                            <SunRay
                                key={`ray-${impact.id}-${i}`}
                                style={{
                                    left: impact.position.x + Math.cos((angle * Math.PI) / 180) * distance - 2,
                                    top: impact.position.y + Math.sin((angle * Math.PI) / 180) * distance - 15,
                                    transform: `rotate(${angle + 90}deg)`,
                                    transformOrigin: 'center center'
                                }}
                                initial={{ scaleY: 0, opacity: 0 }}
                                animate={{
                                    scaleY: [0, 1.5, 0],
                                    opacity: [0, 1, 0]
                                }}
                                transition={{
                                    duration: 0.5,
                                    delay: 0.2 + i * 0.03,
                                    ease: 'easeOut'
                                }}
                            />
                        )
                    })}
                </React.Fragment>
            ))}

            {/* Render golden particle effects */}
            {particles.map(particle => (
                <React.Fragment key={`particles-${particle.id}`}>
                    {/* Golden particles spreading outward */}
                    {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i / 12) * 360
                        const distance = 50 + Math.random() * 20
                        return (
                            <SunParticle
                                key={`particle-${particle.id}-${i}`}
                                initial={{
                                    x: particle.position.x - 5,
                                    y: particle.position.y - 5,
                                    scale: 0,
                                    opacity: 0
                                }}
                                animate={{
                                    x: particle.position.x + Math.cos((angle * Math.PI) / 180) * distance - 5,
                                    y: particle.position.y + Math.sin((angle * Math.PI) / 180) * distance - 5,
                                    scale: [0, 1.5, 1, 0],
                                    opacity: [0, 1, 0.8, 0]
                                }}
                                transition={{
                                    duration: 0.7,
                                    delay: 0.3 + i * 0.02,
                                    ease: 'easeOut'
                                }}
                            />
                        )
                    })}
                </React.Fragment>
            ))}
        </>
    )
}

export const solarFlareRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <SolarFlareAnimation {...config} />
            </AnimatePresence>
        )
    },
    // Dynamic duration based on number of targets
    // Total duration: (targetCount * stagger) + beam animation + lingering effects
    duration: (config: SkillAnimationConfig) => {
        const targetCount = config.sunlightTargets?.length || 1
        const beamTime = 500 // Beam strike time in ms
        const longestEffect = 3000 // Sunlight mark lasts 3 seconds
        const buffer = 200 // Extra buffer time in ms
        return targetCount * BEAM_STAGGER_DELAY + beamTime + buffer
    }
}
