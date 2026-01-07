import { AnimatePresence, motion } from 'framer-motion'
import { Users } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import { AttackProjectileRenderer } from '../animations/AttackProjectileRenderer'
import { getSkillAnimationRenderer } from '../animations/SkillAnimator'
import { ChessDetailPanelRenderer } from '../components/ChessDetailPanelRenderer'
import { ChessPieceRenderer } from '../components/ChessPieceRenderer'
import { DevToolsRenderer } from '../components/DevToolsRenderer'
import { VictoryDefeatOverlay } from '../components/VictoryDefeatOverlay'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { AttackProjectile, useChampions } from '../hooks/useChampions'
import { ChessPiece, ChessPosition, GameState, useGame } from '../hooks/useGame'
import { fetchAllItems, fetchBasicItems, fetchViktorModules, ItemData } from '../store/itemsSlice'
import { AttackAnimation, DamageEffect, ItemPurchaseAnimation, MoveAnimation } from '../types/animation'
import { AnimationAction, AnimationEngine } from '../utils/animationEngine'
import { getImageUrl, isChampion } from '../utils/chessHelper'

const GameContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  grid-template-areas: 
    "players-list game-board"
    "player-info game-board";
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr;
  column-gap: 16px;
  row-gap: 16px;
  height: 100vh;
  overflow: hidden;
`

const PlayersPanel = styled.div`
  grid-area: players-list;
  background: linear-gradient(135deg, rgba(30, 35, 40, 0.95) 0%, rgba(20, 25, 35, 0.95) 100%);
  border: 2px solid rgba(200, 155, 60, 0.3);
  border-radius: 12px;
  border-bottom: none;
  padding: 18px;
  overflow-y: auto;
  max-height: 30vh;
  box-shadow: 
    inset 0 0 20px rgba(0, 0, 0, 0.3),
    0 4px 16px rgba(0, 0, 0, 0.4);
  
  h3 {
    color: var(--gold);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    font-weight: bold;
    letter-spacing: 0.5px;
  }
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(10, 14, 39, 0.5);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #ffd700 0%, var(--gold) 100%);
  }
`

const PlayerItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  margin-bottom: 10px;
  background: linear-gradient(135deg, rgba(10, 14, 39, 0.6) 0%, rgba(20, 25, 45, 0.6) 100%);
  border-radius: 8px;
  border: 2px solid rgba(200, 155, 60, 0.4);
  border-left: 4px solid var(--gold);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateX(4px);
    border-left-width: 6px;
    box-shadow: 0 4px 12px rgba(200, 155, 60, 0.3);
  }
  
  .player-name {
    color: var(--primary-text);
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    font-size: 15px;
  }
  
  .player-stats {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: var(--secondary-text);
    
    .stat {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #ffd700;
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    }
  }
`

const DeadChampionsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(200, 155, 60, 0.2);
`

const DeadChampionBadge = styled.div`
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 2px solid #ef4444;
  background: rgba(239, 68, 68, 0.2);
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: grayscale(80%);
    opacity: 0.7;
  }
`

const RespawnTimer = styled.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 4px;
  min-width: 14px;
  text-align: center;
`

const GameBoard = styled.div<{ isTargeting?: boolean }>`
  grid-area: game-board;
  background: linear-gradient(135deg, rgba(10, 14, 39, 0.95) 0%, rgba(20, 25, 45, 0.95) 100%);
  border: 2px solid rgba(200, 155, 60, 0.3);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 
    inset 0 0 30px rgba(0, 0, 0, 0.5),
    0 8px 32px rgba(0, 0, 0, 0.6);
  cursor: ${props => props.isTargeting ? 'crosshair' : 'default'};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(200, 155, 60, 0.1) 0%, transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.05) 0%, transparent 40%);
    pointer-events: none;
    border-radius: 12px;
  }
  
  h3 {
    color: var(--gold);
    margin-bottom: 16px;
    text-align: center;
    font-size: 1.3rem;
  }
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(10, 14, 39, 0.5);
    border-radius: 5px;
    border: 1px solid rgba(200, 155, 60, 0.2);
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
    border-radius: 5px;
    border: 1px solid rgba(0, 0, 0, 0.3);
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #ffd700 0%, var(--gold) 100%);
    box-shadow: 0 0 10px rgba(200, 155, 60, 0.5);
  }
`

