import React, { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ImpactEffect
} from '../types'

// Yasuo's wind colors - cyan/teal theme
const WIND_PRIMARY = '#00bcd4'
const WIND_SECONDARY = '#00e5ff'
const WIND_GLOW = '#80deea'

// Tornado core - spinning wind effect
const TornadoCore = styled(motion.div)`
  position: absolute;
  width: 40px;
  height: 40px;
  pointer-events: none;
  z-index: 100;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(0, 229, 255, 0.9) 0%, 
    rgba(0, 188, 212, 0.7) 40%, 
    rgba(128, 222, 234, 0.4) 70%,
    transparent 100%
  );
  box-shadow: 
    0 0 20px rgba(0, 229, 255, 0.8),
    0 0 40px rgba(0, 188, 212, 0.5),
    inset 0 0 15px rgba(255, 255, 255, 0.6);
`

// Spinning wind arcs around the tornado
const WindArc = styled(motion.div)`
  position: absolute;
  width: 50px;
  height: 6px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(0, 229, 255, 0.8) 20%,
    rgba(255, 255, 255, 0.9) 50%,
    rgba(0, 229, 255, 0.8) 80%,
    transparent 100%
  );
  border-radius: 3px;
  transform-origin: center center;
  pointer-events: none;
  z-index: 101;
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.8);
`

// Wind trail behind the tornado
const WindTrail = styled(motion.div)`
  position: absolute;
  height: 6px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(0, 188, 212, 0.5) 30%, 
    rgba(0, 229, 255, 0.7) 70%,
    transparent 100%
  );
  transform-origin: left center;
  pointer-events: none;
  z-index: 98;
  box-shadow: 0 0 8px rgba(0, 188, 212, 0.5);
`

// Shield effect on Yasuo
const ShieldEffect = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(0, 229, 255, 0.4) 0%, 
    rgba(0, 188, 212, 0.2) 50%,
    transparent 70%
  );
  border: 2px solid rgba(0, 229, 255, 0.8);
  pointer-events: none;
  z-index: 105;
  box-shadow: 
    0 0 20px rgba(0, 229, 255, 0.6),
    inset 0 0 15px rgba(0, 229, 255, 0.4);
`

// Wind particle for swirling effect
const WindParticle = styled(motion.div)`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(255, 255, 255, 1) 0%, 
    rgba(0, 229, 255, 1) 50%, 
    rgba(0, 188, 212, 0.8) 100%
  );
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.9);
  pointer-events: none;
  z-index: 102;
`

// Impact burst when hitting an enemy
const ImpactBurst = styled(motion.div)`
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(255, 255, 255, 0.9) 0%, 
    rgba(0, 229, 255, 0.6) 40%, 
    transparent 70%
  );
  pointer-events: none;
  z-index: 150;
  box-shadow: 0 0 25px rgba(0, 229, 255, 0.8);
