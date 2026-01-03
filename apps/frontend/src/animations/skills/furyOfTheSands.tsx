import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

// Styled components for Nasus's Fury of the Sands transformation

const AscensionAura = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(255, 215, 0, 0.4) 0%, 
    rgba(255, 165, 0, 0.3) 30%,
    rgba(184, 134, 11, 0.2) 60%, 
    transparent 80%
  );
  pointer-events: none;
  z-index: 98;
  box-shadow: 
    0 0 40px rgba(255, 215, 0, 0.8),
    inset 0 0 30px rgba(255, 255, 255, 0.3);
`

const SandWave = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(255, 215, 0, 0.8);
  background: transparent;
  pointer-events: none;
  z-index: 97;
  box-shadow: 
    0 0 20px rgba(255, 215, 0, 0.6),
    0 0 40px rgba(255, 165, 0, 0.4);
`

const TransformPillar = styled(motion.div)`
  position: absolute;
  width: 8px;
  height: 80px;
  background: linear-gradient(180deg, 
    transparent 0%,
    rgba(255, 215, 0, 0.8) 30%,
    rgba(255, 165, 0, 0.9) 70%,
    rgba(255, 215, 0, 0.6) 100%
  );
  pointer-events: none;
  z-index: 100;
  box-shadow: 
    0 0 15px rgba(255, 215, 0, 0.8),
    0 0 30px rgba(255, 165, 0, 0.5);
  border-radius: 4px;
`

const DamageWave = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 4px solid rgba(255, 140, 0, 0.9);
  background: radial-gradient(circle,
    rgba(255, 165, 0, 0.3) 0%,
    rgba(255, 140, 0, 0.2) 50%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 99;
  box-shadow: 
    0 0 25px rgba(255, 140, 0, 0.8),
    inset 0 0 15px rgba(255, 200, 100, 0.4);
`

const SandParticle = styled(motion.div)`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(255, 215, 0, 1) 0%, 
    rgba(255, 165, 0, 0.8) 50%, 
    rgba(184, 134, 11, 0.6) 100%
  );
  box-shadow: 
    0 0 12px rgba(255, 215, 0, 0.9),
    0 0 20px rgba(255, 165, 0, 0.6);
  pointer-events: none;
  z-index: 101;
`

const EnergyBurst = styled(motion.div)`
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(255, 255, 255, 0.9) 0%, 
    rgba(255, 215, 0, 0.7) 40%, 
    rgba(255, 165, 0, 0.5) 70%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 102;
  box-shadow: 
    0 0 40px rgba(255, 215, 0, 1),
    0 0 60px rgba(255, 165, 0, 0.6);
`

/**
 * Nasus's Fury of the Sands animation
 * Shows Nasus transforming into his Ascended form:
 * - Rising energy pillars around him
 * - Expanding golden aura
 * - AOE damage wave affecting adjacent squares
 * - Sand particle burst effect
 */
const FuryOfTheSandsAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    casterId,
    boardRef,
    isRedPlayer = false
}) => {
    const [showAura, setShowAura] = useState(false)
    const [showDamageWave, setShowDamageWave] = useState(false)
    const [showPillars, setShowPillars] = useState(false)

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)

    // Energy pillar positions (around the caster)
    const pillarCount = 8
    const pillarAngles = Array.from({ length: pillarCount }, (_, i) => 
        (i / pillarCount) * Math.PI * 2
    )

    // Trigger animation phases
    useEffect(() => {
        // Phase 1: Energy pillars rise
        setShowPillars(true)

        // Phase 2: Aura expands
        const auraTimer = setTimeout(() => {
            setShowAura(true)
        }, 300)

        // Phase 3: Damage wave releases
        const damageTimer = setTimeout(() => {
            setShowDamageWave(true)
        }, 600)

        return () => {
            clearTimeout(auraTimer)
            clearTimeout(damageTimer)
        }
    }, [])

    return (
        <>
            {/* Initial energy burst at center */}
            <EnergyBurst
                style={{
                    left: casterPixels.x - 30,
                    top: casterPixels.y - 30
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: [0, 2, 1.5],
                    opacity: [0, 1, 0]
                }}
                transition={{
                    duration: 0.5,
                    ease: 'easeOut'
                }}
            />

            {/* Rising energy pillars */}
            {showPillars && pillarAngles.map((angle, index) => {
                const distance = 50
                const pillarX = casterPixels.x + Math.cos(angle) * distance - 4
                const pillarY = casterPixels.y + Math.sin(angle) * distance - 40

                return (
                    <TransformPillar
                        key={`pillar-${index}`}
                        style={{
                            left: pillarX,
                            top: pillarY
                        }}
                        initial={{ 
                            scaleY: 0, 
                            opacity: 0,
                            y: 40
                        }}
                        animate={{
                            scaleY: [0, 1.2, 1, 0],
                            opacity: [0, 1, 1, 0],
                            y: [40, -20, -30, -60]
                        }}
                        transition={{
                            duration: 1,
                            delay: index * 0.05,
                            ease: 'easeOut'
                        }}
                    />
                )
            })}

            {/* Transformation aura around Nasus */}
            {showAura && (
                <AscensionAura
                    style={{
                        left: casterPixels.x - 60,
                        top: casterPixels.y - 60,
                        width: 120,
                        height: 120
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.5, 1.2],
                        opacity: [0, 1, 0.8, 0]
                    }}
                    transition={{
                        duration: 0.8,
                        ease: 'easeOut'
                    }}
                />
            )}

            {/* Expanding sand waves */}
            {showAura && [0, 1, 2].map((waveIndex) => (
                <SandWave
                    key={`wave-${waveIndex}`}
                    style={{
                        left: casterPixels.x - 40,
                        top: casterPixels.y - 40,
                        width: 80,
                        height: 80
                    }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                        scale: [0.5, 3],
                        opacity: [0.9, 0]
                    }}
                    transition={{
                        duration: 0.8,
                        delay: waveIndex * 0.15,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* AOE damage wave */}
            {showDamageWave && (
                <DamageWave
                    style={{
                        left: casterPixels.x - 70,
                        top: casterPixels.y - 70,
                        width: 140,
                        height: 140
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.3, 1.5],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: 0.6,
                        ease: 'easeOut'
                    }}
                />
            )}

            {/* Sand particles bursting outward */}
            {showDamageWave && Array.from({ length: 16 }).map((_, i) => {
                const angle = (i / 16) * Math.PI * 2
                const distance = 80 + Math.random() * 30
                const startDelay = Math.random() * 0.2

                return (
                    <SandParticle
                        key={`sand-${i}`}
                        initial={{
                            x: casterPixels.x - 5,
                            y: casterPixels.y - 5,
                            scale: 0,
                            opacity: 0
                        }}
                        animate={{
                            x: casterPixels.x + Math.cos(angle) * distance - 5,
                            y: casterPixels.y + Math.sin(angle) * distance - 5,
                            scale: [0, 1.2, 0],
                            opacity: [0, 1, 0]
                        }}
                        transition={{
                            duration: 0.6,
                            delay: startDelay,
                            ease: 'easeOut'
                        }}
                    />
                )
            })}

            {/* Particle burst effect */}
            {showDamageWave && (
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
                        duration={600}
                    />
                </motion.div>
            )}
        </>
    )
}

export const furyOfTheSandsRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <FuryOfTheSandsAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1500 // 300ms pillars + 300ms aura + 600ms damage + 300ms particles
}
