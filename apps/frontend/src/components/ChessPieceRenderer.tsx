import { AnimatePresence, motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import React from 'react'
import { ChessPiece } from '../hooks/useGame'
import { ItemData } from '../store/itemsSlice'
import { AttackAnimation, DamageEffect, ItemPurchaseAnimation, MoveAnimation } from '@/types/animation'
import styled from 'styled-components'


const ChessPieceComponent = styled(motion.div) <{ isBlue: boolean; isNeutral: boolean; canSelect: boolean; isAttacking?: boolean; isMoving?: boolean; hasShield?: boolean }>`
  width: 90%;
  height: 90%;
  border-radius: 8px;
  border: 1px solid ${props =>
    props.isNeutral ? '#9333ea' :
      props.isBlue ? '#3b82f6' : '#ef4444'};
  background: ${props =>
    props.isNeutral ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' :
      props.isBlue ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.canSelect ? 'pointer' : 'default'};
  position: relative;
  z-index: ${props => props.isMoving ? 20 : props.isAttacking ? 10 : 1};
  box-shadow: ${props => props.hasShield
    ? '0 0 8px 3px rgba(255, 255, 255, 0.6), 0 0 2px 2px ' + (props.isNeutral ? '#9333ea' : props.isBlue ? '#3b82f6' : '#ef4444')
    : '0 0 2px 2px ' + (props.isNeutral ? '#9333ea' : props.isBlue ? '#3b82f6' : '#ef4444')
  };
  
  .piece-icon {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    
    img {
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }
  }
  
  .piece-name {
    position: absolute;
    bottom: 8px;
    color: var(--primary-text);
    font-size: 8px;
    font-weight: bold;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .hp-bar {
    position: absolute;
    bottom: 2px;
    left: 2px;
    right: 2px;
    height: 5px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 2px;
    overflow: hidden;
    z-index: 1;
    
    .hp-fill {
      height: 100%;
      background: linear-gradient(90deg, #ef4444 0%, #fbbf24 50%, #22c55e 100%);
      transition: width 0.3s ease;
    }
  }
  
  .shield-bar {
    position: absolute;
    bottom: 2px;
    left: 2px;
    right: 2px;
    height: 5px;
    background: transparent;
    border-radius: 2px;
    overflow: hidden;
    z-index: 2;
    pointer-events: none;
    
    .shield-fill {
      position: absolute;
      height: 100%;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(220, 220, 240, 0.95) 100%);
      transition: width 0.3s ease, left 0.3s ease, right 0.3s ease;
      box-shadow: 0 0 4px rgba(255, 255, 255, 0.6);
    }
  }
  
  &:hover {
    transform: ${props => props.canSelect ? 'scale(1.05)' : 'none'};
    border-color: var(--gold);
  }
`

const SkillIcon = styled.div<{ isActive: boolean; onCooldown: boolean, currentCooldown: number }>`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: ${props => props.isActive
    ? '2px solid #ffd700'
    : '2px solid #9333ea'};
  background: ${props => props.onCooldown
    ? 'rgba(0, 0, 0, 0.7)'
    : props.isActive
      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(200, 155, 60, 0.3) 100%)'
      : 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.isActive && !props.onCooldown ? 'pointer' : 'default'};
  z-index: 5;
  box-shadow: ${props => props.isActive
    ? '0 0 8px rgba(255, 215, 0, 0.6), inset 0 0 8px rgba(255, 215, 0, 0.2)'
    : '0 0 6px rgba(147, 51, 234, 0.6), inset 0 0 6px rgba(147, 51, 234, 0.2)'};
  transition: all 0.2s ease;
  filter: ${props => props.onCooldown ? 'grayscale(1)' : 'none'};
  opacity: ${props => props.onCooldown ? 0.5 : 1};
  pointer-events: ${props => props.isActive && !props.onCooldown ? 'auto' : 'none'};
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 2px;
    object-fit: cover;
  }
  
  &:hover {
    ${props => props.isActive && !props.onCooldown && `
      transform: scale(1.15);
      border-width: 3px;
      box-shadow: 0 0 12px rgba(255, 215, 0, 1), inset 0 0 12px rgba(255, 215, 0, 0.4);
    `}
  }
  
  /* Cooldown overlay */
  &::after {
    content: ${props => props.onCooldown ? `'${Math.ceil(props.currentCooldown)}'` : '""'};
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-size: 10px;
    font-weight: bold;
    text-shadow: 0 0 4px rgba(0, 0, 0, 1);
    pointer-events: none;
  }
  
  /* Active skill pulse animation */
  ${props => props.isActive && !props.onCooldown && `
    animation: skillPulse 2s ease-in-out infinite;
    
    @keyframes skillPulse {
      0%, 100% {
        box-shadow: 0 0 8px rgba(255, 215, 0, 0.6), inset 0 0 8px rgba(255, 215, 0, 0.2);
      }
      50% {
        box-shadow: 0 0 16px rgba(255, 215, 0, 1), inset 0 0 12px rgba(255, 215, 0, 0.4);
      }
    }
  `}
`


const CrownIcon = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
  
  svg {
    width: 100%;
    height: 100%;
    color: var(--gold);
    animation: crownGlow 2s ease-in-out infinite;
  }
  
  @keyframes crownGlow {
    0%, 100% {
      filter: drop-shadow(0 0 4px rgba(200, 155, 60, 0.6));
    }
    50% {
      filter: drop-shadow(0 0 8px rgba(200, 155, 60, 1));
    }
  }
`

const TransformIndicator = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.95) 0%, rgba(255, 165, 0, 0.95) 100%);
  border: 2px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12;
  box-shadow: 
    0 0 12px rgba(255, 215, 0, 0.8),
    0 0 24px rgba(255, 165, 0, 0.4),
    inset 0 0 8px rgba(255, 255, 255, 0.3);
  animation: transformPulse 1.5s ease-in-out infinite;
  
  img {
    width: 16px;
    height: 16px;
    border-radius: 50%;
  }
  
  .transform-icon {
    font-size: 14px;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
  }
  
  @keyframes transformPulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 
        0 0 12px rgba(255, 215, 0, 0.8),
        0 0 24px rgba(255, 165, 0, 0.4);
    }
    50% {
      transform: scale(1.1);
      box-shadow: 
        0 0 18px rgba(255, 215, 0, 1),
        0 0 36px rgba(255, 165, 0, 0.6);
    }
  }
`

const ItemIconsContainer = styled.div`
  position: absolute;
  left: 2px;
  top: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 5;
`

const ItemIcon = styled.div<{ $onCooldown?: boolean; $currentCooldown?: number }>`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid rgba(200, 155, 60, 0.6);
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 4px rgba(200, 155, 60, 0.4);
  transition: all 0.2s ease;
  position: relative;
  
  ${props => props.$onCooldown && `
    filter: grayscale(0.8);
    opacity: 0.6;
    border-color: rgba(128, 128, 128, 0.6);
  `}
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 2px;
    object-fit: cover;
  }
  
  &:hover {
    transform: scale(1.2);
    border-color: var(--gold);
    box-shadow: 0 0 8px rgba(200, 155, 60, 0.8);
  }
  
  .item-fallback {
    font-size: 8px;
    font-weight: bold;
    color: var(--gold);
  }
  
  /* Cooldown overlay */
  &::after {
    content: ${props => props.$onCooldown && props.$currentCooldown ? `'${Math.ceil(props.$currentCooldown)}'` : '""'};
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-size: 8px;
    font-weight: bold;
    text-shadow: 0 0 3px rgba(0, 0, 0, 1);
    pointer-events: none;
  }
`

const DamageNumber = styled(motion.div) <{ isDamage: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  font-size: 16px;
  color: ${props => props.isDamage ? '#ef4444' : '#22c55e'};
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  z-index: 25;
`

const AttackEffect = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 215, 0, 0.6) 50%, transparent 100%);
  pointer-events: none;
  z-index: 15;
`

const AfterimageEffect = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.6;
  filter: hue-rotate(270deg) brightness(1.2);
  pointer-events: none;
  z-index: 14;
  
  /* Clone all child styles */
  .piece-icon,
  .piece-name,
  .hp-bar,
  .shield-bar,
  img {
    pointer-events: none;
  }
`

const ItemPurchaseEffect = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 8px;
  pointer-events: none;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ItemIconAnimation = styled(motion.div)`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(200, 155, 60, 0.95) 0%, rgba(184, 134, 11, 0.95) 100%);
  border: 2px solid var(--gold);
  box-shadow: 
    0 0 20px rgba(200, 155, 60, 0.8),
    0 0 40px rgba(200, 155, 60, 0.5),
    inset 0 0 15px rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.8));
  }
  
  .item-fallback {
    font-size: 20px;
    font-weight: bold;
    color: white;
    text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
  }