const Board = styled.div<{ isTargeting?: boolean }>`
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(8, 1fr);
  gap: 3px;
  background-image: url('/ui/board.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  padding: 40px;
  aspect-ratio: 10 / 8;
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6));
  cursor: ${props => props.isTargeting ? 'crosshair' : 'default'};
  
  .square {
    background: rgba(30, 35, 40, 0.4);
    border: 1px solid rgba(200, 155, 60, 0.3);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--secondary-text);
    font-size: 10px;
    transition: all 0.2s ease;
    cursor: ${props => props.isTargeting ? 'crosshair' : 'pointer'};
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
    
    &.valid-skill {
      background: rgba(168, 85, 247, 0.35);
      border-color: #a855f7;
      cursor: pointer;
      position: relative;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.5);
      animation: skillPulse 1.5s ease-in-out infinite;
      
      &:after {
        content: '⚡';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #a855f7;
        font-size: 20px;
        font-weight: bold;
        text-shadow: 0 0 8px rgba(168, 85, 247, 0.8);
        filter: drop-shadow(0 0 4px rgba(168, 85, 247, 1));
      }
      
      &:hover {
        background: rgba(168, 85, 247, 0.5);
        transform: scale(1.05);
        box-shadow: 0 0 20px rgba(168, 85, 247, 0.8);
      }
      
      @keyframes skillPulse {
        0%, 100% {
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.9);
        }
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

const DrawOfferModal = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--secondary-bg);
  border: 2px solid var(--gold);
  border-radius: 12px;
  padding: 32px;
  z-index: 9998;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  min-width: 400px;
  text-align: center;

  h2 {
    color: var(--gold);
    font-size: 24px;
    margin-bottom: 16px;
  }

  p {
    color: var(--primary-text);
    font-size: 16px;
    margin-bottom: 24px;
  }

  .button-group {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  button {
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;

    &.accept {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
      }
    }

    &.decline {
      background: transparent;
      border: 2px solid var(--border);
      color: var(--primary-text);

      &:hover {
        border-color: #ef4444;
        color: #ef4444;
      }
    }
  }
`

const DrawOfferBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9997;
  backdrop-filter: blur(4px);
`

const DrawOfferSentNotification = styled(motion.div)`
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--secondary-bg);
  border: 2px solid var(--blue);
  border-radius: 8px;
  padding: 16px 24px;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);

  .title {
    color: var(--blue);
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .message {
    color: var(--secondary-text);
    font-size: 12px;
  }
`

const StatTooltip = styled(motion.div)`
  position: fixed;
  background: rgba(10, 14, 39, 0.98);
  color: var(--primary-text);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10000;
  border: 1px solid var(--gold);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  transform: translate(-50%, -100%);
  margin-top: -8px;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: var(--gold);
  }
