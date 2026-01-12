import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition
} from '../types'

const LightningBolt = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 100;
  background: linear-gradient(180deg,
    rgba(30, 144, 255, 0) 0%,
    rgba(30, 144, 255, 0.9) 10%,
    rgba(65, 105, 225, 1) 30%,
    rgba(0, 191, 255, 1) 50%,
    rgba(65, 105, 225, 1) 70%,
    rgba(30, 144, 255, 0.9) 90%,
    rgba(30, 144, 255, 0) 100%
  );
  box-shadow: 
    0 0 20px rgba(30, 144, 255, 0.9),
    0 0 40px rgba(65, 105, 225, 0.7),
    inset 0 0 15px rgba(255, 255, 255, 0.6);
  filter: blur(1px);
`

const LightningBranch = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 99;
  background: linear-gradient(135deg,
    rgba(30, 144, 255, 0.8) 0%,
    rgba(0, 191, 255, 0.6) 50%,
    rgba(30, 144, 255, 0) 100%
  );
  box-shadow: 0 0 15px rgba(30, 144, 255, 0.7);
  filter: blur(0.5px);
`

const ElectricParticle = styled(motion.div)`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(30, 144, 255, 0.8) 50%, rgba(0, 191, 255, 0.6) 100%);
  box-shadow: 
    0 0 15px rgba(30, 144, 255, 0.9),
    0 0 25px rgba(0, 191, 255, 0.7),
    inset 0 0 8px rgba(255, 255, 255, 0.8);
  pointer-events: none;
  z-index: 101;
`

const ImpactShockwave = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(30, 144, 255, 0.9);
  background: radial-gradient(circle, rgba(0, 191, 255, 0.5) 0%, rgba(30, 144, 255, 0.3) 40%, transparent 70%);
  pointer-events: none;
  z-index: 98;
  box-shadow: 
    0 0 30px rgba(30, 144, 255, 0.8),
    inset 0 0 20px rgba(0, 191, 255, 0.6);
`

const ElectricCrackle = styled(motion.div)`
  position: absolute;
  width: 3px;
  height: 20px;
  background: linear-gradient(180deg,
    rgba(255, 255, 255, 1) 0%,
    rgba(30, 144, 255, 0.9) 50%,
    rgba(0, 191, 255, 0) 100%
  );
  pointer-events: none;
  z-index: 97;
  box-shadow: 0 0 10px rgba(30, 144, 255, 0.8);
`

const LightningGlow = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255, 255, 255, 0.7) 0%,
    rgba(30, 144, 255, 0.5) 30%,
    rgba(0, 191, 255, 0.3) 60%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 96;
  box-shadow: 
    0 0 50px rgba(30, 144, 255, 0.8),
    inset 0 0 40px rgba(255, 255, 255, 0.5);
  filter: blur(3px);
`

/**
 * Smite summoner spell animation
 * Shows blue lightning bolt striking down from above with electric particles
 */
