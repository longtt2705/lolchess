import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ParticleEffectComponent
} from '../types'

const MarkContainer = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 100;
`

const ShadowProjectile = styled(motion.div)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(88, 44, 131, 1) 0%, rgba(44, 22, 66, 0.9) 50%, rgba(22, 11, 33, 0.7) 100%);
  box-shadow: 
    0 0 25px rgba(88, 44, 131, 0.9),
    0 0 50px rgba(88, 44, 131, 0.6),
    inset 0 0 15px rgba(0, 0, 0, 0.8);
  filter: blur(1.5px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`

const MarkSymbol = styled(motion.div)`
  position: absolute;
  width: 60px;
  height: 60px;
  pointer-events: none;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  text-shadow: 
    0 0 10px rgba(88, 44, 131, 1),
    0 0 20px rgba(88, 44, 131, 0.8),
    0 0 30px rgba(88, 44, 131, 0.6);
`

const MarkRing = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid rgba(88, 44, 131, 0.9);
  background: radial-gradient(circle, rgba(88, 44, 131, 0.3) 0%, transparent 70%);
  pointer-events: none;
  z-index: 98;
  box-shadow: 
    0 0 30px rgba(88, 44, 131, 0.8),
    inset 0 0 20px rgba(88, 44, 131, 0.5);
`

const ShadowAura = styled(motion.div)`
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(44, 22, 66, 0.7) 0%, rgba(22, 11, 33, 0.4) 50%, transparent 100%);
  pointer-events: none;
  z-index: 97;
  box-shadow: 0 0 50px rgba(88, 44, 131, 0.9);
`

const ExplosionWave = styled(motion.div)`
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid rgba(88, 44, 131, 1);
  background: radial-gradient(circle, rgba(88, 44, 131, 0.6) 0%, transparent 70%);
  pointer-events: none;
  z-index: 100;
  box-shadow: 
    0 0 40px rgba(88, 44, 131, 1),
    inset 0 0 30px rgba(88, 44, 131, 0.8);
`

const ShadowParticle = styled(motion.div)`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(88, 44, 131, 1) 0%, rgba(44, 22, 66, 0.8) 100%);
  box-shadow: 0 0 15px rgba(88, 44, 131, 0.9);
  pointer-events: none;
`

/**
 * Zed's Death Mark animation
 * Shows a dark projectile traveling to the target, marking them with a shadowy symbol
 * The mark appears with expanding dark rings
 */
const DeathMarkAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    boardRef,
    isRedPlayer = false
}) => {
    const [showMark, setShowMark] = useState(false)
    const [showExplosion, setShowExplosion] = useState(false)

    if (!targetPosition) {
        console.warn('[DeathMark] Missing targetPosition:', { targetPosition })
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

    // Calculate angle for projectile rotation
    const deltaX = targetPixels.x - casterPixels.x
    const deltaY = targetPixels.y - casterPixels.y
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Trigger mark appearance after projectile arrives
    useEffect(() => {
        const markTimer = setTimeout(() => {
            setShowMark(true)
        }, 500) // Projectile travel time

        return () => clearTimeout(markTimer)
    }, [])

    // Generate shadow particles for explosion effect
    const particleCount = 12
    const shadowParticles = Array.from({ length: particleCount }, (_, i) => {
        const particleAngle = (i / particleCount) * Math.PI * 2
        const distance = 60
        return {
            angle: particleAngle,
            distance,
            delay: i * 0.02
        }
    })

    return (
        <>
            {/* Shadow aura at caster position */}
            <ShadowAura
                style={{
                    left: casterPixels.x - 50,
                    top: casterPixels.y - 50
                }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: [0, 1.2, 0], opacity: [0.8, 0.5, 0] }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Shadow projectile traveling to target */}
            <MarkContainer
                initial={{
                    x: casterPixels.x - 20,
                    y: casterPixels.y - 20,
                    scale: 0,
                    opacity: 0,
                    rotate: angle
                }}
                animate={{
                    x: targetPixels.x - 20,
                    y: targetPixels.y - 20,
                    scale: [0, 1.2, 1],
                    opacity: [0, 1, 1],
                    rotate: angle + 360
                }}
                transition={{
                    duration: 0.5,
                    ease: [0.4, 0, 0.2, 1]
                }}
            >
                <ShadowProjectile>
                    💀
                </ShadowProjectile>
            </MarkContainer>

            {/* Mark symbol appearing on target */}
            {showMark && (
                <>
                    {/* Dark energy explosion at impact */}
                    <ShadowAura
                        style={{
                            left: targetPixels.x - 50,
                            top: targetPixels.y - 50
                        }}
                        initial={{ scale: 0, opacity: 0.9 }}
                        animate={{ scale: [0, 1.5, 1.2], opacity: [0.9, 0.6, 0] }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />

                    {/* Expanding mark ring 1 */}
                    <MarkRing
                        style={{
                            left: targetPixels.x - 40,
                            top: targetPixels.y - 40
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{
                            scale: [0, 1.2, 1],
                            opacity: [1, 0.8, 0.6]
                        }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />

                    {/* Expanding mark ring 2 */}
                    <MarkRing
                        style={{
                            left: targetPixels.x - 40,
                            top: targetPixels.y - 40
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{
                            scale: [0, 1.5, 1.3],
                            opacity: [1, 0.6, 0]
                        }}
                        transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                    />

                    {/* Death Mark symbol */}
                    <MarkSymbol
                        style={{
                            left: targetPixels.x - 30,
                            top: targetPixels.y - 30
                        }}
                        initial={{ scale: 0, opacity: 0, rotate: 0 }}
                        animate={{
                            scale: [0, 1.3, 1],
                            opacity: [0, 1, 0.9],
                            rotate: [0, 180, 360]
                        }}
                        transition={{ duration: 0.7, ease: 'backOut' }}
                    >
                        ☠️
                    </MarkSymbol>

                    {/* Shadow particles exploding outward */}
                    {shadowParticles.map((particle, i) => (
                        <ShadowParticle
                            key={i}
                            style={{
                                left: targetPixels.x - 5,
                                top: targetPixels.y - 5
                            }}
                            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                            animate={{
                                x: Math.cos(particle.angle) * particle.distance,
                                y: Math.sin(particle.angle) * particle.distance,
                                scale: [0, 1.2, 0],
                                opacity: [1, 0.8, 0]
                            }}
                            transition={{
                                duration: 0.8,
                                delay: particle.delay,
                                ease: 'easeOut'
                            }}
                        />
                    ))}

                    {/* Final pulse effect */}
                    <ExplosionWave
                        style={{
                            left: targetPixels.x - 60,
                            top: targetPixels.y - 60
                        }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{
                            scale: [0, 1, 1.2],
                            opacity: [1, 0.7, 0]
                        }}
                        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    />
                </>
            )}
        </>
    )
}

export const deathMarkRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <DeathMarkAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1500 // 500ms projectile + 800ms mark effects + 200ms buffer
}

