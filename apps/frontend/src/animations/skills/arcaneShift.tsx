import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion, animate } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

const TeleportBurst = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 98;
`

const ArcaneOrb = styled(motion.div)`
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(5, 150, 170, 1) 0%, rgba(5, 150, 170, 0.8) 50%, rgba(5, 150, 170, 0.4) 100%);
  box-shadow: 
    0 0 20px rgba(5, 150, 170, 0.9),
    0 0 40px rgba(5, 150, 170, 0.6),
    inset 0 0 12px rgba(255, 255, 255, 0.5);
  filter: blur(1px);
`

const EnergyTrail = styled(motion.div)`
  position: absolute;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(5, 150, 170, 0.8) 20%, 
    rgba(5, 150, 170, 1) 50%, 
    rgba(5, 150, 170, 0.8) 80%, 
    transparent 100%
  );
  box-shadow: 0 0 10px rgba(5, 150, 170, 0.8);
  pointer-events: none;
  z-index: 95;
  transform-origin: left center;
`

const TeleportFlash = styled(motion.div)`
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(5, 150, 170, 0.7) 0%, rgba(5, 150, 170, 0.4) 40%, transparent 70%);
  pointer-events: none;
  z-index: 97;
  box-shadow: 
    0 0 40px rgba(5, 150, 170, 0.9),
    inset 0 0 30px rgba(5, 150, 170, 0.6);
`

const AOERing = styled(motion.div)`
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 2px solid rgba(5, 150, 170, 0.6);
  background: radial-gradient(circle, rgba(5, 150, 170, 0.2) 0%, transparent 60%);
  pointer-events: none;
  z-index: 96;
  box-shadow: 0 0 20px rgba(5, 150, 170, 0.5);
`

/**
 * Ezreal's Arcane Shift animation
 * Shows Ezreal teleporting to target location with arcane energy effects
 * and an AOE damage indicator for adjacent enemies
 */
const ArcaneShiftAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    casterId,
    boardRef,
    isRedPlayer = false
}) => {
    const [showArrival, setShowArrival] = useState(false)
    const [showAOE, setShowAOE] = useState(false)

    if (!targetPosition) {
        console.warn('[ArcaneShift] Missing targetPosition:', { targetPosition })
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

    // Calculate angle and distance for the energy trail
    const deltaX = targetPixels.x - casterPixels.x
    const deltaY = targetPixels.y - casterPixels.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Generate arcane orbs spiraling outward from departure point
    const numOrbs = 6
    const orbPositions = Array.from({ length: numOrbs }, (_, i) => {
        const angleOffset = (i / numOrbs) * 360
        const radius = 30
        return {
            x: casterPixels.x + Math.cos((angleOffset * Math.PI) / 180) * radius,
            y: casterPixels.y + Math.sin((angleOffset * Math.PI) / 180) * radius,
            delay: i * 0.03
        }
    })

    // Animate Ezreal teleporting to the target position
    useEffect(() => {
        if (casterId) {
            const pieceElement = document.querySelector(`[data-piece-id="${casterId}"]`)

            if (pieceElement && pieceElement instanceof HTMLElement) {
                const teleportOffsetX = targetPixels.x - casterPixels.x
                const teleportOffsetY = targetPixels.y - casterPixels.y

                // Quick fade out at origin
                const fadeOut = animate(
                    pieceElement,
                    {
                        opacity: [1, 0.3, 0],
                        scale: [1, 0.8, 0.6]
                    },
                    {
                        duration: 0.2,
                        ease: 'easeIn'
                    }
                )

                fadeOut.then(() => {
                    // Show arrival effects
                    setShowArrival(true)
                    setShowAOE(true)

                    // Fade in at destination with position change
                    animate(
                        pieceElement,
                        {
                            x: teleportOffsetX,
                            y: teleportOffsetY,
                            opacity: [0, 0.3, 1],
                            scale: [0.6, 1.2, 1]
                        },
                        {
                            duration: 0.3,
                            ease: 'easeOut'
                        }
                    )

                    // Clean up effects after duration
                    setTimeout(() => {
                        setShowArrival(false)
                        setShowAOE(false)
                    }, 700)
                })

                return () => {
                    fadeOut.stop()
                }
            }
        }
    }, [casterId, targetPixels.x, targetPixels.y, casterPixels.x, casterPixels.y])

    return (
        <>
            {/* Departure flash */}
            <TeleportFlash
                style={{
                    left: casterPixels.x - 50,
                    top: casterPixels.y - 50
                }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: [0, 1.3, 0], opacity: [0.8, 0.6, 0] }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Spiraling orbs at departure */}
            <TeleportBurst>
                {orbPositions.map((pos, i) => (
                    <ArcaneOrb
                        key={i}
                        style={{
                            left: casterPixels.x - 10,
                            top: casterPixels.y - 10
                        }}
                        initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                        animate={{
                            scale: [0, 1, 0.5],
                            opacity: [0, 1, 0],
                            x: [0, pos.x - casterPixels.x],
                            y: [0, pos.y - casterPixels.y]
                        }}
                        transition={{
                            duration: 0.5,
                            delay: pos.delay,
                            ease: 'easeOut'
                        }}
                    />
                ))}
            </TeleportBurst>

            {/* Energy trail connecting departure and arrival */}
            <EnergyTrail
                style={{
                    left: casterPixels.x,
                    top: casterPixels.y,
                    width: distance,
                    transform: `rotate(${angle}deg)`,
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: [0, 1, 0], opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
            />

            {/* Arrival flash */}
            {showArrival && (
                <TeleportFlash
                    style={{
                        left: targetPixels.x - 50,
                        top: targetPixels.y - 50
                    }}
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: [0, 1.5, 1], opacity: [0.8, 0.6, 0] }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            )}

            {/* AOE damage indicator ring */}
            {showAOE && (
                <AOERing
                    style={{
                        left: targetPixels.x - 60,
                        top: targetPixels.y - 60
                    }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                        scale: [0.5, 1.2, 1],
                        opacity: [0, 1, 0.6, 0],
                        rotate: [0, 180]
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            )}

            {/* Particle burst at arrival */}
            {showArrival && (
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
                        count={20}
                        duration={600}
                    />
                </motion.div>
            )}
        </>
    )
}

export const arcaneShiftRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <ArcaneShiftAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 800 // 200ms fade out + 300ms fade in + 700ms effects
}