`

const GoldSpentText = styled(motion.div)`
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-weight: bold;
  font-size: 14px;
  color: #ffd700;
  text-shadow: 
    2px 2px 4px rgba(0, 0, 0, 0.9),
    0 0 10px rgba(255, 215, 0, 0.8);
  pointer-events: none;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
`

const DeathCounterOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
`

const DeathCounterBadge = styled.div`
  position: absolute;
  bottom: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%);
  border: 2px solid #888;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  color: #fff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  z-index: 15;
`

export const ChessPieceRenderer: React.FC<{
  piece: ChessPiece
  canSelect: boolean
  onClick: (e: React.MouseEvent) => void
  attackAnimation?: AttackAnimation | null
  moveAnimation?: MoveAnimation | null
  isAnimating?: boolean
  damageEffects?: DamageEffect[]
  itemPurchaseAnimations?: ItemPurchaseAnimation[]
  isRedPlayer?: boolean
  isDead?: boolean
  onSkillClick?: () => void
  imageUrl: string
  isChampion: boolean
  boardRef: React.RefObject<HTMLDivElement>
  allItems?: ItemData[]
  currentRound?: number
}> = ({ piece, canSelect, onClick, attackAnimation, moveAnimation, isAnimating = false, damageEffects = [], itemPurchaseAnimations = [], isRedPlayer = false, isDead = false, onSkillClick, boardRef, allItems = [], isChampion, imageUrl, currentRound = 0 }) => {
  const hpPercentage = (piece.stats.hp / piece.stats.maxHp) * 100
  const isNeutral = piece.ownerId === "neutral"
  const isAttacking = attackAnimation?.attackerId === piece.id
  const isBeingAttacked = attackAnimation &&
    attackAnimation.targetPos.x === piece.position.x &&
    attackAnimation.targetPos.y === piece.position.y
  const isMoving = moveAnimation?.pieceId === piece.id
  const pieceEffects = damageEffects.filter(effect => effect.targetId === piece.id)
  const piecePurchaseAnimations = itemPurchaseAnimations.filter(anim => anim.targetId === piece.id)

  // Calculate attack animation values
  const getAttackAnimation = () => {
    if (!isAttacking || !attackAnimation) return {}

    // Calculate the visual direction based on grid position
    let deltaX = attackAnimation.targetPos.x - attackAnimation.attackerPos.x
    let deltaY = attackAnimation.targetPos.y - attackAnimation.attackerPos.y

    // Account for different player perspectives
    // Red player has flipped coordinate system in the visual layout
    if (isRedPlayer) {
      // For red player, the board is visually flipped
      // So we need to flip both X and Y directions
      deltaX = -deltaX
      deltaY = -deltaY
    }

    // Get actual cell dimensions from the board
    const { cellWidth, cellHeight } = getCellDimensions()

    // Calculate direction to target
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (distance === 0) return {}

    const dirX = deltaX / distance
    const dirY = deltaY / distance

    // Move 30% of average cell size toward target for attack lunge
    const avgCellSize = (cellWidth + cellHeight) / 2
    const lungeDistance = avgCellSize * 0.3
    const moveX = dirX * lungeDistance
    const moveY = -dirY * lungeDistance // Y direction (CSS coordinates are inverted)

    return {
      x: [0, moveX, 0],
      y: [0, moveY, 0],
      scale: [1, 1.2, 1],
      transition: {
        duration: 0.6,
        times: [0, 0.5, 1],
        ease: "easeInOut"
      }
    }
  }

  // Calculate afterimage animation values (for Guinsoo's Rageblade)
  const getAfterimageAnimation = () => {
    if (!isAttacking || !attackAnimation || !attackAnimation.guinsooProc) return {}

    // Same as main attack but with slight delay and smaller scale
    const { cellWidth, cellHeight } = getCellDimensions()

    let deltaX = attackAnimation.targetPos.x - attackAnimation.attackerPos.x
    let deltaY = attackAnimation.targetPos.y - attackAnimation.attackerPos.y

    if (isRedPlayer) {
      deltaX = -deltaX
      deltaY = -deltaY
    }

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (distance === 0) return {}

    const dirX = deltaX / distance
    const dirY = deltaY / distance

    const avgCellSize = (cellWidth + cellHeight) / 2
    const lungeDistance = avgCellSize * 0.3
    const moveX = dirX * lungeDistance
    const moveY = -dirY * lungeDistance

    return {
      x: [0, moveX, 0],
      y: [0, moveY, 0],
      scale: [0.9, 1.08, 0.9], // Slightly smaller scale
      opacity: [0, 0.6, 0.6, 0], // Fade in and out
      transition: {
        duration: 0.6,
        delay: 0.05, // 50ms delay
        times: [0, 0.5, 1],
        ease: "easeInOut"
      }
    }
  }

  // Calculate actual cell dimensions from board
  const getCellDimensions = () => {
    if (!boardRef.current) {
      // Fallback values if board ref is not available
      return { cellWidth: 60, cellHeight: 60 }
    }

    const boardElement = boardRef.current
    const boardRect = boardElement.getBoundingClientRect()

    // Board is 10 columns x 8 rows with 3px gap
    const totalGapWidth = 9 * 3 // 9 gaps between 10 columns
    const totalGapHeight = 7 * 3 // 7 gaps between 8 rows

    const cellWidth = (boardRect.width - totalGapWidth) / 10
    const cellHeight = (boardRect.height - totalGapHeight) / 8

    return { cellWidth, cellHeight }
  }

  // Calculate move animation values
  const getMoveAnimation = () => {
    if (!isMoving || !moveAnimation) return {}

    // Calculate the visual direction for movement
    // With the new dual-state system, the piece is rendered at the OLD position during animation
    // So we need to animate it FROM old (current render position) TO new position
    let deltaX = moveAnimation.toPos.x - moveAnimation.fromPos.x
    let deltaY = moveAnimation.toPos.y - moveAnimation.fromPos.y

    // Account for player perspective
    if (isRedPlayer) {
      deltaX = -deltaX
      deltaY = -deltaY
    }

    // Get actual cell dimensions from the board
    const { cellWidth, cellHeight } = getCellDimensions()

    // Convert to pixel movement based on actual cell size
    // Since the piece is rendered at OLD position, we animate it forward TO the new position
    const moveX = deltaX * (cellWidth + 3) // +3 for gap
    const moveY = -deltaY * (cellHeight + 3) // Y direction inverted for CSS, +3 for gap

    return {
      x: [0, moveX], // Start at current (old) position, animate to new position
      y: [0, moveY],
      transition: {
        duration: 0.5,
        iterations: 1
      }
    }
  }

  // Death animation values
  const getDeathAnimation = () => {
    if (!isDead) return {}

    return {
      scale: [1, 0.8, 0],
      opacity: [1, 0.5, 0],
      rotate: [0, 10, -10, 0],
      transition: {
        duration: 0.8,
        ease: "easeInOut"
      }
    }
  }

  // Combine animations
  const getCombinedAnimation = () => {
    if (isDead) return getDeathAnimation()
    if (isMoving) return getMoveAnimation()
    if (isAttacking) return getAttackAnimation()
    return {}
  }

  // Generate unique key to force remount on move or position change
  const animationKey = isMoving && moveAnimation
    ? `${piece.id}-${moveAnimation.fromPos.x}-${moveAnimation.fromPos.y}-${moveAnimation.toPos.x}-${moveAnimation.toPos.y}`
    : `${piece.id}-${piece.position.x}-${piece.position.y}` // Include position in key to force remount after state swap

  const hasShield = piece.shields && piece.shields.length > 0 && piece.shields.reduce((sum, s) => sum + s.amount, 0) > 0

  return (
    <ChessPieceComponent
      key={animationKey}
      data-piece-id={piece.id}
      isBlue={piece.blue}
      isNeutral={isNeutral}
      canSelect={canSelect && !isAnimating && !isDead}
      isAttacking={isAttacking}
      isMoving={isMoving}
      hasShield={hasShield}
      onClick={onClick}
      animate={getCombinedAnimation()}
      whileHover={canSelect && !isAnimating && !isDead ? { scale: 1.05 } : {}}
      whileTap={canSelect && !isAnimating && !isDead ? { scale: 0.95 } : {}}
    >
      <div className="piece-icon">
        <img
          src={imageUrl}
          alt={piece.name}
          onError={(e) => {
            // Fallback if image doesn't exist
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
      <div className="piece-name">{piece.name}</div>

      {/* Crown Icon for Poro (King) */}
      {piece.name === "Poro" && (
        <CrownIcon title="King">
          <Crown />
        </CrownIcon>
      )}

      {/* Transform Indicator - Show when piece has transformation debuff */}
      {(piece as any).debuffs?.some((d: any) => d.isTransformation) && (
        <TransformIndicator title="Transformed">
          <span className="transform-icon">🔥</span>
        </TransformIndicator>
      )}

      {/* Death Counter - Show respawn timer for dead champions */}
      {isDead && isChampion && piece.respawnAtRound !== undefined && piece.respawnAtRound > currentRound && (
        <>
          <DeathCounterOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          <DeathCounterBadge title={`Respawns at round ${piece.respawnAtRound}`}>
            {piece.respawnAtRound - currentRound}
          </DeathCounterBadge>
        </>
      )}

      {/* Item Icons (Left Side) - Only for champions */}
      {isChampion && (piece as any).items && (piece as any).items.length > 0 && (
        <ItemIconsContainer style={{ top: '2px' }}>
          {(piece as any).items.map((item: any, index: number) => {
            const itemData = allItems.find((allItem: ItemData) => allItem.id === item.id)
            const isOnCooldown = item.currentCooldown > 0
            return (
              <ItemIcon
                key={index}
                title={`${item.name}${isOnCooldown ? ` (CD: ${Math.ceil(item.currentCooldown)})` : ''}`}
                $onCooldown={isOnCooldown}
                $currentCooldown={item.currentCooldown}
              >
                {itemData?.icon ? (
                  <img
                    src={itemData.icon}
                    alt={item.name}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent) {
                        const fallback = document.createElement('div')
                        fallback.className = 'item-fallback'
                        fallback.textContent = item.name.substring(0, 2).toUpperCase()
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                ) : (
                  <div className="item-fallback">{item.name.substring(0, 2).toUpperCase()}</div>
                )}
              </ItemIcon>
            )
          })}
        </ItemIconsContainer>
      )}

      {/* Shield Bar (next to HP bar, League of Legends style) */}
      {piece.shields && piece.shields.length > 0 && (() => {
        const shieldAmount = piece.shields.reduce((sum, s) => sum + s.amount, 0)
        const shieldPercentage = (shieldAmount / piece.stats.maxHp) * 100
        const totalPercentage = hpPercentage + shieldPercentage

        // Shield starts where HP ends
        // If total > 100%, the entire shield is shown from the right side
        const hasOverflow = totalPercentage > 100

        if (hasOverflow) {
          // When overflowing, show entire shield from right side
          return (
            <div className="shield-bar">
              <div
                className="shield-fill"
                style={{
                  right: '0%',
                  left: 'auto',
                  width: `${shieldPercentage}%`
                }}
              />
            </div>
          )
        }

        // Normal case: shield starts where HP ends
        return (
          <div className="shield-bar">
            <div
              className="shield-fill"
              style={{
                left: `${hpPercentage}%`,
                width: `${shieldPercentage}%`
              }}
            />
          </div>
        )
      })()}

      <div className="hp-bar">
        <div
          className="hp-fill"
          style={{ width: `${hpPercentage}%` }}
        />
      </div>

      {/* Skill Icon Overlay */}
      {piece.skill && (
        <SkillIcon
          isActive={piece.skill.type === 'active'}
          onCooldown={piece.skill.currentCooldown > 0}
          currentCooldown={Math.ceil(piece.skill.currentCooldown)}
          onClick={(e) => {
            e.stopPropagation()
            if (piece.skill && piece.skill.type === 'active' && piece.skill.currentCooldown === 0 && onSkillClick) {
              onSkillClick()
            }
          }}
          title={`${piece.skill.name}${piece.skill.type === 'active' && piece.skill.currentCooldown > 0 ? ` (CD: ${Math.ceil(piece.skill.currentCooldown)})` : ''}`}
        >
          <img
            src={`/icons/${piece.name.toLowerCase()}_skill.webp`}
            alt={piece.skill.name}
            onError={(e) => {
              // Fallback - show first letter of skill name
              e.currentTarget.style.display = 'none'
              const parent = e.currentTarget.parentElement
              if (parent && piece.skill) {
                parent.innerHTML = piece.skill.name?.charAt(0).toUpperCase() || '?'
                parent.style.fontSize = '14px'
                parent.style.fontWeight = 'bold'
                parent.style.color = piece.skill.type === 'active' ? '#ffd700' : '#9333ea'
              }
            }}
          />
          {piece.skill.currentCooldown > 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              textShadow: '0 0 4px rgba(0, 0, 0, 1)',
              pointerEvents: 'none'
            }}>
              {Math.ceil(piece.skill.currentCooldown)}
            </div>
          )}
        </SkillIcon>
      )}

      {isBeingAttacked && (
        <AttackEffect
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 0.3, delay: 0.3 }}
        />
      )}

      {/* Damage Numbers on this piece */}
      <AnimatePresence>
        {pieceEffects.map((effect) => (
          <DamageNumber
            key={effect.id}
            isDamage={effect.isDamage}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [0, -30, -40, -50],
              scale: [0.5, 1.2, 1, 0.8]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {effect.isDamage ? `-${effect.damage}` : `+${effect.damage}`}
          </DamageNumber>
        ))}
      </AnimatePresence>

      {/* Item Purchase Animations */}
      <AnimatePresence>
        {piecePurchaseAnimations.map((purchaseAnim) => {
          const itemData = allItems.find(item => item.id === purchaseAnim.itemId)
          return (
            <ItemPurchaseEffect key={purchaseAnim.id}>
              <ItemIconAnimation
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 1.2, 0],
                  rotate: [-180, 0, 0, 180],
                  opacity: [0, 1, 1, 0]
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {purchaseAnim.itemIcon ? (
                  <img
                    src={purchaseAnim.itemIcon}
                    alt={itemData?.name || 'Item'}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="item-fallback">
                    {itemData?.name?.substring(0, 2).toUpperCase() || '?'}
                  </div>
                )}
              </ItemIconAnimation>
              {itemData && (
                <GoldSpentText
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [10, -10, -20, -30]
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <img src="/icons/dollar.png" alt="Gold" width={12} height={12} />
                  -{itemData.cost}
                </GoldSpentText>
              )}
            </ItemPurchaseEffect>
          )
        })}
      </AnimatePresence>

      {/* Guinsoo's Rageblade Afterimage Effect */}
      {isAttacking && attackAnimation?.guinsooProc && (
        <AfterimageEffect
          initial={{ x: -5, y: -5, scale: 0.9, opacity: 0 }}
          animate={getAfterimageAnimation()}
        >
          <div className="piece-icon">
            <img
              src={imageUrl}
              alt={`${piece.name} afterimage`}
            />
          </div>
        </AfterimageEffect>
      )}
    </ChessPieceComponent>
  )
}