`

const SkillTargetingIndicator = styled(motion.div)`
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.95) 0%, rgba(147, 51, 234, 0.95) 100%);
  border: 3px solid #a855f7;
  border-radius: 12px;
  padding: 16px 32px;
  box-shadow: 0 8px 32px rgba(168, 85, 247, 0.5);
  pointer-events: none;
  
  .indicator-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .indicator-icon {
    font-size: 24px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .indicator-text {
    color: white;
    font-size: 15px;
    font-weight: bold;
    text-align: center;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  }
  
  .indicator-cancel {
    color: rgba(255, 255, 255, 0.8);
    font-size: 11px;
    text-align: center;
    margin-top: 2px;
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
`

const TurnIndicator = styled(motion.div) <{ isMyTurn: boolean }>`
  text-align: center;
  padding: 16px 40px;
  background-image: url('/ui/info.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  min-width: 280px;
  position: relative;
  filter: ${props => props.isMyTurn
    ? 'drop-shadow(0 0 20px rgba(200, 155, 60, 0.8)) brightness(1.2)'
    : 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5)) brightness(0.9)'};
  transition: all 0.3s ease;
  
  font-weight: bold;
  font-size: 18px;
  color: ${props => props.isMyTurn ? '#FFF' : 'var(--gold)'};
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  letter-spacing: 1px;
  
  .round-info {
    font-size: 13px;
    opacity: 0.9;
    margin-top: 4px;
    color: var(--gold);
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  animation: ${props => props.isMyTurn ? 'pulse 2s ease-in-out infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { filter: drop-shadow(0 0 20px rgba(200, 155, 60, 0.8)) brightness(1.2); }
    50% { filter: drop-shadow(0 0 30px rgba(200, 155, 60, 1)) brightness(1.3); }
  }
`

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const {
    gameState,
    displayState,
    gameStateQueue,
    setIsAnimating: setHookIsAnimating,
    onAnimationComplete,
    loading,
    error,
    selectedPiece,
    validMoves,
    validAttacks,
    validSkillTargets,
    isSkillMode,
    isMyTurn,
    currentPlayer,
    opponent,
    selectPiece,
    clearSelection,
    executeAction,
    initializeGameplay,
    activateSkillMode,
    resign,
    offerDraw,
    respondToDraw,
    buyItem: buyItemWS,
    drawOfferReceived,
    setDrawOfferReceived,
    drawOfferSent,
  } = useGame(gameId || '')

  // Get current user from auth state
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()

  // Get items from Redux store
  const { basicItems, allItems, viktorModules, loading: itemsLoading } = useAppSelector((state) => state.items)

  // Fetch items on component mount
  useEffect(() => {
    if (basicItems.length === 0 && !itemsLoading) {
      dispatch(fetchBasicItems())
    }
    if (allItems.length === 0 && !itemsLoading) {
      dispatch(fetchAllItems())
    }
    if (viktorModules.length === 0 && !itemsLoading) {
      dispatch(fetchViktorModules())
    }
  }, [dispatch, basicItems.length, allItems.length, viktorModules.length, itemsLoading])

  // Animation state
  const [attackAnimation, setAttackAnimation] = useState<AttackAnimation | null>(null)
  const [moveAnimation, setMoveAnimation] = useState<MoveAnimation | null>(null)
  const [damageEffects, setDamageEffects] = useState<DamageEffect[]>([])
  const [itemPurchaseAnimations, setItemPurchaseAnimations] = useState<ItemPurchaseAnimation[]>([])
  const [deadPieces, setDeadPieces] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const prevDeadPiecesRef = useRef<Set<string>>(new Set())
  const [activeSkillAnimation, setActiveSkillAnimation] = useState<{
    id: string
    component: JSX.Element | null
  } | null>(null)
  const [activeAttackProjectiles, setActiveAttackProjectiles] = useState<Array<{
    id: string
    attackerPosition: ChessPosition
    targetPosition: ChessPosition
    projectile: AttackProjectile
    guinsooProc?: boolean
  }>>([])

  // Get available champions for attack projectile data
  const { champions: availableChampions } = useChampions()

  // Track previous game state for animation
  const animationQueueRef = useRef<AnimationAction[]>([])
  const isPlayingAnimationsRef = useRef(false)

  // Board ref for calculating actual cell dimensions
  const boardRef = useRef<HTMLDivElement>(null)

  // Detail view state - separate from action selection
  const [detailViewPiece, setDetailViewPiece] = useState<ChessPiece | null>(null)

  // Tooltip state for positioning
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; content: string } | null>(null)

  // Get loading state from Redux for reset operation
  const isResetting = useAppSelector((state) => state.game.loading)

  // Update detailViewPiece when displayState changes (to reflect item purchases, etc.)
  useEffect(() => {
    if (detailViewPiece && displayState) {
      const updatedPiece = displayState.board.find(p => p.id === detailViewPiece.id)
      if (updatedPiece) {
        setDetailViewPiece(updatedPiece)
      }
    }
  }, [displayState, detailViewPiece?.id])

  // Handle buying items
  const handleBuyItem = useCallback((itemId: string, championId: string) => {
    if (!gameId || !isMyTurn || !buyItemWS) return;

    buyItemWS(itemId, championId);
    // Clear selection to remove valid move/attack indicators
    clearSelection();
  }, [gameId, isMyTurn, buyItemWS, clearSelection]);

  // Initialize gameplay if game is in ban_pick phase
  useEffect(() => {
    if (gameState && gameState.phase === 'ban_pick') {
      initializeGameplay()
    }
  }, [gameState, initializeGameplay])

  // Update dead pieces based on displayState (not gameState)
  // This ensures pieces are marked as dead only when displayed, not during animations
  useEffect(() => {
    if (!displayState) return

    const newDeadPieces = new Set<string>()
    displayState.board.forEach(piece => {
      if (piece.stats.hp <= 0) {
        newDeadPieces.add(piece.id)
      }
    })
    setDeadPieces(newDeadPieces)
    prevDeadPiecesRef.current = newDeadPieces
  }, [displayState])

  // Play individual animation
  const playAnimation = useCallback(async (animation: AnimationAction) => {
    switch (animation.type) {
      case 'move': {
        const { pieceId, fromPosition, toPosition } = animation.data
        setMoveAnimation({
          pieceId,
          fromPos: fromPosition,
          toPos: toPosition,
        })
        await new Promise(resolve => setTimeout(resolve, animation.duration))
        setMoveAnimation(null)
        break
      }

      case 'attack': {
        const { attackerId, attackerPosition, targetId, targetPosition, guinsooProc } = animation.data

        // Find the attacker piece to check for ranged attack projectile
        const attackerPiece = displayState?.board.find(p => p.id === attackerId)
        // Check piece's own attackProjectile first (for minions), then look up champion data
        let attackProjectile = (attackerPiece as any)?.attackProjectile
        if (!attackProjectile && attackerPiece) {
          const championData = availableChampions.find(c => c.name === attackerPiece.name)
          attackProjectile = championData?.attackProjectile
        }

        // If attacker has attackProjectile config, show projectile animation instead of melee lunge
        if (attackProjectile) {
          // Calculate ranged attack duration based on distance
          // Charging: 200ms, Flight: varies by distance (min 250ms), Impact: 300ms
          const deltaX = Math.abs(targetPosition.x - attackerPosition.x)
          const deltaY = Math.abs(targetPosition.y - attackerPosition.y)
          const chessDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
          const speed = attackProjectile.speed ?? 1
          const flightDuration = Math.max(250, (chessDistance * 100) / speed)
          // Add extra time for Guinsoo ghost projectile (120ms delay + same flight duration + impact)
          const guinsooExtraDuration = guinsooProc ? 120 + flightDuration + 300 : 0
          const totalDuration = 200 + flightDuration + 300 + guinsooExtraDuration // charge + flight + impact (+ guinsoo ghost)

          // Add projectile animation to array (supports multiple simultaneous projectiles)
          const projectileData = {
            id: animation.id,
            attackerPosition,
            targetPosition,
            projectile: attackProjectile,
            guinsooProc,
          }
          setActiveAttackProjectiles(prev => [...prev, projectileData])
          await new Promise(resolve => setTimeout(resolve, totalDuration))
          // Remove this specific projectile after animation completes
          setActiveAttackProjectiles(prev => prev.filter(p => p.id !== animation.id))
        } else {
          // Melee attack - use existing lunge animation
          setAttackAnimation({
            attackerId,
            targetId,
            attackerPos: attackerPosition,
            targetPos: targetPosition,
            guinsooProc,
          })
          await new Promise(resolve => setTimeout(resolve, animation.duration))
          setAttackAnimation(null)
        }
        break
      }

      case 'damage': {
        const { pieceId, damage, isDamage } = animation.data
        const damageEffect: DamageEffect = {
          id: animation.id,
          targetId: pieceId,
          damage,
          isDamage,
        }
        setDamageEffects(prev => [...prev, damageEffect])

        // Clean up after the full animation duration
        setTimeout(() => {
          setDamageEffects(prev => prev.filter(e => e.id !== animation.id))
        }, animation.duration + 200) // Extra buffer to ensure animation completes

        // Wait for the animation to play (but not the full duration to avoid blocking)
        await new Promise(resolve => setTimeout(resolve, Math.min(animation.duration, 800)))
        break
      }

      case 'stat_change': {
        const { pieceId, stat, oldValue, newValue } = animation.data
        const diff = newValue - oldValue
        const isIncrease = diff > 0

        // Show stat change as floating text
        const statEffect: DamageEffect = {
          id: animation.id,
          targetId: pieceId,
          damage: Math.abs(diff),
          isDamage: !isIncrease,
        }
        setDamageEffects(prev => [...prev, statEffect])

        // Clean up after the full animation duration
        setTimeout(() => {
          setDamageEffects(prev => prev.filter(e => e.id !== animation.id))
        }, animation.duration + 200) // Extra buffer to ensure animation completes

        // Wait for the animation to play (but not the full duration to avoid blocking)
        await new Promise(resolve => setTimeout(resolve, Math.min(animation.duration, 800)))
        break
      }

      case 'skill': {
        const { casterId, casterPosition, skillName, targetPosition, targetId, pulledToPosition, cardTargets, totalCardCount, whirlwindTargets, viktorModules, criticalFlankAdvancePosition } = animation.data
        const skillRenderer = getSkillAnimationRenderer(skillName)

        // Determine if current player is red (for coordinate transformation)
        const isRedPlayer = !!(gameState && currentUser && gameState.redPlayer === currentUser.id)

        // Store skill animation component in state to render
        setActiveSkillAnimation({
          id: animation.id,
          component: skillRenderer.render({
            casterId,
            casterPosition,
            targetPosition,
            targetId,
            skillName,
            boardRef,
            isRedPlayer,
            pulledToPosition,
            cardTargets,
            totalCardCount,
            whirlwindTargets,
            viktorModules,
            criticalFlankAdvancePosition,
          })
        })

        // Wait for the full animation duration
        await new Promise(resolve => setTimeout(resolve, animation.duration))

        // Clean up animation after it completes
        setActiveSkillAnimation(null)
        break
      }

      case 'death': {
        // Death animation is handled by the CSS fade-out based on deadPieces set
        await new Promise(resolve => setTimeout(resolve, animation.duration))
        break
      }

      case 'buy_item': {
        const { targetId, itemId } = animation.data

        // Find item data to get icon
        const itemData = allItems.find((item: ItemData) => item.id === itemId)

        const purchaseAnimation: ItemPurchaseAnimation = {
          id: animation.id,
          targetId,
          itemId,
          itemIcon: itemData?.icon,
        }


        setItemPurchaseAnimations(prev => [...prev, purchaseAnimation])

        // Clean up after animation
        setTimeout(() => {
          setItemPurchaseAnimations(prev => prev.filter(a => a.id !== animation.id))
        }, animation.duration)

        await new Promise(resolve => setTimeout(resolve, animation.duration))
        break
      }

      default:
        break
    }
  }, [allItems, boardRef, currentUser, gameState, displayState, availableChampions])

  // Play animation sequence
  const playAnimationSequence = useCallback(async (animations: AnimationAction[]) => {
    try {
      isPlayingAnimationsRef.current = true
      setIsAnimating(true)
      setHookIsAnimating(true)

      // Sort animations by delay
      const sortedAnimations = [...animations].sort((a, b) => a.delay - b.delay)

      // Group animations by delay to play them in parallel
      const animationGroups = new Map<number, AnimationAction[]>()
      sortedAnimations.forEach(anim => {
        const group = animationGroups.get(anim.delay) || []
        group.push(anim)
        animationGroups.set(anim.delay, group)
      })

      // Play each group in sequence
      const delays = Array.from(animationGroups.keys()).sort((a, b) => a - b)

      for (let i = 0; i < delays.length; i++) {
        const delay = delays[i]
        const group = animationGroups.get(delay)!

        // Wait until this delay time
        if (i === 0 && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        } else if (i > 0) {
          const waitTime = delay - delays[i - 1]
          if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }

        // Play all animations in this group simultaneously
        const promises = group.map(anim => playAnimation(anim))
        await Promise.all(promises)
      }

      // After all animations complete, signal completion to process next queue item
      onAnimationComplete()
    } catch (error) {
      console.error('Animation error:', error)
      // On error, still try to complete to avoid stuck state
      onAnimationComplete()
    } finally {
      // Always clean up, even if there's an error
      isPlayingAnimationsRef.current = false
      setIsAnimating(false)
      setHookIsAnimating(false)
      // Clear any lingering animation states
      setMoveAnimation(null)
      setAttackAnimation(null)
      // Note: We don't clear damageEffects and itemPurchaseAnimations here
      // as they manage their own cleanup with setTimeout
    }
  }, [onAnimationComplete, setHookIsAnimating, playAnimation])

  // Play animation sequence when queue has items and we're not currently animating
  useEffect(() => {
    if (gameStateQueue.length === 0 || isPlayingAnimationsRef.current) return

    const nextItem = gameStateQueue[0]

    // Generate animation sequence from old state to new state
    const animations = AnimationEngine.generateAnimationSequence(
      nextItem.newState,
      nextItem.oldState
    )

    if (animations.length > 0) {
      animationQueueRef.current = animations
      playAnimationSequence(animations)
    } else {
      // No animations to play - move to next item in queue
      onAnimationComplete()
    }
  }, [gameStateQueue, onAnimationComplete, playAnimationSequence])

  // Enhanced execute action - now animations are server-driven
  const executeActionWithAnimation = useCallback(async (type: string, casterPosition: ChessPosition, targetPosition: ChessPosition) => {
    // Just execute the action, animations will be played when the server responds
    executeAction({
      type: type as any,
      casterPosition,
      targetPosition,
    })
  }, [executeAction])

  // Handle detail view click - can click any piece anytime
  const handleDetailClick = (piece: ChessPiece) => {
    setDetailViewPiece(piece)
  }

  // Handle square click for actions
  const handleSquareClick = (x: number, y: number) => {
    if (!gameState || !displayState || !isMyTurn || isAnimating) return
    const clickedPosition = { x, y }

    // Check if clicking on a piece (use displayState for visual feedback)
    const clickedPiece = displayState.board.find(piece =>
      piece.position.x === x && piece.position.y === y && piece.stats.hp > 0
    )

    // If in skill mode, check for valid skill target
    if (isSkillMode && selectedPiece) {
      const isValidSkillTarget = validSkillTargets.some(target => target.x === x && target.y === y)

      if (isValidSkillTarget) {
        executeActionWithAnimation('skill', selectedPiece.position, clickedPosition)
      } else {
        // Cancel skill mode if clicking invalid target
        clearSelection()
      }
      return
    }

    if (clickedPiece && clickedPiece.ownerId === currentPlayer?.userId) {
      // Only select own pieces for actions
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

  // Use skill action - enter targeting mode or execute immediately for non-targeted skills
  const handleSkill = () => {
    if (!selectedPiece || !isMyTurn || !selectedPiece.skill) return

    const skill = selectedPiece.skill

    // If skill requires no target (passive or targetTypes === "none"), execute immediately
    if (!skill.targetTypes || skill.targetTypes === "none") {
      executeAction({
        type: 'skill',
        casterPosition: selectedPiece.position,
      })
    } else {
      // Enter skill targeting mode
      activateSkillMode(selectedPiece)
    }
  }

  // Handle dev tools reset completion
  const handleDevToolsResetComplete = useCallback(() => {
    setAttackAnimation(null)
    setMoveAnimation(null)
    setDamageEffects([])
    setItemPurchaseAnimations([])
    setDeadPieces(new Set())
    setIsAnimating(false)
    setDetailViewPiece(null)
    setActiveSkillAnimation(null)
    prevDeadPiecesRef.current = new Set()
  }, [])

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
        const isValidSkill = validSkillTargets.some(target => target.x === x && target.y === y)

        // Prioritize living pieces over recently dead ones at the same position
        // This is important for Critical Flank where attacker moves to dead target's position
        const piece = displayState?.board.find(p => p.position.x === x && p.position.y === y && p.stats.hp > 0)
          || displayState?.board.find(p => p.position.x === x && p.position.y === y && p.stats.hp <= 0 && p.deadAtRound === displayState?.currentRound - 1)

        let squareClass = 'square'
        if (isSelected) squareClass += ' selected'
        if (isSkillMode && isValidSkill) squareClass += ' valid-skill'
        else if (isValidMove) squareClass += ' valid-move'
        else if (isValidAttack) squareClass += ' valid-attack'

        squares.push(
          <div
            key={squareId}
            className={squareClass}
            onClick={() => handleSquareClick(x, y)}
          >
            {piece && (
              <ChessPieceRenderer
                piece={piece}
                imageUrl={getImageUrl(piece)}
                isChampion={isChampion(piece)}
                canSelect={isMyTurn && piece.ownerId === currentPlayer?.userId}
                attackAnimation={attackAnimation}
                moveAnimation={moveAnimation}
                isAnimating={isAnimating}
                damageEffects={damageEffects}
                itemPurchaseAnimations={itemPurchaseAnimations}
                isRedPlayer={isRedPlayer}
                isDead={deadPieces.has(piece.id)}
                boardRef={boardRef}
                allItems={allItems}
                currentRound={displayState?.currentRound || gameState?.currentRound || 0}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent square click

                  // Always set detail view for any piece
                  handleDetailClick(piece);

                  // If in skill mode and this is a valid target, execute skill
                  if (isSkillMode && isValidSkill) {
                    handleSquareClick(x, y);
                  }
                  // Action selection logic (only for own pieces during turn)
                  else if (isMyTurn && piece.ownerId === currentPlayer?.userId) {
                    selectPiece(piece);
                  }
                  // If it's an enemy piece on a valid attack square, attack it
                  else if (isValidAttack) {
                    handleSquareClick(x, y);
                  }
                }}
                onSkillClick={() => {
                  if (isMyTurn && piece.ownerId === currentPlayer?.userId && piece.skill?.type === 'active') {
                    // If already in skill mode for the SAME piece, cancel it
                    if (isSkillMode && selectedPiece?.id === piece.id) {
                      clearSelection();
                    } else {
                      // If in skill mode for a DIFFERENT piece, clear first
                      if (isSkillMode) {
                        clearSelection();
                        // Use setTimeout to ensure state is cleared before selecting new piece
                        setTimeout(() => {
                          selectPiece(piece);
                          handleSkill();
                        }, 0);
                      } else {
                        // Not in skill mode, just select and activate
                        selectPiece(piece);
                        handleSkill();
                      }
                    }
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
    <>
      {/* Tooltip */}
      <AnimatePresence>
        {tooltipPosition && (
          <StatTooltip
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
          >
            {tooltipPosition.content}
          </StatTooltip>
        )}
      </AnimatePresence>

      {/* Draw offer modal */}
      {drawOfferReceived && (
        <>
          <DrawOfferBackdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              // Clicking backdrop declines the offer
              respondToDraw(false);
              setDrawOfferReceived(false);
            }}
          />
          <DrawOfferModal
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <h2>Draw Offer</h2>
            <p>Your opponent has offered a draw. Do you accept?</p>
            <div className="button-group">
              <button
                className="accept"
                onClick={() => {
                  respondToDraw(true);
                  setDrawOfferReceived(false);
                }}
              >
                ✅ Accept Draw
              </button>
              <button
                className="decline"
                onClick={() => {
                  respondToDraw(false);
                  setDrawOfferReceived(false);
                }}
              >
                ❌ Decline
              </button>
            </div>
          </DrawOfferModal>
        </>
      )}

      {/* Draw offer sent notification */}
      {drawOfferSent && (
        <DrawOfferSentNotification
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
        >
          <div className="title">Draw Offer Sent</div>
          <div className="message">Waiting for opponent's response...</div>
        </DrawOfferSentNotification>
      )}

      {/* Victory/Defeat Overlay */}
      <VictoryDefeatOverlay
        gameState={gameState}
        currentUserId={currentUser?.id}
        onReturnToLobby={() => window.location.href = '/'}
      />

      {/* Main Game UI */}
      <GameContainer>
        <PlayersPanel>
          <h3>
            <Users size={20} />
            1v1 Match ({gameState.players.length}/2)
          </h3>
          <PlayerItem>
            <div>
              <div className="player-name">
                {currentPlayer?.username || 'You'} {isMyTurn ? <img src="/icons/left-arrow.png" alt="Lightning" width={14} height={14} /> : ''}
              </div>
              <div className="player-stats">
                <div className="stat">
                  <img src="/icons/dollar.png" alt="Gold" width={14} height={14} />
                  {currentPlayer?.gold || 0}
                </div>
              </div>
            </div>
          </PlayerItem>
          {/* Dead champions section for current player */}
          {(() => {
            const deadPiecesForPlayer = displayState?.board.filter(
              p => p.ownerId === currentPlayer?.userId && 
                   p.stats.hp <= 0 && 
                   p.respawnAtRound !== undefined && 
                   p.respawnAtRound > (displayState?.currentRound || 0)
            ) || []
            
            if (deadPiecesForPlayer.length === 0) return null
            
            return (
              <DeadChampionsSection>
                {deadPiecesForPlayer.map(piece => (
                  <DeadChampionBadge key={piece.id} title={`${piece.name} - Respawns in ${piece.respawnAtRound! - (displayState?.currentRound || 0)} rounds`}>
                    <img src={getImageUrl(piece)} alt={piece.name} />
                    <RespawnTimer>
                      {piece.respawnAtRound! - (displayState?.currentRound || 0)}
                    </RespawnTimer>
                  </DeadChampionBadge>
                ))}
              </DeadChampionsSection>
            )
          })()}

          {opponent && (
            <PlayerItem>
              <div>
                <div className="player-name">
                  {opponent.username} {!isMyTurn ? <img src="/icons/left-arrow.png" alt="Lightning" width={14} height={14} /> : ''}
                </div>
                <div className="player-stats">
                  <div className="stat">
                    <img src="/icons/dollar.png" alt="Gold" width={14} height={14} />
                    {opponent.gold}
                  </div>
                </div>
              </div>
            </PlayerItem>
          )}
          {/* Dead champions section for opponent */}
          {opponent && (() => {
            const deadPiecesForOpponent = displayState?.board.filter(
              p => p.ownerId === opponent?.userId && 
                   p.stats.hp <= 0 && 
                   p.respawnAtRound !== undefined && 
                   p.respawnAtRound > (displayState?.currentRound || 0)
            ) || []
            
            if (deadPiecesForOpponent.length === 0) return null
            
            return (
              <DeadChampionsSection>
                {deadPiecesForOpponent.map(piece => (
                  <DeadChampionBadge key={piece.id} title={`${piece.name} - Respawns in ${piece.respawnAtRound! - (displayState?.currentRound || 0)} rounds`}>
                    <img src={getImageUrl(piece)} alt={piece.name} />
                    <RespawnTimer>
                      {piece.respawnAtRound! - (displayState?.currentRound || 0)}
                    </RespawnTimer>
                  </DeadChampionBadge>
                ))}
              </DeadChampionsSection>
            )
          })()}
        </PlayersPanel>

        <ChessDetailPanelRenderer
          detailViewPiece={detailViewPiece}
          currentPlayer={currentPlayer}
          isMyTurn={isMyTurn}
          hasBoughtItemThisTurn={gameState?.hasBoughtItemThisTurn || false}
          hasPerformedActionThisTurn={gameState?.hasPerformedActionThisTurn || false}
          setTooltipPosition={setTooltipPosition as (tooltipPosition: { top: number; left: number; content: string } | null) => void}
          handleBuyItem={handleBuyItem}
          basicItems={basicItems}
          allItems={allItems}
          viktorModules={viktorModules}
          shopItems={gameState?.shopItems || null}
          itemsLoading={itemsLoading}
        />

        <GameBoard isTargeting={isSkillMode}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
            <TurnIndicator isMyTurn={isMyTurn}>
              {isMyTurn ? "Your Turn" : "Opponent's Turn"}
              <div className="round-info">Round {Math.floor((displayState?.currentRound || gameState?.currentRound || 0) / 2) + 1}</div>
            </TurnIndicator>

            {/* Skill Targeting Indicator */}
            <AnimatePresence>
              {isSkillMode && selectedPiece && (
                <SkillTargetingIndicator
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="indicator-content">
                    <div className="indicator-icon">🎯</div>
                    <div>
                      <div className="indicator-text">
                        Select Target for {selectedPiece.skill?.name || 'Skill'} ({validSkillTargets.length} available)
                      </div>
                      <div className="indicator-cancel">
                        Click skill icon again to cancel
                      </div>
                    </div>
                  </div>
                </SkillTargetingIndicator>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  background: 'transparent',
                  border: '2px solid var(--blue)',
                  color: 'var(--blue)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--blue)'
                  e.currentTarget.style.color = 'var(--primary-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--blue)'
                }}
                onClick={() => {
                  offerDraw();
                }}
              >
                🤝 Offer Draw
              </button>

              <button
                style={{
                  background: 'transparent',
                  border: '2px solid #ef4444',
                  color: '#ef4444',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ef4444'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#ef4444'
                }}
                onClick={() => {
                  if (window.confirm('Are you sure you want to resign? This will end the game.')) {
                    resign();
                  }
                }}
              >
                🏳️ Resign
              </button>
            </div>
          </div>

          <Board ref={boardRef} isTargeting={isSkillMode}>
            {renderBoard()}

            {/* Attack projectile animations overlay - supports multiple simultaneous projectiles */}
            <AnimatePresence>
              {activeAttackProjectiles.map(projectile => (
                <div
                  key={projectile.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 100
                  }}
                >
                  <AttackProjectileRenderer
                    attackerPosition={projectile.attackerPosition}
                    targetPosition={projectile.targetPosition}
                    projectile={projectile.projectile}
                    boardRef={boardRef}
                    isRedPlayer={!!(gameState && currentUser && gameState.redPlayer === currentUser.id)}
                    guinsooProc={projectile.guinsooProc}
                  />
                </div>
              ))}
            </AnimatePresence>

            {/* Skill animations overlay */}
            <AnimatePresence mode="wait">
              {activeSkillAnimation && (
                <div
                  key={activeSkillAnimation.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 100
                  }}
                >
                  {activeSkillAnimation.component}
                </div>
              )}
            </AnimatePresence>
          </Board>

        </GameBoard>

        {/* Development Tools */}
        <DevToolsRenderer
          gameId={gameId || ''}
          gameState={gameState}
          onResetComplete={handleDevToolsResetComplete}
        />
      </GameContainer>
    </>
  )
}

export default GamePage
