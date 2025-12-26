import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

// Viktor's hextech color scheme - purple/gold energy
const HEXTECH_PURPLE = '#9B59B6'
const HEXTECH_GOLD = '#F1C40F'
const HEXTECH_BLUE = '#3498DB'
const ENERGY_CORE = '#E8DAEF'

// Energy beam projectile from Viktor to target
const EnergyBeam = styled(motion.div)`
  position: absolute;
  height: 6px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    ${HEXTECH_PURPLE} 10%,
    ${HEXTECH_GOLD} 50%,
    ${HEXTECH_PURPLE} 90%,
    transparent 100%
  );
  border-radius: 3px;
  transform-origin: left center;
  pointer-events: none;
  z-index: 100;
  box-shadow: 
    0 0 15px ${HEXTECH_PURPLE},
    0 0 30px ${HEXTECH_GOLD},
    0 0 5px ${ENERGY_CORE};
`

// Core energy orb traveling along the beam
const EnergyOrb = styled(motion.div)`
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(circle, 
    ${ENERGY_CORE} 0%, 
    ${HEXTECH_GOLD} 40%, 
    ${HEXTECH_PURPLE} 80%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 101;
  box-shadow: 
    0 0 20px ${HEXTECH_GOLD},
    0 0 40px ${HEXTECH_PURPLE},
    inset 0 0 10px rgba(255, 255, 255, 0.5);
`

// Impact effect on target
const ImpactBurst = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, 
    ${ENERGY_CORE} 0%, 
    ${HEXTECH_GOLD} 30%, 
    ${HEXTECH_PURPLE} 60%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 102;
  box-shadow: 
    0 0 30px ${HEXTECH_GOLD},
    0 0 50px ${HEXTECH_PURPLE};
`

// Module 1: Stun stars effect
const StunStar = styled(motion.div)`
  position: absolute;
  width: 20px;
  height: 20px;
  pointer-events: none;
  z-index: 105;
  font-size: 20px;
  text-shadow: 
    0 0 10px ${HEXTECH_GOLD},
    0 0 20px ${HEXTECH_PURPLE};
`

// Module 2: Empowerment aura on Viktor
const EmpowerAura = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid ${HEXTECH_GOLD};
  background: radial-gradient(circle, 
    rgba(241, 196, 15, 0.3) 0%, 
    rgba(155, 89, 182, 0.2) 50%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 97;
  box-shadow: 
    0 0 25px ${HEXTECH_GOLD},
    inset 0 0 20px rgba(241, 196, 15, 0.4),
    0 0 40px ${HEXTECH_PURPLE};
`

