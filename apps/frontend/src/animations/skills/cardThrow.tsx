import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled from 'styled-components'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    ImpactEffect,
    ParticleEffectComponent
} from '../types'

// Adjustable timing constant
const CARD_STAGGER_DELAY = 40 // milliseconds between each card launch

// Card color cycle: red, blue, yellow
const CARD_COLORS = ['#DC143C', '#4169E1', '#FFD700']

interface CardProjectileProps {
    color: string
}

const CardProjectile = styled(motion.div) <CardProjectileProps>`
  position: absolute;
  width: 20px;
  height: 28px;
  pointer-events: none;
  z-index: 100;
  border-radius: 3px;
  background: linear-gradient(135deg, ${props => props.color} 0%, ${props => props.color}CC 100%);
  box-shadow: 0 0 12px ${props => props.color}AA, 0 0 24px ${props => props.color}66;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border: 1px solid ${props => props.color}EE;
`

interface CardData {
    id: number
    targetIndex: number
    color: string
    launched: boolean
}

/**
 * Twisted Fate's Pick a Card animation
 * Throws multiple colored cards sequentially to targets with stagger delay
 * Each card shows impact effect and particles on hit
 */
const CardThrowAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    cardTargets,
    totalCardCount,
    boardRef,
    isRedPlayer = false
}) => {
    const [cards, setCards] = useState<CardData[]>([])
    const [activeCardIndex, setActiveCardIndex] = useState(0)
    const [impacts, setImpacts] = useState<{ id: number; position: { x: number; y: number }; color: string }[]>([])
    const [particles, setParticles] = useState<{ id: number; position: { x: number; y: number } }[]>([])

    console.log('[CardThrow] Animation component rendered with:', { casterPosition, cardTargets, totalCardCount })

    if (!cardTargets || cardTargets.length === 0 || !totalCardCount) {
        console.warn('[CardThrow] Missing required data:', { cardTargets, totalCardCount })
        return null
    }

    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)

    // Build target positions map
    const targetPixelsMap = new Map<number, { x: number; y: number }>()
    cardTargets.forEach((target, index) => {
        targetPixelsMap.set(index, getPixelPosition(target.targetPosition, boardRef, isRedPlayer))
    })

    // Initialize cards on mount
    useEffect(() => {
        const initialCards: CardData[] = []
        for (let i = 0; i < totalCardCount; i++) {
            initialCards.push({
                id: i,
                targetIndex: i % cardTargets.length, // Round-robin to targets
                color: CARD_COLORS[i % CARD_COLORS.length], // Cycle through colors
                launched: i === 0 // Launch first card immediately
            })
        }
        setCards(initialCards)
        console.log('[CardThrow] Initialized cards:', initialCards)
    }, [totalCardCount, cardTargets.length])

    // Launch cards sequentially with stagger delay
    useEffect(() => {
        if (activeCardIndex < totalCardCount) {
            const timer = setTimeout(() => {
                setCards(prev => prev.map((card, idx) =>
                    idx === activeCardIndex ? { ...card, launched: true } : card
                ))
                setActiveCardIndex(prev => prev + 1)
            }, activeCardIndex === 0 ? 0 : CARD_STAGGER_DELAY)

            return () => clearTimeout(timer)
        }
    }, [activeCardIndex, totalCardCount])

    const handleCardComplete = (cardId: number, targetIndex: number, color: string) => {
        const targetPixels = targetPixelsMap.get(targetIndex)
        if (targetPixels) {
            console.log('[CardThrow] Card', cardId, 'hit target', targetIndex, 'at', targetPixels)

            // Add impact effect
            setImpacts(prev => [...prev, { id: cardId, position: targetPixels, color }])

            // Add particle effect
            setParticles(prev => [...prev, { id: cardId, position: targetPixels }])

            // Clean up impact after animation
            setTimeout(() => {
                setImpacts(prev => prev.filter(i => i.id !== cardId))
            }, 400)

            // Clean up particles after animation
            setTimeout(() => {
                setParticles(prev => prev.filter(p => p.id !== cardId))
            }, 500)
        }
    }

    console.log('[CardThrow] Render state:', {
        cardsCount: cards.length,
        activeCardIndex,
        impactsCount: impacts.length,
        particlesCount: particles.length
    })

    return (
        <>
            {/* Render all cards */}
            {cards.map(card => {
                if (!card.launched) return null

                const targetPixels = targetPixelsMap.get(card.targetIndex)
                if (!targetPixels) return null

                // Calculate angle for rotation
                const deltaX = targetPixels.x - casterPixels.x
                const deltaY = targetPixels.y - casterPixels.y
                const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

                return (
                    <CardProjectile
                        key={card.id}
                        color={card.color}
                        initial={{
                            x: casterPixels.x - 10,
                            y: casterPixels.y - 14,
                            scale: 0.5,
                            rotate: angle,
                            opacity: 0
                        }}
                        animate={{
                            x: targetPixels.x - 10,
                            y: targetPixels.y - 14,
                            scale: 1,
                            rotate: angle + 720, // Two full rotations during flight
                            opacity: 1
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                            duration: 0.5,
                            ease: 'easeInOut'
                        }}
                        onAnimationComplete={() => handleCardComplete(card.id, card.targetIndex, card.color)}
                    >
                        🃏
                    </CardProjectile>
                )
            })}

            {/* Render impact effects */}
            {impacts.map(impact => (
                <ImpactEffect
                    key={`impact-${impact.id}`}
                    style={{
                        left: impact.position.x - 40,
                        top: impact.position.y - 40,
                        zIndex: 150,
                        pointerEvents: 'none',
                        background: `radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, ${impact.color}99 50%, transparent 100%)`
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.5, 0],
                        opacity: [1, 0.5, 0]
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                />
            ))}

            {/* Render particle effects */}
            {particles.map(particle => (
                <motion.div
                    key={`particle-${particle.id}`}
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
                        position={particle.position}
                        count={8}
                        duration={500}
                    />
                </motion.div>
            ))}
        </>
    )
}

export const cardThrowRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <CardThrowAnimation {...config} />
            </AnimatePresence>
        )
    },
    // Dynamic duration based on the actual number of cards thrown
    // Total duration: (cardCount * stagger) + flight time + buffer
    duration: (config: SkillAnimationConfig) => {
        const cardCount = config.totalCardCount || 1
        const flightTime = 100 // Card flight time in ms
        const buffer = 0 // Extra buffer time in ms
        return cardCount * CARD_STAGGER_DELAY + flightTime + buffer
    }
}

