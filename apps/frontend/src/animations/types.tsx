import { motion } from 'framer-motion'
import React from 'react'
import styled from 'styled-components'
import { ChessPosition } from '../hooks/useGame'

export interface SkillAnimationConfig {
  casterId: string
  casterPosition: ChessPosition
  targetPosition?: ChessPosition
  targetId?: string
  skillName: string
  boardRef?: React.RefObject<HTMLDivElement>
  isRedPlayer?: boolean
  pulledToPosition?: ChessPosition // For Rocket Grab: the actual position the target was pulled to
  cardTargets?: Array<{
    targetId: string;
    targetPosition: ChessPosition;
    cardCount: number
  }> // For Twisted Fate: all targets hit by cards
  totalCardCount?: number // For Twisted Fate: total number of cards thrown
  whirlwindTargets?: Array<{
    targetId: string;
    targetPosition: ChessPosition;
  }> // For Yasuo: targets hit by the whirlwind on critical strike
  viktorModules?: {
    stunProc?: boolean;           // Module 1: Neutralizing Bolt triggered stun
    empowered?: boolean;          // Module 2: Superconductive Coil empowerment applied
    shielded?: boolean;           // Module 3: Energy Capacitor shield applied
    executed?: boolean;           // Module 4: Disruptor execute triggered
    aoeTargets?: Array<{          // Module 5: Electrical Overload targets
      targetId: string;
      targetPosition: ChessPosition;
    }>;
  } // For Viktor: module effect states
  criticalFlankAdvancePosition?: ChessPosition // For Minions: position the attacker advanced to after Critical Flank
}

export interface SkillAnimationRenderer {
  render: (config: SkillAnimationConfig) => JSX.Element | null
  duration: number | ((config: SkillAnimationConfig) => number) // milliseconds - can be static or calculated dynamically
}

// Helper to calculate pixel position from chess position
export const getPixelPosition = (
  position: ChessPosition,
  boardRef?: React.RefObject<HTMLDivElement>,
  isRedPlayer: boolean = false
): { x: number; y: number } => {
  if (!boardRef?.current) {
    // Fallback values
    return { x: 0, y: 0 }
  }

  const boardElement = boardRef.current
  const boardRect = boardElement.getBoundingClientRect()

  // Board is 10 columns x 8 rows with 3px gap
  const totalGapWidth = 9 * 3 // 9 gaps between 10 columns
  const totalGapHeight = 7 * 3 // 7 gaps between 8 rows

  const cellWidth = (boardRect.width - totalGapWidth) / 10
  const cellHeight = (boardRect.height - totalGapHeight) / 8

  // Convert chess position to visual grid position
  // The board renders x from -1 to 8, y from 0 to 7
  // For blue player: yValues = [7, 6, 5, 4, 3, 2, 1, 0] (chess y=7 at top, y=0 at bottom)
  // For red player: yValues = [0, 1, 2, 3, 4, 5, 6, 7] (chess y=0 at top, y=7 at bottom)

  let gridX = position.x + 1 // Convert chess x (-1 to 8) to grid x (0 to 9)
  let gridY: number

  if (isRedPlayer) {
    // Red player: xValues = [8, 7, 6, 5, 4, 3, 2, 1, 0, -1], yValues = [0, 1, 2, 3, 4, 5, 6, 7]
    gridX = 8 - position.x // Flip X: x=-1 becomes 9, x=8 becomes 0
    gridY = position.y // Y is not flipped for red player
  } else {
    // Blue player: xValues = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8], yValues = [7, 6, 5, 4, 3, 2, 1, 0]
    // gridX already set above
    gridY = 7 - position.y // Y is flipped for blue player: y=0 is at row 7, y=7 is at row 0
  }

  // Calculate pixel position (center of cell) relative to board
  const x = gridX * (cellWidth + 3) + cellWidth / 2
  const y = gridY * (cellHeight + 3) + cellHeight / 2

  return { x, y }
}

// Styled components for reusable animations

export const ProjectileContainer = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 100;
`

export const Projectile = styled(motion.div)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 1) 0%, rgba(200, 155, 60, 0.8) 100%);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`

export const ImpactEffect = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 215, 0, 0.6) 50%, transparent 100%);
  pointer-events: none;
`

export const AOECircle = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  border: 3px solid rgba(255, 215, 0, 0.8);
  background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
  pointer-events: none;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.3);
`

export const PulseEffect = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, rgba(255, 215, 0, 0.3) 50%, transparent 100%);
  pointer-events: none;
`

// Reusable animation components

export interface ProjectileAnimationProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  duration?: number
  icon?: string
  color?: string
  onComplete?: () => void
}

export const ProjectileAnimation = ({
  from,
  to,
  duration = 600,
  icon = '⚡',
  color,
  onComplete
}: ProjectileAnimationProps): JSX.Element => {
  return (
    <ProjectileContainer
      initial={{ x: from.x, y: from.y, scale: 0, opacity: 0 }}
      animate={{
        x: to.x,
        y: to.y,
        scale: [0, 1, 1],
        opacity: [0, 1, 1]
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        duration: duration / 1000,
        ease: 'easeInOut'
      }}
      onAnimationComplete={onComplete}
    >
      <Projectile style={color ? { background: color } : {}}>
        {icon}
      </Projectile>
    </ProjectileContainer>
  )
}

export interface AOEAnimationProps {
  center: { x: number; y: number }
  radius?: number
  duration?: number
  color?: string
}

export const AOEAnimationComponent = ({
  center,
  radius = 60,
  duration = 800,
  color = 'rgba(255, 215, 0, 0.8)'
}: AOEAnimationProps): JSX.Element => {
  return (
    <AOECircle
      style={{
        left: center.x - radius,
        top: center.y - radius,
        width: radius * 2,
        height: radius * 2,
        borderColor: color
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.5, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration / 1000, ease: 'easeOut' }}
    />
  )
}

export interface ParticleEffectProps {
  position: { x: number; y: number }
  count?: number
  duration?: number
}

export const ParticleEffectComponent = ({
  position,
  count = 8,
  duration = 600
}: ParticleEffectProps): JSX.Element => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2
        const distance = 40
        const endX = position.x + Math.cos(angle) * distance
        const endY = position.y + Math.sin(angle) * distance

        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              left: position.x,
              top: position.y,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 1) 0%, rgba(200, 155, 60, 0.8) 100%)',
              boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)',
              pointerEvents: 'none'
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: endX - position.x,
              y: endY - position.y,
              scale: 0,
              opacity: 0
            }}
            transition={{
              duration: duration / 1000,
              ease: 'easeOut'
            }}
          />
        )
      })}
    </>
  )
}

