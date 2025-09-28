import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Coins, RotateCcw, Users, Zap } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { ChessPiece, ChessPosition, useGame } from '../hooks/useGame'
import { resetGameplay } from '../store/gameSlice'

interface AttackAnimation {
  attackerId: string
  targetId: string
  attackerPos: ChessPosition
  targetPos: ChessPosition
  damage?: number
}

interface MoveAnimation {
  pieceId: string
  fromPos: ChessPosition
  toPos: ChessPosition
}

interface DamageEffect {
  id: string
  targetId: string // ID of the piece that took damage
  damage: number
  isDamage: boolean // true for damage, false for healing
}

const GameContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-areas: 
    "players-list game-board"
    "player-info game-board";
  grid-template-columns: 300px 1fr;
  gap: 20px;
  min-height: calc(100vh - 140px);
`

const PlayersPanel = styled.div`
  grid-area: players-list;
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  
  h3 {
    color: var(--gold);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`

const PlayerItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--primary-bg);
  border-radius: 6px;
  border-left: 3px solid var(--gold);
  
  .player-name {
    color: var(--primary-text);
    font-weight: bold;
  }
  
  .player-stats {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--secondary-text);
    
    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
`

const PlayerInfoPanel = styled.div`
  grid-area: player-info;
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  
  h3 {
    color: var(--gold);
    margin-bottom: 16px;
  }
  
  .player-resources {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    
    .resource {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--primary-text);
      font-weight: bold;
      
      &.health { color: #e74c3c; }
      &.gold { color: var(--gold); }
      &.level { color: var(--hover); }
    }
  }
`

const GameBoard = styled.div`
  grid-area: game-board;
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  position: relative;
  
  h3 {
    color: var(--gold);
    margin-bottom: 20px;
    text-align: center;
    font-size: 1.5rem;
  }
`

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(8, 1fr);
  gap: 2px;
  background: var(--primary-bg);
  padding: 16px;
  border-radius: 8px;
  min-height: 600px;
  max-width: 800px;
  margin: 0 auto;
  
  .square {
    background: var(--accent-bg);
    border: 2px solid var(--border);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--secondary-text);
    font-size: 10px;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
    min-height: 60px;
    
    &:hover {
      background: rgba(200, 155, 60, 0.1);
      border-color: var(--gold);
    }
    
    &.valid-move {
      background: rgba(34, 197, 94, 0.3);
      border-color: #22c55e;
      cursor: pointer;
      position: relative;
      
      &:after {
        content: '●';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #22c55e;
        font-size: 16px;
        font-weight: bold;
      }
      
      &:hover {
        background: rgba(34, 197, 94, 0.4);
        transform: scale(1.02);
      }
    }
    
    &.valid-attack {
      background: rgba(239, 68, 68, 0.3);
      border-color: #ef4444;
      cursor: pointer;
      position: relative;
      
      &:after {
        content: '⚔';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ef4444;
        font-size: 14px;
        font-weight: bold;
      }
      
      &:hover {
        background: rgba(239, 68, 68, 0.4);
        transform: scale(1.02);
      }
    }
    
    &.selected {
      background: rgba(200, 155, 60, 0.3);
      border-color: var(--gold);
      border-width: 3px;
    }
    
    .coordinates {
      position: absolute;
      top: 2px;
      left: 2px;
      font-size: 8px;
      color: var(--secondary-text);
      opacity: 0.5;
    }
  }
