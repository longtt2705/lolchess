import React from 'react'
import { AnimatePresence } from 'framer-motion'
import {
    SkillAnimationConfig,
    SkillAnimationRenderer,
    getPixelPosition,
    PulseEffect,
    AOEAnimationComponent
} from '../types'

/**
 * Generic skill animation - fallback for skills without custom animations
 * Shows a pulse effect on the caster and target (if exists)
 */
const GenericSkillAnimation: React.FC<SkillAnimationConfig> = ({
    casterPosition,
    targetPosition,
    boardRef,
    isRedPlayer = false
}) => {
    const casterPixels = getPixelPosition(casterPosition, boardRef, isRedPlayer)
    const targetPixels = targetPosition
        ? getPixelPosition(targetPosition, boardRef, isRedPlayer)
        : null

    return (
        <>
            {/* Caster pulse effect */}
            <PulseEffect
                style={{
                    left: casterPixels.x - 40,
                    top: casterPixels.y - 40,
                    width: 80,
                    height: 80
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1, 1.2], opacity: [0, 0.8, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* Target effect (if target exists) */}
            {targetPixels && (
                <AOEAnimationComponent
                    center={targetPixels}
                    radius={50}
                    duration={800}
                    color="rgba(147, 51, 234, 0.8)"
                />
            )}
        </>
    )
}

export const genericSkillRenderer: SkillAnimationRenderer = {
    render: (config: SkillAnimationConfig) => {
        return (
            <AnimatePresence>
                <GenericSkillAnimation {...config} />
            </AnimatePresence>
        )
    },
    duration: 800
}

