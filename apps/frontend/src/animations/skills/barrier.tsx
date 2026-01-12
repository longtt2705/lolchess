import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition
} from '../types'

const ShieldHexagon = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 98;
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.6) 0%, 
    rgba(230, 243, 255, 0.5) 50%, 
    rgba(255, 255, 255, 0.4) 100%
  );
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 
    0 0 30px rgba(255, 255, 255, 0.8),
    inset 0 0 25px rgba(230, 243, 255, 0.6),
    0 0 50px rgba(240, 248, 255, 0.5);
`

const ProtectiveWave = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.7);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(230, 243, 255, 0.15) 40%, transparent 70%);
  pointer-events: none;
  z-index: 95;
  box-shadow: 
    0 0 40px rgba(255, 255, 255, 0.6),
    inset 0 0 30px rgba(230, 243, 255, 0.4);
`

const BarrierShimmer = styled(motion.div)`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(240, 248, 255, 0.8) 50%, rgba(230, 243, 255, 0.6) 100%);
  box-shadow: 
    0 0 15px rgba(255, 255, 255, 0.9),
    0 0 25px rgba(230, 243, 255, 0.7);
  pointer-events: none;
  z-index: 100;
`

const ShieldRing = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  background: transparent;
  pointer-events: none;
  z-index: 96;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
`

const BarrierFlash = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, 
    rgba(255, 255, 255, 0.9) 0%, 
    rgba(240, 248, 255, 0.6) 30%,
    rgba(230, 243, 255, 0.3) 60%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 99;
  box-shadow: 
    0 0 60px rgba(255, 255, 255, 0.8),
    inset 0 0 40px rgba(240, 248, 255, 0.5);
  filter: blur(2px);
`

const ShieldPanel = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 97;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.4) 0%, 
    rgba(230, 243, 255, 0.3) 50%, 
    rgba(255, 255, 255, 0.2) 100%
  );
  border: 2px solid rgba(255, 255, 255, 0.7);
  box-shadow: 
    0 0 20px rgba(255, 255, 255, 0.6),
    inset 0 0 15px rgba(230, 243, 255, 0.4);
`

/**
 * Barrier summoner spell animation
 * Shows white protective shield with hexagonal geometry and expanding waves
 */
const BarrierAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    boardRef,
    isRedPlayer = false
}) => {
    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)

    // Generate shimmer particles orbiting the shield
    const numShimmers = 16
    const shimmerParticles = Array.from({ length: numShimmers }, (_, i) => {
        const angle = (i / numShimmers) * 360
        const radius = 55
        return {
            x: casterPixels.x + Math.cos((angle * Math.PI) / 180) * radius,
            y: casterPixels.y + Math.sin((angle * Math.PI) / 180) * radius,
            delay: i * 0.03,
            angle: angle
        }
    })

    // Generate shield panels around the hexagon
    const numPanels = 6
    const shieldPanels = Array.from({ length: numPanels }, (_, i) => {
        const angle = (i / numPanels) * 360 + 30
        const distance = 45
        return {
            x: casterPixels.x + Math.cos((angle * Math.PI) / 180) * distance,
            y: casterPixels.y + Math.sin((angle * Math.PI) / 180) * distance,
            rotate: angle,
            delay: i * 0.05
        }
    })

    return (
        <>
            {/* Initial barrier flash */}
            <BarrierFlash
                style={{
                    left: casterPixels.x - 60,
                    top: casterPixels.y - 60,
                    width: 120,
                    height: 120
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                    scale: [0, 1.5, 1], 
                    opacity: [0, 0.9, 0.4] 
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Central hexagonal shield */}
            <ShieldHexagon
                style={{
                    left: casterPixels.x - 50,
                    top: casterPixels.y - 50,
                    width: 100,
                    height: 100
                }}
                initial={{ scale: 0, opacity: 0, rotate: 0 }}
                animate={{
                    scale: [0, 1.2, 1],
                    opacity: [0, 1, 0.85],
                    rotate: [0, 15, 0]
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            />

            {/* Rotating inner hexagon */}
            <ShieldHexagon
                style={{
                    left: casterPixels.x - 35,
                    top: casterPixels.y - 35,
                    width: 70,
                    height: 70
                }}
                initial={{ scale: 0, opacity: 0, rotate: 0 }}
                animate={{
                    scale: [0, 1.3, 1],
                    opacity: [0, 0.7, 0.5],
                    rotate: [0, -180, -360]
                }}
                transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
            />

            {/* Shield panels forming around the barrier */}
            {shieldPanels.map((panel, i) => (
                <ShieldPanel
                    key={`panel-${i}`}
                    style={{
                        left: panel.x - 15,
                        top: panel.y - 15,
                        width: 30,
                        height: 30,
                        borderRadius: '4px',
                        transform: `rotate(${panel.rotate}deg)`
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.3, 1],
                        opacity: [0, 0.9, 0.6]
                    }}
                    transition={{
                        duration: 0.5,
                        delay: panel.delay,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Expanding protective waves */}
            {[0, 1, 2, 3, 4].map((waveIndex) => (
                <ProtectiveWave
                    key={`wave-${waveIndex}`}
                    style={{
                        left: casterPixels.x - 50,
                        top: casterPixels.y - 50,
                        width: 100,
                        height: 100
                    }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                        scale: [0.5, 3],
                        opacity: [0.8, 0]
                    }}
                    transition={{
                        duration: 1.2,
                        delay: waveIndex * 0.15,
                        ease: 'easeOut'
                    }}
                />
            ))}

            {/* Shield rings pulsing */}
            {[0, 1].map((ringIndex) => (
                <ShieldRing
                    key={`ring-${ringIndex}`}
                    style={{
                        left: casterPixels.x - 40,
                        top: casterPixels.y - 40,
                        width: 80,
                        height: 80
                    }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0, 0.8, 0]
                    }}
                    transition={{
                        duration: 1,
                        delay: ringIndex * 0.3,
                        ease: 'easeInOut',
                        repeat: Infinity
                    }}
                />
            ))}

            {/* Shimmer particles orbiting the shield */}
            {shimmerParticles.map((shimmer, i) => (
                <BarrierShimmer
                    key={`shimmer-${i}`}
                    initial={{
                        x: casterPixels.x - 3,
                        y: casterPixels.y - 3,
                        scale: 0,
                        opacity: 0
                    }}
                    animate={{
                        x: [casterPixels.x - 3, shimmer.x - 3, casterPixels.x - 3],
                        y: [casterPixels.y - 3, shimmer.y - 3, casterPixels.y - 3],
                        scale: [0, 1.5, 1, 0],
                        opacity: [0, 1, 0.8, 0]
                    }}
                    transition={{
                        duration: 1,
                        delay: shimmer.delay,
                        ease: 'easeInOut'
                    }}
                />
            ))}

            {/* Additional central glow pulse */}
            <motion.div
                style={{
                    position: 'absolute',
                    left: casterPixels.x - 45,
                    top: casterPixels.y - 45,
                    width: 90,
                    height: 90,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(230, 243, 255, 0.3) 40%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: 94,
                    boxShadow: '0 0 40px rgba(255, 255, 255, 0.5)',
                    filter: 'blur(3px)'
                }}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{
                    scale: [0.7, 1.2, 0.9, 1.2],
                    opacity: [0, 0.8, 0.5, 0.3]
                }}
                transition={{
                    duration: 1,
                    ease: 'easeInOut'
                }}
            />
        </>
    )
}

export const barrierRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <BarrierAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 1000 // Initial formation + sustained shield presence
}
