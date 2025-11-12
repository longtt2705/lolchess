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

const CleaverProjectile = styled(motion.div)`
  position: absolute;
  width: 32px;
  height: 32px;
  pointer-events: none;
  z-index: 100;
  font-size: 32px;
  filter: drop-shadow(0 0 10px rgba(139, 69, 19, 0.8));
`

const CleaverTrail = styled(motion.div)`
  position: absolute;
  height: 4px;
  background: linear-gradient(90deg, rgba(139, 69, 19, 0.6) 0%, rgba(255, 0, 0, 0.4) 50%, transparent 100%);
  transform-origin: left center;
  pointer-events: none;
  z-index: 99;
  box-shadow: 0 0 8px rgba(139, 69, 19, 0.5);
`

const MissEffect = styled(motion.div)`
  position: absolute;
  font-size: 48px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 
    -2px -2px 0 rgba(0, 0, 0, 0.8),
    2px -2px 0 rgba(0, 0, 0, 0.8),
    -2px 2px 0 rgba(0, 0, 0, 0.8),
    2px 2px 0 rgba(0, 0, 0, 0.8),
    0 0 20px rgba(255, 0, 0, 0.6);
  pointer-events: none;
  z-index: 150;
`

const HealEffect = styled(motion.div)`
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 255, 0, 0.6) 0%, rgba(0, 200, 0, 0.3) 50%, transparent 100%);
  pointer-events: none;
  z-index: 150;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.8);
`

/**
 * Dr. Mundo's Infected Bonesaw animation
 * Shows a cleaver spinning from caster to target
 * On hit: impact particles and heal effect
 * On miss: shows "MISS" text
 */
const InfectedBonesawAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    targetId,
    boardRef,
    isRedPlayer = false
}) => {
    const [showImpact, setShowImpact] = useState(false)
    const [showParticles, setShowParticles] = useState(false)
    const [showMiss, setShowMiss] = useState(false)
    const [showHeal, setShowHeal] = useState(false)

    if (!targetPosition || !targetId) {
        // Fallback if no target
        console.warn('[InfectedBonesaw] Missing targetPosition or targetId:', { targetPosition, targetId })
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

    // Calculate angle for trail rotation and cleaver spin direction
    const deltaX = targetPixels.x - casterPixels.x
    const deltaY = targetPixels.y - casterPixels.y
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Simulate hit/miss for animation purposes (actual hit/miss is determined by backend)
    // For now, we'll show hit effect. Backend should pass miss info if needed.
    const skillHits = true // TODO: Backend should pass this info in config

    return (
        <>
            {/* Trail that extends as cleaver travels */}
            <CleaverTrail
                style={{
                    left: casterPixels.x,
                    top: casterPixels.y,
                    rotate: angle
                }}
                initial={{ width: 0, opacity: 0.8 }}
                animate={{ width: distance, opacity: [0.8, 0] }}
                exit={{ width: 0, opacity: 0 }}
                transition={{
                    duration: 0.5,
                    ease: 'easeOut'
                }}
            />

            {/* Spinning cleaver projectile */}
            <CleaverProjectile
                initial={{
                    x: casterPixels.x - 16,
                    y: casterPixels.y - 16,
                    scale: 0.5,
                    rotate: 0
                }}
                animate={{
                    x: targetPixels.x - 16,
                    y: targetPixels.y - 16,
                    scale: 1,
                    rotate: 720 // Two full spins
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                    duration: 0.5,
                    ease: 'easeInOut'
                }}
                onAnimationComplete={() => {
                    if (skillHits) {
                        setShowImpact(true)
                        setShowParticles(true)
                        // Show heal effect on caster after impact
                        setTimeout(() => {
                            setShowHeal(true)
                        }, 200)
                        // Clean up particles
                        setTimeout(() => {
                            setShowParticles(false)
                        }, 600)
                    } else {
                        setShowMiss(true)
                        setTimeout(() => {
                            setShowMiss(false)
                        }, 800)
                    }
                }}
            >
                🪓
            </CleaverProjectile>

            {/* Impact effect on hit */}
            <ImpactEffect
                style={{
                    left: targetPixels.x - 40,
                    top: targetPixels.y - 40,
                    zIndex: 150,
                    pointerEvents: 'none',
                    background: 'radial-gradient(circle, rgba(255, 100, 100, 0.9) 0%, rgba(139, 69, 19, 0.6) 50%, transparent 100%)'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={showImpact ? {
                    scale: [0, 1.5, 0],
                    opacity: [1, 0.7, 0]
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

            {/* Particle explosion on impact */}
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
                        count={10}
                        duration={500}
                    />
                </motion.div>
            )}

            {/* Miss text effect */}
            {showMiss && (
                <MissEffect
                    style={{
                        left: targetPixels.x - 40,
                        top: targetPixels.y - 60
                    }}
                    initial={{ scale: 0, opacity: 0, y: 0 }}
                    animate={{
                        scale: [0, 1.2, 1],
                        opacity: [0, 1, 1, 0],
                        y: [0, -20]
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                    MISS
                </MissEffect>
            )}

            {/* Heal effect on caster (green pulse) */}
            {showHeal && (
                <HealEffect
                    style={{
                        left: casterPixels.x - 30,
                        top: casterPixels.y - 30
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.5, 2],
                        opacity: [0, 0.8, 0]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    onAnimationComplete={() => {
                        setShowHeal(false)
                    }}
                />
            )}
        </>
    )
}

export const infectedBonesawRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <InfectedBonesawAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1300 // 500ms cleaver travel + 500ms impact/particles + 300ms heal effect
}