const SmiteAnimation: React.FC<SkillAnimationConfig> = ({
    targetPosition,
    boardRef,
    isRedPlayer = false
}) => {
    if (!targetPosition) {
        console.warn('[Smite] Missing targetPosition:', { targetPosition })
        return null
    }

    const targetPixels = getPixelPosition(targetPosition, boardRef, isRedPlayer)

    // Lightning bolt starts from top of screen
    const lightningStartY = -100
    const lightningHeight = targetPixels.y - lightningStartY + 20

    // Generate lightning branches
    const numBranches = 6
    const lightningBranches = Array.from({ length: numBranches }, (_, i) => {
        const yPos = lightningStartY + (lightningHeight * (0.2 + i * 0.15))
        const xOffset = (Math.random() - 0.5) * 60
        const angle = Math.random() * 60 - 30 // Random angle between -30 and 30
        const length = 20 + Math.random() * 30
        return {
            x: targetPixels.x + xOffset,
            y: yPos,
            angle: angle,
            length: length,
            delay: 0.05 + i * 0.02
        }
    })

    // Generate electric particles spreading from impact
    const numParticles = 16
    const electricParticles = Array.from({ length: numParticles }, (_, i) => {
        const angle = (i / numParticles) * 360
        const distance = 40 + Math.random() * 20
        return {
            x: targetPixels.x + Math.cos((angle * Math.PI) / 180) * distance,
            y: targetPixels.y + Math.sin((angle * Math.PI) / 180) * distance,
            delay: i * 0.02
        }
    })

    // Generate electric crackles radiating outward
    const numCrackles = 12
    const electricCrackles = Array.from({ length: numCrackles }, (_, i) => {
        const angle = (i / numCrackles) * 360
        const distance = 35
        return {
            x: targetPixels.x + Math.cos((angle * Math.PI) / 180) * distance,
            y: targetPixels.y + Math.sin((angle * Math.PI) / 180) * distance,
            rotate: angle + 90,
            delay: i * 0.03
        }
    })

    return (
        <>
            {/* Main lightning bolt */}
            <LightningBolt
                style={{
                    left: targetPixels.x - 4,
                    top: lightningStartY,
                    width: 8,
                    height: lightningHeight
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{
                    scaleY: [0, 1.2, 1],
                    opacity: [0, 1, 0.9, 0]
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Secondary thinner lightning bolt for effect */}
            <LightningBolt
                style={{
                    left: targetPixels.x - 2,
                    top: lightningStartY,
                    width: 4,
                    height: lightningHeight
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{
                    scaleY: [0, 1, 0.8],
                    opacity: [0, 1, 1, 0.5]
                }}
                transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
            />

            {/* Lightning branches */}
            {lightningBranches.map((branch, i) => (
                <LightningBranch
                    key={`branch-${i}`}
                    style={{
                        left: branch.x,
                        top: branch.y,
                        width: 3,
                        height: branch.length,
                        transformOrigin: 'top center',
                        transform: `rotate(${branch.angle}deg)`
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{
                        scaleY: [0, 1],
                        opacity: [0, 0.8, 0]
                    }}
                    transition={{
                        duration: 0.25,
                        delay: branch.delay,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Lightning glow at top */}
            <LightningGlow
                style={{
                    left: targetPixels.x - 30,
                    top: lightningStartY - 20,
                    width: 60,
                    height: 60
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 0.9, 0]
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Impact flash */}
            <LightningGlow
                style={{
                    left: targetPixels.x - 50,
                    top: targetPixels.y - 50,
                    width: 100,
                    height: 100
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: [0, 1.5, 1],
                    opacity: [0, 1, 0.4]
                }}
                transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            />

            {/* Impact shockwaves */}
            {[0, 1, 2].map((waveIndex) => (
                <ImpactShockwave
                    key={`shockwave-${waveIndex}`}
                    style={{
                        left: targetPixels.x - 40,
                        top: targetPixels.y - 40,
                        width: 80,
                        height: 80
                    }}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{
                        scale: [0.3, 2],
                        opacity: [0.9, 0]
                    }}
                    transition={{
                        duration: 0.7,
                        delay: 0.2 + waveIndex * 0.1,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Electric particles spreading from impact */}
            {electricParticles.map((particle, i) => (
                <ElectricParticle
                    key={`particle-${i}`}
                    initial={{
                        x: targetPixels.x - 4,
                        y: targetPixels.y - 4,
                        scale: 0,
                        opacity: 0
                    }}
                    animate={{
                        x: particle.x - 4,
                        y: particle.y - 4,
                        scale: [0, 1.5, 1, 0],
                        opacity: [0, 1, 0.8, 0]
                    }}
                    transition={{
                        duration: 0.6,
                        delay: 0.2 + particle.delay,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Electric crackles radiating outward */}
            {electricCrackles.map((crackle, i) => (
                <ElectricCrackle
                    key={`crackle-${i}`}
                    style={{
                        left: crackle.x - 1.5,
                        top: crackle.y - 10,
                        transform: `rotate(${crackle.rotate}deg)`,
                        transformOrigin: 'center center'
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{
                        scaleY: [0, 1.5, 0],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: 0.4,
                        delay: 0.25 + crackle.delay,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Ground impact ring */}
            <motion.div
                style={{
                    position: 'absolute',
                    left: targetPixels.x - 35,
                    top: targetPixels.y - 35,
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    border: '2px solid rgba(30, 144, 255, 0.8)',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(30, 144, 255, 0.2) 50%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 95,
                    boxShadow: '0 0 25px rgba(30, 144, 255, 0.7)'
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                    scale: [0.5, 1.3, 1],
                    opacity: [0, 0.9, 0.5, 0]
                }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            />
        </>
    )
}

export const smiteRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <SmiteAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 800 // Lightning strike + impact effects
}
