import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion, animate } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ImpactEffect,
    ParticleEffectComponent
} from '../types'

const HookProjectile = styled(motion.div)`
  position: absolute;
  width: 24px;
  height: 24px;
  pointer-events: none;
  z-index: 100;
  font-size: 24px;
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
`

const HookChain = styled(motion.div)`
  position: absolute;
  height: 3px;
  background: linear-gradient(90deg, rgba(200, 155, 60, 0.8) 0%, rgba(255, 215, 0, 0.6) 100%);
  transform-origin: left center;
  pointer-events: none;
  z-index: 99;
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.6);
`

/**
 * Blitzcrank's Rocket Grab animation
 * Shows a hook projectile traveling from caster to target with a chain trailing behind
 * Then pulls the actual target piece back along with the hook
 */
const RocketGrabAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    targetId,
    pulledToPosition,
    boardRef,
    isRedPlayer = false
}) => {
    const [showImpact, setShowImpact] = useState(false)
    const [showParticles, setShowParticles] = useState(false)
    const [showPull, setShowPull] = useState(false)


    if (!targetPosition || !targetId) {
        // Fallback if no target
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

    // Calculate angle for chain rotation
    const deltaX = targetPixels.x - casterPixels.x
    const deltaY = targetPixels.y - casterPixels.y
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Use the actual pulled position from backend if provided, otherwise calculate it
    let pullDestPixels: { x: number; y: number }

    if (pulledToPosition) {
        // Backend told us exactly where the target was pulled to
        pullDestPixels = getPixelPosition(pulledToPosition, boardRef, isRedPlayer)
    } else {
        // Fallback: calculate pull destination (same as before for backward compatibility)
        const chessDirectionX = casterPosition.x - targetPosition.x
        const chessDirectionY = casterPosition.y - targetPosition.y
        const dirX = chessDirectionX === 0 ? 0 : chessDirectionX / Math.abs(chessDirectionX)
        const dirY = chessDirectionY === 0 ? 0 : chessDirectionY / Math.abs(chessDirectionY)
        const newTargetPosition = {
            x: targetPosition.x + dirX,
            y: targetPosition.y + dirY
        }
        pullDestPixels = getPixelPosition(newTargetPosition, boardRef, isRedPlayer)
    }

    // Animate the actual target piece when pull starts
    useEffect(() => {
        if (showPull && targetId) {

            // Find the target piece element by ID
            // The piece is rendered inside a div with data-piece-id attribute
            const pieceElement = document.querySelector(`[data-piece-id="${targetId}"]`)


            if (pieceElement && pieceElement instanceof HTMLElement) {
                // Calculate the pull offset relative to the piece's current position
                const pullOffsetX = pullDestPixels.x - targetPixels.x
                const pullOffsetY = pullDestPixels.y - targetPixels.y


                // Animate the piece
                const controls = animate(
                    pieceElement,
                    {
                        x: [0, pullOffsetX],
                        y: [0, pullOffsetY],
                        scale: [1, 1.1, 1]
                    },
                    {
                        duration: 0.5,
                        ease: 'easeInOut'
                    }
                )

                // Cleanup: stop animation if component unmounts early
                return () => {
                    controls.stop()
                    // Let React handle the re-render after state swap
                    // Don't manually clear transforms - causes positioning issues
                }
            } else {
            }
        }
    }, [showPull, targetId, pullDestPixels.x, pullDestPixels.y, targetPixels.x, targetPixels.y])


    return (
        <>
            {/* Chain that extends as hook travels out, then retracts */}
            <HookChain
                style={{
                    left: casterPixels.x,
                    top: casterPixels.y,
                    rotate: angle
                }}
                initial={{ width: 0 }}
                animate={showPull ? {
                    width: Math.sqrt(
                        Math.pow(pullDestPixels.x - casterPixels.x, 2) +
                        Math.pow(pullDestPixels.y - casterPixels.y, 2)
                    )
                } : { width: distance }}
                exit={{ width: 0 }}
                transition={{
                    duration: 0.5,
                    ease: 'easeInOut'
                }}
            />

            {/* Hook projectile - extends out, then returns with target */}
            <HookProjectile
                initial={{ x: casterPixels.x - 12, y: casterPixels.y - 12, scale: 0.5, rotate: angle }}
                animate={showPull ? {
                    x: pullDestPixels.x - 12,
                    y: pullDestPixels.y - 12,
                    scale: 1,
                    rotate: angle + 180 // Reverse direction
                } : {
                    x: targetPixels.x - 12,
                    y: targetPixels.y - 12,
                    scale: 1,
                    rotate: angle + 360 // Add spin during travel
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                    duration: 0.5,
                    ease: 'easeInOut'
                }}
                onAnimationComplete={() => {
                    if (!showPull) {
                        setShowImpact(true)
                        setShowParticles(true)
                        // Wait a moment before starting pull
                        setTimeout(() => {
                            setShowPull(true)
                        }, 100)
                        // Clean up particles after their duration
                        setTimeout(() => {
                            setShowParticles(false)
                        }, 600)
                    }
                }}
            >
                🪝
            </HookProjectile>

            {/* Impact effect on hit - always rendered, animated based on state */}
            <ImpactEffect
                style={{
                    left: targetPixels.x - 40,
                    top: targetPixels.y - 40,
                    zIndex: 150,
                    pointerEvents: 'none'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={showImpact ? {
                    scale: [0, 1.5, 0],
                    opacity: [1, 0.5, 0]
                } : {
                    scale: 0,
                    opacity: 0
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                onAnimationComplete={() => {
                    if (showImpact) {
                        setShowImpact(false)
                    }
                }}
            />

            {/* Particle explosion on impact - conditionally rendered */}
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
                        count={12}
                        duration={500}
                    />
                </motion.div>
            )}
        </>
    )
}

export const rocketGrabRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <RocketGrabAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1200 // 500ms hook out + 100ms pause + 500ms pull back + 100ms buffer for state swap
}