// Module 3: Hextech shield bubble
const HextechShield = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 4px solid ${HEXTECH_BLUE};
  background: radial-gradient(circle, 
    rgba(52, 152, 219, 0.3) 0%, 
    rgba(155, 89, 182, 0.2) 40%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 98;
  box-shadow: 
    0 0 30px ${HEXTECH_BLUE},
    inset 0 0 25px rgba(52, 152, 219, 0.4),
    0 0 15px ${HEXTECH_PURPLE};
`

// Shield hex pattern overlay
const ShieldHexPattern = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 2px dashed rgba(52, 152, 219, 0.6);
  pointer-events: none;
  z-index: 99;
`

// Module 4: Execute disintegration particle
const DisintegrationParticle = styled(motion.div)`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, 
    #FF4444 0%, 
    ${HEXTECH_PURPLE} 50%, 
    transparent 100%
  );
  pointer-events: none;
  z-index: 110;
  box-shadow: 
    0 0 15px #FF4444,
    0 0 25px ${HEXTECH_PURPLE};
`

// Module 5: Lightning arc between targets
const LightningArc = styled(motion.div)`
  position: absolute;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    ${HEXTECH_BLUE} 20%,
    ${ENERGY_CORE} 50%,
    ${HEXTECH_BLUE} 80%,
    transparent 100%
  );
  transform-origin: left center;
  pointer-events: none;
  z-index: 103;
  box-shadow: 
    0 0 10px ${HEXTECH_BLUE},
    0 0 20px ${HEXTECH_PURPLE};
`

// Lightning spark at connection point
const LightningSpark = styled(motion.div)`
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle, 
    ${ENERGY_CORE} 0%, 
    ${HEXTECH_BLUE} 50%, 
    transparent 100%
  );
  pointer-events: none;
  z-index: 104;
  box-shadow: 0 0 15px ${HEXTECH_BLUE};
`

/**
 * Viktor's Siphon Power animation
 * Shows hextech energy beam with module-specific effects:
 * - Module 1: Stun stars around target
 * - Module 2: Empowerment aura on Viktor
 * - Module 3: Shield bubble on Viktor
 * - Module 4: Execute disintegration effect
 * - Module 5: Chain lightning to adjacent targets
 */
const SiphonPowerAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    boardRef,
    isRedPlayer = false,
    viktorModules
}) => {
    const [showImpact, setShowImpact] = useState(false)
    const [showModuleEffects, setShowModuleEffects] = useState(false)
    const [showLightning, setShowLightning] = useState(false)

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = targetPosition
        ? getPixelPosition(targetPosition, boardRef, isRedPlayer)
        : null

    // Calculate beam angle and distance
    const deltaX = targetPixels ? targetPixels.x - casterPixels.x : 0
    const deltaY = targetPixels ? targetPixels.y - casterPixels.y : 0
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Module effects
    const stunProc = viktorModules?.stunProc
    const empowered = viktorModules?.empowered
    const shielded = viktorModules?.shielded
    const executed = viktorModules?.executed
    const aoeTargets = viktorModules?.aoeTargets || []

    // Timing for animation phases
    useEffect(() => {
        // Show impact after beam reaches target
        const impactTimer = setTimeout(() => {
            setShowImpact(true)
            setShowModuleEffects(true)
        }, 400)

        // Show lightning chains after impact (Module 5)
        const lightningTimer = setTimeout(() => {
            if (aoeTargets.length > 0) {
                setShowLightning(true)
            }
        }, 500)

        return () => {
            clearTimeout(impactTimer)
            clearTimeout(lightningTimer)
        }
    }, [aoeTargets.length])

    // Generate stun stars positions
    const stunStars = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        angle: (i / 5) * Math.PI * 2,
        radius: 35
    }))

    // Generate disintegration particles
    const disintegrationParticles = Array.from({ length: 16 }, (_, i) => ({
        id: i,
        angle: (i / 16) * Math.PI * 2,
        distance: 50 + Math.random() * 30,
        delay: Math.random() * 0.2
    }))

    return (
        <>
            {/* Energy beam from Viktor to target */}
            {targetPixels && (
                <>
                    <EnergyBeam
                        style={{
                            left: casterPixels.x,
                            top: casterPixels.y - 3,
                            rotate: angle,
                            width: distance
                        }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{
                            scaleX: [0, 1, 1, 0.8],
                            opacity: [0, 1, 0.8, 0]
                        }}
                        transition={{
                            duration: 0.6,
                            ease: 'easeOut'
                        }}
                    />

                    {/* Energy orb traveling along beam */}
                    <EnergyOrb
                        initial={{
                            x: casterPixels.x - 12,
                            y: casterPixels.y - 12,
                            scale: 0,
                            opacity: 0
                        }}
                        animate={{
                            x: [casterPixels.x - 12, targetPixels.x - 12],
                            y: [casterPixels.y - 12, targetPixels.y - 12],
                            scale: [0, 1.2, 1, 0.8],
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{
                            duration: 0.5,
                            ease: 'easeInOut'
                        }}
                    />
                </>
            )}

            {/* Impact effect on target */}
            {showImpact && targetPixels && !executed && (
                <ImpactBurst
                    style={{
                        left: targetPixels.x - 40,
                        top: targetPixels.y - 40
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.3, 1],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: 0.4,
                        ease: 'easeOut'
                    }}
                />
            )}

            {/* Module 1: Stun stars effect */}
            {showModuleEffects && stunProc && targetPixels && (
                <>
                    {stunStars.map((star) => (
                        <StunStar
                            key={`stun-${star.id}`}
                            style={{
                                left: targetPixels.x - 10,
                                top: targetPixels.y - 10
                            }}
                            initial={{
                                x: Math.cos(star.angle) * 10,
                                y: Math.sin(star.angle) * 10,
                                opacity: 0,
                                rotate: 0
                            }}
                            animate={{
                                x: Math.cos(star.angle + Math.PI * 2) * star.radius,
                                y: Math.sin(star.angle + Math.PI * 2) * star.radius,
                                opacity: [0, 1, 1, 0],
                                rotate: [0, 360, 720]
                            }}
                            transition={{
                                duration: 0.8,
                                delay: star.id * 0.05,
                                ease: 'easeOut'
                            }}
                        >
                            ⚡
                        </StunStar>
                    ))}
                </>
            )}

            {/* Module 2: Empowerment aura on Viktor */}
            {showModuleEffects && empowered && (
                <>
                    <EmpowerAura
                        style={{
                            left: casterPixels.x - 45,
                            top: casterPixels.y - 45,
                            width: 90,
                            height: 90
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1.2, 1],
                            opacity: [0, 0.9, 0.7]
                        }}
                        transition={{
                            duration: 0.5,
                            ease: 'easeOut'
                        }}
                    />
                    {/* Pulsing waves */}
                    {[0, 1, 2].map((waveIndex) => (
                        <motion.div
                            key={`empower-wave-${waveIndex}`}
                            style={{
                                position: 'absolute',
                                left: casterPixels.x - 45,
                                top: casterPixels.y - 45,
                                width: 90,
                                height: 90,
                                borderRadius: '50%',
                                border: `2px solid ${HEXTECH_GOLD}`,
                                pointerEvents: 'none',
                                zIndex: 96
                            }}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{
                                scale: [0.8, 1.8],
                                opacity: [0.7, 0]
                            }}
                            transition={{
                                duration: 0.6,
                                delay: waveIndex * 0.15,
                                ease: 'easeOut'
                            }}
                        />
                    ))}
                </>
            )}

            {/* Module 3: Hextech shield on Viktor */}
            {showModuleEffects && shielded && (
                <>
                    <HextechShield
                        style={{
                            left: casterPixels.x - 50,
                            top: casterPixels.y - 50,
                            width: 100,
                            height: 100
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1.2, 1],
                            opacity: [0, 0.9, 0.8]
                        }}
                        transition={{
                            duration: 0.5,
                            ease: 'easeOut'
                        }}
                    />
                    <ShieldHexPattern
                        style={{
                            left: casterPixels.x - 40,
                            top: casterPixels.y - 40,
                            width: 80,
                            height: 80
                        }}
                        initial={{ scale: 0, opacity: 0, rotate: 0 }}
                        animate={{
                            scale: [0, 1],
                            opacity: [0, 0.6],
                            rotate: [0, 60]
                        }}
                        transition={{
                            duration: 0.6,
                            ease: 'easeOut'
                        }}
                    />
                </>
            )}

            {/* Module 4: Execute disintegration effect */}
            {showImpact && executed && targetPixels && (
                <>
                    {disintegrationParticles.map((particle) => (
                        <DisintegrationParticle
                            key={`disintegrate-${particle.id}`}
                            initial={{
                                x: targetPixels.x - 5,
                                y: targetPixels.y - 5,
                                scale: 1,
                                opacity: 1
                            }}
                            animate={{
                                x: targetPixels.x - 5 + Math.cos(particle.angle) * particle.distance,
                                y: targetPixels.y - 5 + Math.sin(particle.angle) * particle.distance,
                                scale: [1, 1.5, 0],
                                opacity: [1, 0.8, 0]
                            }}
                            transition={{
                                duration: 0.6,
                                delay: particle.delay,
                                ease: 'easeOut'
                            }}
                        />
                    ))}
                    {/* Central flash */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            left: targetPixels.x - 50,
                            top: targetPixels.y - 50,
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, #FF4444 0%, ${HEXTECH_PURPLE} 50%, transparent 100%)`,
                            pointerEvents: 'none',
                            zIndex: 109
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 2, 2.5],
                            opacity: [0, 1, 0]
                        }}
                        transition={{
                            duration: 0.5,
                            ease: 'easeOut'
                        }}
                    />
                </>
            )}

            {/* Module 5: Chain lightning to AOE targets */}
            {showLightning && targetPixels && aoeTargets.map((aoeTarget, index) => {
                const aoePixels = getPixelPosition(aoeTarget.targetPosition, boardRef, isRedPlayer)
                const aoeDeltaX = aoePixels.x - targetPixels.x
                const aoeDeltaY = aoePixels.y - targetPixels.y
                const aoeAngle = Math.atan2(aoeDeltaY, aoeDeltaX) * (180 / Math.PI)
                const aoeDistance = Math.sqrt(aoeDeltaX * aoeDeltaX + aoeDeltaY * aoeDeltaY)

                return (
                    <React.Fragment key={`lightning-${aoeTarget.targetId}`}>
                        {/* Lightning arc */}
                        <LightningArc
                            style={{
                                left: targetPixels.x,
                                top: targetPixels.y - 1.5,
                                rotate: aoeAngle,
                                width: aoeDistance
                            }}
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{
                                scaleX: [0, 1, 1, 0.5],
                                opacity: [0, 1, 0.8, 0]
                            }}
                            transition={{
                                duration: 0.4,
                                delay: index * 0.08,
                                ease: 'easeOut'
                            }}
                        />
                        {/* Spark at target */}
                        <LightningSpark
                            style={{
                                left: aoePixels.x - 8,
                                top: aoePixels.y - 8
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: [0, 1.5, 1, 0],
                                opacity: [0, 1, 0.8, 0]
                            }}
                            transition={{
                                duration: 0.5,
                                delay: 0.2 + index * 0.08,
                                ease: 'easeOut'
                            }}
                        />
                    </React.Fragment>
                )
            })}

            {/* Particle burst at caster position */}
            {showImpact && (
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
                        count={8}
                        duration={400}
                    />
                </motion.div>
            )}
        </>
    )
}

export const siphonPowerRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <SiphonPowerAnimation {...config} />
            </AnimatePresence>
        )
    },
    // Dynamic duration: longer if Module 5 AOE is active
    duration: (config: SkillAnimationConfig) => {
        const hasAoeTargets = config.viktorModules?.aoeTargets && config.viktorModules.aoeTargets.length > 0
        return hasAoeTargets ? 900 : 700
    }
}

