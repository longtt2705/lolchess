import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition
} from '../types'

const SpectralAura = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(91, 192, 222, 0.4) 0%, 
    rgba(135, 206, 235, 0.3) 40%, 
    rgba(255, 255, 255, 0.2) 70%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 97;
  box-shadow: 
    0 0 40px rgba(91, 192, 222, 0.6),
    inset 0 0 30px rgba(255, 255, 255, 0.3);
  filter: blur(2px);
`

const GhostWave = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(135, 206, 235, 0.6);
  background: transparent;
  pointer-events: none;
  z-index: 96;
  box-shadow: 0 0 20px rgba(91, 192, 222, 0.5);
`

const SpeedParticle = styled(motion.div)`
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(135, 206, 235, 0.6) 50%, rgba(91, 192, 222, 0.3) 100%);
  box-shadow: 
    0 0 15px rgba(255, 255, 255, 0.8),
    0 0 25px rgba(135, 206, 235, 0.5);
  pointer-events: none;
  z-index: 98;
`

const GhostGlow = styled(motion.div)`
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(255, 255, 255, 0.3) 0%, 
    rgba(135, 206, 235, 0.25) 30%,
    rgba(91, 192, 222, 0.15) 60%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 95;
  box-shadow: 
    0 0 50px rgba(135, 206, 235, 0.7),
    inset 0 0 40px rgba(255, 255, 255, 0.4);
  filter: blur(3px);
`

const SpectralTrail = styled(motion.div)`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, rgba(135, 206, 235, 0.4) 100%);
  box-shadow: 0 0 10px rgba(135, 206, 235, 0.6);
  pointer-events: none;
  z-index: 94;
`

/**
 * Ghost summoner spell animation
 * Shows champion becoming spectral with blue/white ghostly aura and speed effects
 */
const GhostAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    boardRef,
    isRedPlayer = false
}) => {
    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)

    // Generate speed particles trailing behind
    const numSpeedParticles = 12
    const speedParticles = Array.from({ length: numSpeedParticles }, (_, i) => {
        const angle = (i / numSpeedParticles) * 360
        const radius = 45
        return {
            x: casterPixels.x + Math.cos((angle * Math.PI) / 180) * radius,
            y: casterPixels.y + Math.sin((angle * Math.PI) / 180) * radius,
            delay: i * 0.04,
            angle: angle
        }
    })

    // Generate spectral trail particles
    const numTrailParticles = 8
    const trailParticles = Array.from({ length: numTrailParticles }, (_, i) => {
        const angle = (i / numTrailParticles) * 360
        const startRadius = 30
        const endRadius = 60
        return {
            startX: casterPixels.x + Math.cos((angle * Math.PI) / 180) * startRadius,
            startY: casterPixels.y + Math.sin((angle * Math.PI) / 180) * startRadius,
            endX: casterPixels.x + Math.cos((angle * Math.PI) / 180) * endRadius,
            endY: casterPixels.y + Math.sin((angle * Math.PI) / 180) * endRadius,
            delay: i * 0.05
        }
    })

    return (
        <>
            {/* Central ghostly glow */}
            <GhostGlow
                style={{
                    left: casterPixels.x - 60,
                    top: casterPixels.y - 60
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                    scale: [0, 1.2, 1], 
                    opacity: [0, 0.8, 0.6] 
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            />

            {/* Pulsing spectral aura */}
            <SpectralAura
                style={{
                    left: casterPixels.x - 50,
                    top: casterPixels.y - 50,
                    width: 100,
                    height: 100
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: [0, 1, 1.1, 1],
                    opacity: [0, 0.8, 0.6, 0.8]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut'
                }}
            />

            {/* Expanding ghost waves */}
            {[0, 1, 2, 3].map((waveIndex) => (
                <GhostWave
                    key={`wave-${waveIndex}`}
                    style={{
                        left: casterPixels.x - 40,
                        top: casterPixels.y - 40,
                        width: 80,
                        height: 80
                    }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                        scale: [0.5, 2.5],
                        opacity: [0.8, 0]
                    }}
                    transition={{
                        duration: 1.2,
                        delay: waveIndex * 0.2,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Speed particles orbiting around caster */}
            {speedParticles.map((particle, i) => (
                <SpeedParticle
                    key={`speed-${i}`}
                    style={{
                        left: casterPixels.x - 6,
                        top: casterPixels.y - 6
                    }}
                    initial={{ 
                        x: 0, 
                        y: 0, 
                        scale: 0, 
                        opacity: 0 
                    }}
                    animate={{
                        x: [0, particle.x - casterPixels.x, 0],
                        y: [0, particle.y - casterPixels.y, 0],
                        scale: [0, 1, 0.8, 0],
                        opacity: [0, 1, 0.8, 0]
                    }}
                    transition={{
                        duration: 0.8,
                        delay: particle.delay,
                        ease: 'easeInOut'
                    }}
                />
            ))}

            {/* Spectral trail particles moving outward */}
            {trailParticles.map((particle, i) => (
                <SpectralTrail
                    key={`trail-${i}`}
                    initial={{
                        x: particle.startX - 4,
                        y: particle.startY - 4,
                        scale: 1,
                        opacity: 0
                    }}
                    animate={{
                        x: particle.endX - 4,
                        y: particle.endY - 4,
                        scale: [1, 0.5, 0],
                        opacity: [0, 0.9, 0.7, 0]
                    }}
                    transition={{
                        duration: 0.9,
                        delay: particle.delay,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Additional pulsing glow effect */}
            <motion.div
                style={{
                    position: 'absolute',
                    left: casterPixels.x - 35,
                    top: casterPixels.y - 35,
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(135, 206, 235, 0.2) 50%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 99,
                    boxShadow: '0 0 30px rgba(255, 255, 255, 0.5)',
                    filter: 'blur(4px)'
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                    scale: [0.8, 1.2, 0.9, 1.2],
                    opacity: [0, 0.9, 0.7, 0.5]
                }}
                transition={{
                    duration: 1,
                    ease: 'easeInOut'
                }}
            />
        </>
    )
}

export const ghostRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <GhostAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1000 // 500ms initial effect + 500ms sustained ghostly presence
}