`

/**
 * Yasuo's Way of the Wanderer animation
 * Shows a whirlwind traveling from caster in the attack direction,
 * hitting all enemies in the line with impact effects
 */
const WayOfTheWandererAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    whirlwindTargets,
    boardRef,
    isRedPlayer = false
}) => {
    const [showShield, setShowShield] = useState(false)
    const [impactedTargets, setImpactedTargets] = useState<Set<string>>(new Set())
    const [tornadoProgress, setTornadoProgress] = useState(0)

    console.log('[WayOfTheWanderer] Animation component rendered with:', { 
        casterPosition, 
        targetPosition, 
        whirlwindTargets,
        isRedPlayer 
    })

    if (!targetPosition) {
        console.warn('[WayOfTheWanderer] Missing targetPosition')
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

    // Calculate direction from caster to target
    const deltaX = targetPosition.x - casterPosition.x
    const deltaY = targetPosition.y - casterPosition.y

    // Normalize direction
    const stepX = deltaX === 0 ? 0 : deltaX > 0 ? 1 : -1
    const stepY = deltaY === 0 ? 0 : deltaY > 0 ? 1 : -1

    // Calculate the farthest point on the board in this direction
    const getFarthestPoint = () => {
        let x = casterPosition.x
        let y = casterPosition.y

        // Keep moving until we hit the board edge
        while (true) {
            const nextX = x + stepX
            const nextY = y + stepY

            // Check board bounds (main board: 0-7, special positions: -1,4 and 8,3)
            const isMainBoard = nextX >= 0 && nextX <= 7 && nextY >= 0 && nextY <= 7
            const isBlueBase = nextX === -1 && nextY === 4
            const isRedBase = nextX === 8 && nextY === 3

            if (isMainBoard || isBlueBase || isRedBase) {
                x = nextX
                y = nextY
            } else {
                break
            }
        }

        return { x, y }
    }

    const farthestPoint = getFarthestPoint()
    const endPixels = getPixelPosition(farthestPoint, boardRef, isRedPlayer)

    // Calculate angle for rotation
    const visualDeltaX = endPixels.x - casterPixels.x
    const visualDeltaY = endPixels.y - casterPixels.y
    const angle = Math.atan2(visualDeltaY, visualDeltaX) * (180 / Math.PI)
    const totalDistance = Math.sqrt(visualDeltaX * visualDeltaX + visualDeltaY * visualDeltaY)

    // Calculate target positions for impacts
    const targetPixelsList = useMemo(() => {
        if (!whirlwindTargets) return []
        return whirlwindTargets.map(target => ({
            id: target.targetId,
            pixels: getPixelPosition(target.targetPosition, boardRef, isRedPlayer),
            position: target.targetPosition
        }))
    }, [whirlwindTargets, boardRef, isRedPlayer])

    // Create spinning arcs around the tornado
    const arcCount = 4
    const arcs = Array.from({ length: arcCount }, (_, i) => ({
        id: i,
        startAngle: (i / arcCount) * 360,
    }))

    // Create wind particles
    const particleCount = 12
    const particles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        angle: (i / particleCount) * Math.PI * 2,
        distance: 20 + Math.random() * 15,
        delay: i * 0.03,
    }))

    // Show shield on caster after tornado starts
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowShield(true)
        }, 100)

        return () => clearTimeout(timer)
    }, [])

    // Check for impacts as tornado progresses
    useEffect(() => {
        if (tornadoProgress > 0 && targetPixelsList.length > 0) {
            const currentX = casterPixels.x + visualDeltaX * tornadoProgress
            const currentY = casterPixels.y + visualDeltaY * tornadoProgress

            targetPixelsList.forEach(target => {
                if (!impactedTargets.has(target.id)) {
                    // Check if tornado has passed this target
                    const targetDistance = Math.sqrt(
                        Math.pow(target.pixels.x - casterPixels.x, 2) +
                        Math.pow(target.pixels.y - casterPixels.y, 2)
                    )
                    const currentTornadoDistance = totalDistance * tornadoProgress

                    if (currentTornadoDistance >= targetDistance - 20) {
                        setImpactedTargets(prev => new Set([...prev, target.id]))
                    }
                }
            })
        }
    }, [tornadoProgress, targetPixelsList, casterPixels, visualDeltaX, visualDeltaY, totalDistance, impactedTargets])

    return (
        <>
            {/* Wind trail extending from caster to tornado */}
            <WindTrail
                style={{
                    left: casterPixels.x,
                    top: casterPixels.y - 3,
                    rotate: angle
                }}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: totalDistance, opacity: [0, 0.8, 0.6, 0.3] }}
                transition={{
                    duration: 0.8,
                    ease: 'easeOut'
                }}
            />

            {/* Main tornado projectile */}
            <TornadoCore
                initial={{
                    x: casterPixels.x - 20,
                    y: casterPixels.y - 20,
                    scale: 0.3,
                    opacity: 0
                }}
                animate={{
                    x: endPixels.x - 20,
                    y: endPixels.y - 20,
                    scale: [0.3, 1.2, 1, 1.1, 1],
                    opacity: [0, 1, 1, 0.9, 0.7]
                }}
                transition={{
                    duration: 0.8,
                    ease: 'easeOut'
                }}
                onUpdate={(latest) => {
                    // Track progress for impact detection
                    if (typeof latest.x === 'number') {
                        const progressX = (latest.x - (casterPixels.x - 20)) / visualDeltaX
                        setTornadoProgress(Math.min(1, Math.max(0, progressX || 0)))
                    }
                }}
            />

            {/* Spinning wind arcs around tornado */}
            {arcs.map((arc) => (
                <motion.div
                    key={`arc-${arc.id}`}
                    style={{
                        position: 'absolute',
                        pointerEvents: 'none',
                        zIndex: 101
                    }}
                    initial={{
                        x: casterPixels.x - 25,
                        y: casterPixels.y - 3
                    }}
                    animate={{
                        x: endPixels.x - 25,
                        y: endPixels.y - 3
                    }}
                    transition={{
                        duration: 0.8,
                        ease: 'easeOut'
                    }}
                >
                    <WindArc
                        initial={{
                            rotate: arc.startAngle,
                            opacity: 0,
                            scale: 0.5
                        }}
                        animate={{
                            rotate: [arc.startAngle, arc.startAngle + 1080],
                            opacity: [0, 1, 1, 0.7],
                            scale: [0.5, 1, 1, 0.8]
                        }}
                        transition={{
                            duration: 0.8,
                            ease: 'linear'
                        }}
                    />
                </motion.div>
            ))}

            {/* Wind particles spiraling around tornado */}
            {particles.map((particle) => (
                <motion.div
                    key={`particle-${particle.id}`}
                    style={{
                        position: 'absolute',
                        pointerEvents: 'none',
                        zIndex: 102
                    }}
                    initial={{
                        x: casterPixels.x,
                        y: casterPixels.y
                    }}
                    animate={{
                        x: endPixels.x,
                        y: endPixels.y
                    }}
                    transition={{
                        duration: 0.8,
                        ease: 'easeOut',
                        delay: particle.delay
                    }}
                >
                    <WindParticle
                        initial={{
                            x: 0,
                            y: 0,
                            scale: 0,
                            opacity: 0
                        }}
                        animate={{
                            x: [
                                Math.cos(particle.angle) * particle.distance,
                                Math.cos(particle.angle + Math.PI) * particle.distance,
                                Math.cos(particle.angle + 2 * Math.PI) * particle.distance
                            ],
                            y: [
                                Math.sin(particle.angle) * particle.distance,
                                Math.sin(particle.angle + Math.PI) * particle.distance,
                                Math.sin(particle.angle + 2 * Math.PI) * particle.distance
                            ],
                            scale: [0, 1, 0.8, 0],
                            opacity: [0, 1, 0.8, 0]
                        }}
                        transition={{
                            duration: 0.8,
                            ease: 'linear'
                        }}
                    />
                </motion.div>
            ))}

            {/* Impact effects on each target hit */}
            {targetPixelsList.map((target) => (
                <ImpactBurst
                    key={`impact-${target.id}`}
                    style={{
                        left: target.pixels.x - 30,
                        top: target.pixels.y - 30
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={impactedTargets.has(target.id) ? {
                        scale: [0, 1.5, 0],
                        opacity: [0, 1, 0]
                    } : {
                        scale: 0,
                        opacity: 0
                    }}
                    transition={{
                        duration: 0.4,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Shield effect on caster */}
            {showShield && (
                <ShieldEffect
                    style={{
                        left: casterPixels.x - 45,
                        top: casterPixels.y - 45,
                        width: 90,
                        height: 90
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.3, 1],
                        opacity: [0, 0.9, 0.6, 0]
                    }}
                    transition={{
                        duration: 0.8,
                        ease: 'easeOut'
                    }}
                />
            )}
        </>
    )
}

export const wayOfTheWandererRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <WayOfTheWandererAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1000 // 800ms tornado travel + 200ms buffer for impacts
}

