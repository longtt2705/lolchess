import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion, animate } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

const FlashBurst = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 98;
`

const GoldenParticle = styled(motion.div)`
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 1) 0%, rgba(255, 165, 0, 0.8) 50%, rgba(255, 140, 0, 0.4) 100%);
  box-shadow: 
    0 0 20px rgba(255, 215, 0, 0.9),
    0 0 40px rgba(255, 215, 0, 0.6),
    inset 0 0 12px rgba(255, 255, 255, 0.5);
  filter: blur(1px);
`

const TeleportTrail = styled(motion.div)`
  position: absolute;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 215, 0, 0.8) 20%, 
    rgba(255, 165, 0, 1) 50%, 
    rgba(255, 215, 0, 0.8) 80%, 
    transparent 100%
  );
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
  pointer-events: none;
  z-index: 95;
  transform-origin: left center;
`

const FlashGlow = styled(motion.div)`
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.7) 0%, rgba(255, 165, 0, 0.4) 40%, transparent 70%);
  pointer-events: none;
  z-index: 97;
  box-shadow: 
    0 0 40px rgba(255, 215, 0, 0.9),
    inset 0 0 30px rgba(255, 215, 0, 0.6);
`

const ArrivalRing = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(255, 215, 0, 0.8);
  background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 60%);
  pointer-events: none;
  z-index: 96;
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.6);
`

/**
 * Flash summoner spell animation
 * Shows champion teleporting with golden flash effect
 */
const FlashAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    casterId,
    boardRef,
    isRedPlayer = false
}) => {
    const [showArrival, setShowArrival] = useState(false)

    if (!targetPosition) {
        console.warn('[Flash] Missing targetPosition:', { targetPosition })
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

    // Calculate angle and distance for the energy trail
    const deltaX = targetPixels.x - casterPixels.x
    const deltaY = targetPixels.y - casterPixels.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Generate golden particles spiraling outward from departure point
    const numParticles = 8
    const particlePositions = Array.from({ length: numParticles }, (_, i) => {
        const angleOffset = (i / numParticles) * 360
        const radius = 35
        return {
            x: casterPixels.x + Math.cos((angleOffset * Math.PI) / 180) * radius,
            y: casterPixels.y + Math.sin((angleOffset * Math.PI) / 180) * radius,
            delay: i * 0.02
        }
    })

    // Animate champion teleporting to the target position
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
                        opacity: [1, 0.5, 0],
                        scale: [1, 0.9, 0.7]
                    },
                    {
                        duration: 0.15,
                        ease: 'easeIn'
                    }
                )

                fadeOut.then(() => {
                    // Show arrival effects
                    setShowArrival(true)

                    // Fade in at destination with position change
                    animate(
                        pieceElement,
                        {
                            x: teleportOffsetX,
                            y: teleportOffsetY,
                            opacity: [0, 0.5, 1],
                            scale: [0.7, 1.2, 1]
                        },
                        {
                            duration: 0.25,
                            ease: 'easeOut'
                        }
                    )

                    // Clean up effects after duration
                    setTimeout(() => {
                        setShowArrival(false)
                    }, 600)
                })

                return () => {
                    fadeOut.stop()
                }
            }
        }
    }, [casterId, targetPixels.x, targetPixels.y, casterPixels.x, casterPixels.y])

    return (
        <>
            {/* Departure golden flash */}
            <FlashGlow
                style={{
                    left: casterPixels.x - 50,
                    top: casterPixels.y - 50
                }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: [0, 1.4, 0], opacity: [0.8, 0.7, 0] }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Spiraling golden particles at departure */}
            <FlashBurst>
                {particlePositions.map((pos, i) => (
                    <GoldenParticle
                        key={i}
                        style={{
                            left: casterPixels.x - 8,
                            top: casterPixels.y - 8
                        }}
                        initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                        animate={{
                            scale: [0, 1.2, 0.6],
                            opacity: [0, 1, 0],
                            x: [0, pos.x - casterPixels.x],
                            y: [0, pos.y - casterPixels.y]
                        }}
                        transition={{
                            duration: 0.4,
                            delay: pos.delay,
                            ease: 'easeOut'
                        }}
                    />
                ))}
            </FlashBurst>

            {/* Golden energy trail connecting departure and arrival */}
            <TeleportTrail
                style={{
                    left: casterPixels.x,
                    top: casterPixels.y,
                    width: distance,
                    transform: `rotate(${angle}deg)`,
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
            />

            {/* Arrival golden flash */}
            {showArrival && (
                <FlashGlow
                    style={{
                        left: targetPixels.x - 50,
                        top: targetPixels.y - 50
                    }}
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: [0, 1.6, 1.2], opacity: [0.8, 0.7, 0] }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            )}

            {/* Arrival expanding rings */}
            {showArrival && [0, 1, 2].map((ringIndex) => (
                <ArrivalRing
                    key={`ring-${ringIndex}`}
                    style={{
                        left: targetPixels.x - 40,
                        top: targetPixels.y - 40,
                        width: 80,
                        height: 80
                    }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                        scale: [0.5, 2],
                        opacity: [0.8, 0]
                    }}
                    transition={{ duration: 0.6, delay: ringIndex * 0.1, ease: 'easeOut' }}
                />
            ))}

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
                        count={16}
                        duration={500}
                    />
                </motion.div>
            )}
        </>
    )
}

export const flashRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <FlashAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 700 // 150ms fade out + 250ms fade in + 600ms effects
}