`

const ChessPieceComponent = styled(motion.div) <{ isBlue: boolean; isNeutral: boolean; canSelect: boolean; isAttacking?: boolean }>`
  width: 90%;
  height: 90%;
  border-radius: 8px;
  border: 2px solid ${props =>
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
  z-index: ${props => props.isAttacking ? 10 : 1};
  
  .piece-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2px;
    
    img {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
  }
  
  .piece-name {
    color: white;
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
    height: 4px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 2px;
    overflow: hidden;
    
    .hp-fill {
      height: 100%;
      background: linear-gradient(90deg, #ef4444 0%, #fbbf24 50%, #22c55e 100%);
      transition: width 0.3s ease;
    }
  }
  
  &:hover {
    transform: ${props => props.canSelect ? 'scale(1.05)' : 'none'};
    border-color: var(--gold);
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

const GameActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: center;
  
  button {
    background: var(--accent-bg);
    border: 2px solid var(--border);
    color: var(--primary-text);
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: var(--gold);
      background: var(--gold);
      color: var(--primary-bg);
      transform: translateY(-1px);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  }
`

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(30, 35, 40, 0.95);
  padding: 40px;
  border-radius: 12px;
  border: 2px solid var(--gold);
  
  h2 {
    color: var(--gold);
    margin-bottom: 16px;
    font-size: 1.5rem;
  }
  
  p {
    color: var(--secondary-text);
    font-size: 1rem;
    line-height: 1.5;
  }
`

const TurnIndicator = styled(motion.div) <{ isMyTurn: boolean }>`
  text-align: center;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  background: ${props => props.isMyTurn ? 'var(--gold)' : 'var(--secondary-bg)'};
  color: ${props => props.isMyTurn ? 'var(--primary-bg)' : 'var(--primary-text)'};
  border: 2px solid ${props => props.isMyTurn ? 'var(--gold)' : 'var(--border)'};
  font-weight: bold;
  
  .round-info {
    font-size: 12px;
    opacity: 0.8;
    margin-top: 4px;
  }
`

const ConnectionStatus = styled.div<{ connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  background: ${props => props.connected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${props => props.connected ? '#22c55e' : '#ef4444'};
  border: 1px solid ${props => props.connected ? '#22c55e' : '#ef4444'};
  
  .status-text {
    font-weight: 500;
  }
`

const DevToolsPanel = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--secondary-bg);
  border: 2px solid #e74c3c;
  border-radius: 8px;
  padding: 12px;
  z-index: 1000;
  
  h4 {
    color: #e74c3c;
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .dev-button {
    background: #e74c3c;
    border: none;
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
    
    &:hover {
      background: #c0392b;
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  }
`

const getImageUrl = (piece: ChessPiece) => {
  if (piece.name === "Poro") {
    return "/icons/poro.png"
  }
  if (piece.name === "Super Minion") {
    return piece.blue ? "/icons/blue_super_minion.png" : "/icons/red_super_minion.png"
  }
  if (piece.name === "Melee Minion") {
    return piece.blue ? "/icons/blue_melee_minion.png" : "/icons/red_melee_minion.png"
  }
  if (piece.name === "Caster Minion") {
    return piece.blue ? "/icons/blue_caster_minion.png" : "/icons/red_caster_minion.png"
  }
  if (piece.name === "Siege Minion") {
    return piece.blue ? "/icons/blue_siege_minion.png" : "/icons/red_siege_minion.png"
  }
  if (piece.name === "Drake") {
    return "/icons/drake.webp"
  }
  if (piece.name === "Baron Nashor") {
    return "/icons/baron.webp"
  }
  return `/icons/${piece.name.toLowerCase().replace(/\s+/g, '')}.webp`
}

// Render individual chess piece
const ChessPieceRenderer: React.FC<{
  piece: ChessPiece
  canSelect: boolean
  onClick: (e: React.MouseEvent) => void
  attackAnimation?: AttackAnimation | null
  moveAnimation?: MoveAnimation | null
  isAnimating?: boolean
  damageEffects?: DamageEffect[]
  isRedPlayer?: boolean
  isDead?: boolean
}> = ({ piece, canSelect, onClick, attackAnimation, moveAnimation, isAnimating = false, damageEffects = [], isRedPlayer = false, isDead = false }) => {
  const hpPercentage = (piece.stats.hp / piece.stats.maxHp) * 100
  const isNeutral = piece.ownerId === "neutral"
  const isAttacking = attackAnimation?.attackerId === piece.id
  const isBeingAttacked = attackAnimation &&
    attackAnimation.targetPos.x === piece.position.x &&
    attackAnimation.targetPos.y === piece.position.y
  const isMoving = moveAnimation?.pieceId === piece.id
  const pieceEffects = damageEffects.filter(effect => effect.targetId === piece.id)

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

    // Convert to visual movement accounting for coordinate system
    // CSS grid flows left-to-right, top-to-bottom
    // But game coordinates might have Y=0 at bottom, increasing upward
    const moveX = deltaX * 30 // X direction
    const moveY = -deltaY * 30 // Y direction (CSS coordinates are inverted)

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

  // Calculate move animation values
  const getMoveAnimation = () => {
    if (!isMoving || !moveAnimation) return {}

    // Calculate the visual direction for movement
    let deltaX = moveAnimation.toPos.x - moveAnimation.fromPos.x
    let deltaY = moveAnimation.toPos.y - moveAnimation.fromPos.y

    // Account for player perspective
    if (isRedPlayer) {
      deltaX = -deltaX
      deltaY = -deltaY
    }

    // Convert to pixel movement
    const moveX = deltaX * 60 // Full movement to new position
    const moveY = -deltaY * 60 // Y direction inverted for CSS

    return {
      x: [0, moveX],
      y: [0, moveY],
      transition: {
        duration: 0.2,
        ease: "linear"
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

  return (
    <ChessPieceComponent
      isBlue={piece.blue}
      isNeutral={isNeutral}
      canSelect={canSelect && !isAnimating && !isDead}
      isAttacking={isAttacking}
      onClick={onClick}
      animate={getCombinedAnimation()}
      whileHover={canSelect && !isAnimating && !isDead ? { scale: 1.05 } : {}}
      whileTap={canSelect && !isAnimating && !isDead ? { scale: 0.95 } : {}}
    >
      <div className="piece-icon">
        <img
          src={getImageUrl(piece)}
          alt={piece.name}
          onError={(e) => {
            // Fallback if image doesn't exist
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
      <div className="piece-name">{piece.name}</div>
      <div className="hp-bar">
        <div
          className="hp-fill"
          style={{ width: `${hpPercentage}%` }}
        />
      </div>

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
    </ChessPieceComponent>
  )
}

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const {
    gameState,
    loading,
    error,
    selectedPiece,
    validMoves,
    validAttacks,
    isMyTurn,
    currentPlayer,
    opponent,
    selectPiece,
    clearSelection,
    executeAction,
    initializeGameplay,
    connected: wsConnected,
    lastUpdate,
  } = useGame(gameId || '')

  // Get current user from auth state
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()

  // Animation state
  const [attackAnimation, setAttackAnimation] = useState<AttackAnimation | null>(null)
  const [moveAnimation, setMoveAnimation] = useState<MoveAnimation | null>(null)
  const [damageEffects, setDamageEffects] = useState<DamageEffect[]>([])
  const [deadPieces, setDeadPieces] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const prevDeadPiecesRef = useRef<Set<string>>(new Set())

  // Get loading state from Redux for reset operation
  const isResetting = useAppSelector((state) => state.game.loading)

  // Initialize gameplay if game is in ban_pick phase
  useEffect(() => {
    if (gameState && gameState.phase === 'ban_pick') {
      initializeGameplay()
    }
  }, [gameState, initializeGameplay])

  // Animate attack
  const animateAttack = useCallback(async (attacker: ChessPiece, target: ChessPosition) => {
    if (isAnimating) return

    setIsAnimating(true)

    // Set attack animation state
    const animation: AttackAnimation = {
      attackerId: attacker.id,
      targetId: `target_${target.x}_${target.y}`,
      attackerPos: attacker.position,
      targetPos: target,
    }

    setAttackAnimation(animation)

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 600))

    // Find the target piece to attach damage effect to
    const targetPiece = gameState?.board.find(p =>
      p.position.x === target.x && p.position.y === target.y && p.stats.hp > 0
    )

    if (targetPiece) {
      // Create damage effect
      const damageEffect: DamageEffect = {
        id: `damage_${Date.now()}`,
        targetId: targetPiece.id,
        damage: Math.floor(Math.random() * 30) + 10, // Placeholder damage
        isDamage: true,
      }

      setDamageEffects(prev => [...prev, damageEffect])

      // Clean up damage effect after animation
      setTimeout(() => {
        setDamageEffects(prev => prev.filter(effect => effect.id !== damageEffect.id))
      }, 1500) // Give damage text time to animate
    }

    // Clean up attack animation
    setTimeout(() => {
      setAttackAnimation(null)
      setIsAnimating(false)
    }, 1000)
  }, [isAnimating, gameState])

  // Animate move
  const animateMove = useCallback(async (piece: ChessPiece, targetPos: ChessPosition) => {
    if (isAnimating) return

    setIsAnimating(true)

    // Set move animation state
    const animation: MoveAnimation = {
      pieceId: piece.id,
      fromPos: piece.position,
      toPos: targetPos,
    }

    setMoveAnimation(animation)

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 400))

    // Clean up move animation
    setTimeout(() => {
      setMoveAnimation(null)
      setIsAnimating(false)
    }, 100)
  }, [isAnimating])

  // Track piece deaths and animate
  useEffect(() => {
    if (!gameState) return

    const newDeadPieces = new Set<string>()
    gameState.board.forEach(piece => {
      if (piece.stats.hp <= 0) {
        newDeadPieces.add(piece.id)
      }
    })

    // Check if there are any new deaths (using previous deadPieces from ref)
    const prevDeadPieces = prevDeadPiecesRef.current
    const newDeathIds = Array.from(newDeadPieces).filter(id => !prevDeadPieces.has(id))

    if (newDeathIds.length > 0) {
      // There are new deaths - delay the update to let damage animations finish
      const timeoutId = setTimeout(() => {
        setDeadPieces(newDeadPieces)
        prevDeadPiecesRef.current = newDeadPieces
      }, 500)

      return () => clearTimeout(timeoutId)
    } else {
      // No new deaths, update immediately
      setDeadPieces(newDeadPieces)
      prevDeadPiecesRef.current = newDeadPieces
    }
  }, [gameState]) // Only depend on gameState

  // Enhanced execute action with animation
  const executeActionWithAnimation = useCallback(async (type: string, casterPosition: ChessPosition, targetPosition: ChessPosition) => {
    if (type === 'attack' && selectedPiece) {
      await animateAttack(selectedPiece, targetPosition)
    } else if (type === 'move' && selectedPiece) {
      await animateMove(selectedPiece, targetPosition)
    }

    executeAction({
      type: type as any,
      casterPosition,
      targetPosition,
    })
  }, [selectedPiece, executeAction, animateAttack, animateMove])

  // Handle square click
  const handleSquareClick = (x: number, y: number) => {
    if (!gameState || !isMyTurn || isAnimating) return
    const clickedPosition = { x, y }

    // Check if clicking on a piece
    const clickedPiece = gameState.board.find(piece =>
      piece.position.x === x && piece.position.y === y && piece.stats.hp > 0
    )

    if (clickedPiece) {
      selectPiece(clickedPiece)
    }

    // Check if clicking on valid move
    if (selectedPiece) {
      const isValidMove = validMoves.some(move => move.x === x && move.y === y)
      const isValidAttack = validAttacks.some(attack => attack.x === x && attack.y === y)

      if (isValidMove) {
        executeActionWithAnimation('move', selectedPiece.position, clickedPosition)
      } else if (isValidAttack) {
        executeActionWithAnimation('attack', selectedPiece.position, clickedPosition)
      } else {
        clearSelection()
      }
    }
  }

  // Use skill action
  const handleSkill = () => {
    if (!selectedPiece || !isMyTurn) return

    executeAction({
      type: 'skill',
      casterPosition: selectedPiece.position,
    })
  }

  // Reset gameplay (dev tools)
  const handleResetGameplay = useCallback(async () => {
    if (!gameId || isResetting) return

    try {
      // Dispatch the reset gameplay thunk
      const result = await dispatch(resetGameplay(gameId))

      if (resetGameplay.fulfilled.match(result)) {
        // Success - clear local animation state
        setAttackAnimation(null)
        setMoveAnimation(null)
        setDamageEffects([])
        setDeadPieces(new Set())
        setIsAnimating(false)
        prevDeadPiecesRef.current = new Set()
        console.log('Gameplay reset successfully')
      } else {
        // Error handled by Redux, but we can show additional feedback
        console.error('Failed to reset gameplay:', result.error?.message)
      }
    } catch (error) {
      console.error('Error resetting gameplay:', error)
    }
  }, [gameId, isResetting, dispatch])

  // Render board squares
  const renderBoard = (): JSX.Element[] => {
    const squares: JSX.Element[] = []

    // Determine if current player is red (should see flipped board)
    const isRedPlayer = !!(gameState && currentUser && gameState.redPlayer === currentUser.id)

    // Helper function to check if a square should be visible and interactive
    const isSquareVisible = (x: number, y: number) => {
      // Hide edge files (-1 and 8) except for specific squares
      if (x === -1) {
        return y === 4 // Only show Baron position (-1,4)
      }
      if (x === 8) {
        return y === 3 // Only show Drake position (8,3)
      }
      return true // Show all other squares
    }

    // Define iteration order based on player perspective
    const yValues = isRedPlayer ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
    const xValues = isRedPlayer ? [8, 7, 6, 5, 4, 3, 2, 1, 0, -1] : [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8]

    // Render squares in the appropriate order for each player
    yValues.forEach(y => {
      xValues.forEach(x => {
        const squareId = `${x}-${y}`
        const shouldShowSquare = isSquareVisible(x, y)

        if (!shouldShowSquare) {
          // Render invisible placeholder to maintain grid structure
          squares.push(
            <div
              key={squareId}
              style={{
                visibility: 'hidden',
                pointerEvents: 'none'
              }}
            />
          )
          return
        }

        const isSelected = selectedPiece && selectedPiece.position.x === x && selectedPiece.position.y === y
        const isValidMove = validMoves.some(move => move.x === x && move.y === y)
        const isValidAttack = validAttacks.some(attack => attack.x === x && attack.y === y)

        const piece = gameState?.board.find(p => p.position.x === x && p.position.y === y && p.stats.hp > 0)

        let squareClass = 'square'
        if (isSelected) squareClass += ' selected'
        if (isValidMove) squareClass += ' valid-move'
        if (isValidAttack) squareClass += ' valid-attack'

        squares.push(
          <div
            key={squareId}
            className={squareClass}
            onClick={() => handleSquareClick(x, y)}
          >
            <div className="coordinates">{x},{y}</div>
            {piece && (
              <ChessPieceRenderer
                piece={piece}
                canSelect={isMyTurn && piece.ownerId === currentPlayer?.userId}
                attackAnimation={attackAnimation}
                moveAnimation={moveAnimation}
                isAnimating={isAnimating}
                damageEffects={damageEffects}
                isRedPlayer={isRedPlayer}
                isDead={deadPieces.has(piece.id)}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent square click
                  // If it's your own piece, select it
                  if (isMyTurn && piece.ownerId === currentPlayer?.userId) {
                    selectPiece(piece);
                  }
                  // If it's an enemy piece on a valid attack square, attack it
                  else if (isValidAttack) {
                    handleSquareClick(x, y);
                  }
                }}
              />
            )}
          </div>
        )
      })
    })

    return squares
  }

  if (loading) {
    return (
      <GameContainer>
        <GameBoard>
          <LoadingOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2>Loading Game...</h2>
            <p>Setting up the battlefield</p>
          </LoadingOverlay>
        </GameBoard>
      </GameContainer>
    )
  }

  if (error) {
    return (
      <GameContainer>
        <GameBoard>
          <LoadingOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2>Error</h2>
            <p>{error}</p>
          </LoadingOverlay>
        </GameBoard>
      </GameContainer>
    )
  }

  if (!gameState) {
    return (
      <GameContainer>
        <GameBoard>
          <LoadingOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2>Game Not Found</h2>
            <p>Could not load game state</p>
          </LoadingOverlay>
        </GameBoard>
      </GameContainer>
    )
  }

  return (
    <GameContainer>
      <PlayersPanel>
        <h3>
          <Users size={20} />
          1v1 Match ({gameState.players.length}/2)
        </h3>
        <PlayerItem>
          <div>
            <div className="player-name">
              #{1} {currentPlayer?.username || 'You'} {isMyTurn ? '⚡' : ''}
            </div>
            <div className="player-stats">
              <div className="stat">
                <Coins size={12} />
                {currentPlayer?.gold || 0}
              </div>
            </div>
          </div>
        </PlayerItem>

        {opponent && (
          <PlayerItem>
            <div>
              <div className="player-name">
                #{2} {opponent.username} {!isMyTurn ? '⚡' : ''}
              </div>
              <div className="player-stats">
                <div className="stat">
                  <Coins size={12} />
                  {opponent.gold}
                </div>
              </div>
            </div>
          </PlayerItem>
        )}
      </PlayersPanel>

      <PlayerInfoPanel>
        <h3>Game Info</h3>
        <div className="player-resources">
          <div className="resource gold">
            <Coins size={18} />
            Gold: {currentPlayer?.gold || 0}
          </div>
          <div className="resource level">
            <Clock size={18} />
            Round: {gameState.currentRound}
          </div>
        </div>
        <p style={{ color: 'var(--secondary-text)', fontSize: '12px' }}>
          Status: {gameState.status} • Phase: {gameState.phase}
        </p>
        <p style={{ color: 'var(--secondary-text)', fontSize: '12px' }}>
          Game ID: {gameId}
        </p>
      </PlayerInfoPanel>

      <GameBoard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <TurnIndicator isMyTurn={isMyTurn}>
            {isMyTurn ? "Your Turn" : "Opponent's Turn"}
            <div className="round-info">Round {gameState.currentRound}</div>
          </TurnIndicator>

        </div>

        {lastUpdate && (
          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--secondary-text)',
            marginBottom: '16px',
            padding: '8px',
            background: 'var(--accent-bg)',
            borderRadius: '4px'
          }}>
            {lastUpdate}
          </div>
        )}

        <Board>
          {renderBoard()}
        </Board>

        {selectedPiece && (
          <GameActions>
            <div style={{
              color: 'var(--primary-text)',
              textAlign: 'center',
              marginBottom: '12px',
              fontSize: '14px'
            }}>
              <strong>{selectedPiece.name}</strong> selected
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                {validMoves.length > 0 && `${validMoves.length} moves available`}
                {validMoves.length > 0 && validAttacks.length > 0 && ' • '}
                {validAttacks.length > 0 && `${validAttacks.length} attacks available`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => clearSelection()}
                style={{ background: 'var(--accent-bg)' }}
              >
                Cancel
              </button>

              {selectedPiece.skill && (
                <button
                  onClick={handleSkill}
                  disabled={selectedPiece.skill.currentCooldown > 0}
                  style={{
                    background: selectedPiece.skill.currentCooldown > 0
                      ? 'var(--accent-bg)'
                      : 'linear-gradient(135deg, var(--blue) 0%, #0891b2 100%)'
                  }}
                >
                  <Zap size={16} />
                  {selectedPiece.skill.name}
                  {selectedPiece.skill.currentCooldown > 0 && ` (${selectedPiece.skill.currentCooldown})`}
                </button>
              )}
            </div>

            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'var(--primary-bg)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--secondary-text)',
              textAlign: 'center'
            }}>
              💡 <strong>Click green squares</strong> to move • <strong>Click red squares</strong> to attack
              {selectedPiece.skill && (
                <>
                  <br />⚡ <strong>Click skill button</strong> to use {selectedPiece.skill.name}
                </>
              )}
            </div>
          </GameActions>
        )}
      </GameBoard>

      {/* Development Tools - Only show in development environment */}
      {import.meta.env.VITE_NODE_ENV === 'development' && (
        <DevToolsPanel>
          <h4>🔧 Dev Tools</h4>
          <button
            className="dev-button"
            onClick={handleResetGameplay}
            disabled={isResetting || !gameState}
            title="Reset the game to initial state"
          >
            <RotateCcw size={14} />
            {isResetting ? 'Resetting...' : 'Reset Game'}
          </button>
        </DevToolsPanel>
      )}
    </GameContainer>
  )
}

export default GamePage
