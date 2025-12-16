import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Coins, Crown, Package, RotateCcw, Shield, ShoppingCart, Users, Zap } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import { getSkillAnimationRenderer } from '../animations/SkillAnimator'
import { AttackRangeIndicator } from '../components/AttackRangeIndicator'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { ChessPiece, ChessPosition, GameState, useGame } from '../hooks/useGame'
import { resetGameplay, restoreHp, restoreCooldown } from '../store/gameSlice'
import { fetchAllItems, fetchBasicItems, ItemData } from '../store/itemsSlice'
import { AnimationAction, AnimationEngine } from '../utils/animationEngine'

interface AttackAnimation {
  attackerId: string
  targetId: string
  attackerPos: ChessPosition
  targetPos: ChessPosition
  damage?: number
  guinsooProc?: boolean
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

interface ItemPurchaseAnimation {
  id: string
  targetId: string // ID of the champion who bought the item
  itemId: string
  itemIcon?: string
}

const GameContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  grid-template-areas: 
    "players-list game-board"
    "player-info game-board";
  grid-template-columns: 280px 1fr;
  gap: 16px;
  height: 100vh;
  overflow: hidden;
`

const PlayersPanel = styled.div`
  grid-area: players-list;
  background: linear-gradient(135deg, rgba(30, 35, 40, 0.95) 0%, rgba(20, 25, 35, 0.95) 100%);
  border: 2px solid rgba(200, 155, 60, 0.3);
  border-radius: 12px;
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

const ChessDetailPanel = styled.div`
  grid-area: player-info;
  background: linear-gradient(135deg, rgba(30, 35, 40, 0.95) 0%, rgba(20, 25, 35, 0.95) 100%);
  border: 2px solid rgba(200, 155, 60, 0.3);
  border-radius: 12px;
  padding: 18px;
  overflow-y: auto;
  overflow-x: visible;
  max-height: calc(70vh - 32px);
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
    position: sticky;
    top: 0;
    background: linear-gradient(135deg, rgba(30, 35, 40, 0.98) 0%, rgba(20, 25, 35, 0.98) 100%);
    padding: 8px 0;
    z-index: 10;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    font-weight: bold;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(200, 155, 60, 0.2);
    margin-bottom: 16px;
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
  
  .chess-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding: 12px;
    background: var(--primary-bg);
    border-radius: 8px;
    border: 1px solid var(--border);
    
    .chess-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: ${props => 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'};
      display: flex;
      align-items: center;
      justify-content: center;
      
      img {
        width: 32px;
        height: 32px;
        border-radius: 6px;
      }
      
      &.red {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
      
      &.neutral {
        background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
      }
    }
    
    .chess-info {
      flex: 1;
      
      .chess-name {
        color: var(--primary-text);
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 4px;
      }
      
      .chess-position {
        color: var(--secondary-text);
        font-size: 12px;
      }
    }
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 20px;
    
    @media (min-width: 1400px) {
      grid-template-columns: repeat(3, 1fr);
    }
    
    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--accent-bg);
      border-radius: 6px;
      border: 1px solid var(--border);
      position: relative;
      cursor: help;
      transition: all 0.2s ease;
      
      &:hover {
        border-color: var(--gold);
        background: rgba(60, 60, 65, 0.8);
      }
      
      .stat-label {
        color: var(--secondary-text);
        font-size: 12px;
        font-weight: 500;
      }
      
      .stat-value {
        color: var(--primary-text);
        font-weight: bold;
        font-size: 14px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        
        &.modified {
          color: #22c55e; // Green for buffed stats
          
          .base-value {
            font-size: 10px;
            font-weight: normal;
            color: var(--secondary-text);
            opacity: 0.7;
            margin-top: 2px;
          }
        }
        
        // If stat is lower than base (debuffed), show in red
        &.modified.debuffed {
          color: #ef4444; // Red for debuffed stats
        }
      }
    }
  }
  
  .hp-bar-section {
    margin-bottom: 20px;
    
    .hp-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      .hp-text {
        color: var(--secondary-text);
        font-size: 12px;
        font-weight: 500;
      }
      
      .hp-numbers {
        color: #e74c3c;
        font-weight: bold;
        font-size: 12px;
      }
    }
    
    .hp-bar {
      height: 8px;
      background: var(--primary-bg);
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--border);
      
      .hp-fill {
        height: 100%;
        background: linear-gradient(90deg, #ef4444 0%, #fbbf24 50%, #22c55e 100%);
        transition: width 0.3s ease;
      }
    }
  }
  
  .skill-section, .debuff-section, .items-section {
    margin-bottom: 20px;
    
    .section-header {
      color: var(--gold);
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .skill-card, .debuff-card, .item-card {
      background: var(--primary-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      
      &:last-child {
        margin-bottom: 0;
      }

      .skill-card-header {
        display: flex;
        align-items: center;
        gap: 16px;

        .skill-icon {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 8px;
        }

        .skill-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .skill-type {
          color: var(--secondary-text);
          font-size: 12px;
          text-transform: uppercase;
          font-weight: bold;
        }
      }
      
      .card-name {
        color: var(--primary-text);
        font-weight: bold;
        font-size: 13px;
        margin-bottom: 4px;
      }
      
      .card-cooldown, .card-duration {
        color: var(--secondary-text);
        font-size: 11px;
        margin-bottom: 8px;
        
        &.ready {
          color: #22c55e;
          font-weight: bold;
        }
        
        &.cooling {
          color: #ef4444;
        }
        
        &.active {
          color: #f39c12;
        }
      }
      
      .card-description {
        color: var(--secondary-text);
        font-size: 11px;
        line-height: 1.4;
        margin-top: 8px;
      }
    }
    
    .debuff-card {
      border-color: rgba(239, 68, 68, 0.5);
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.05) 100%);
      transition: all 0.2s ease;
      
      &:hover {
        border-color: #ef4444;
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
      }
      
      &.aura-debuff {
        border-color: rgba(250, 204, 21, 0.5);
        background: linear-gradient(135deg, rgba(250, 204, 21, 0.08) 0%, rgba(251, 191, 36, 0.05) 100%);
        
        &:hover {
          border-color: #facc15;
          background: linear-gradient(135deg, rgba(250, 204, 21, 0.12) 0%, rgba(251, 191, 36, 0.08) 100%);
          box-shadow: 0 4px 12px rgba(250, 204, 21, 0.15);
        }
        
        .card-name {
          color: #facc15;
        }
      }
      
      &.buff-debuff {
        border-color: rgba(34, 197, 94, 0.5);
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(22, 163, 74, 0.05) 100%);
        
        &:hover {
          border-color: #22c55e;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
        }
        
        .card-name {
          color: #22c55e;
        }
      }
      
      .debuff-card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
        
        .debuff-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 2px solid rgba(239, 68, 68, 0.3);
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .fallback-icon {
            color: #ef4444;
            font-size: 24px;
          }
        }
        
        .debuff-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
      }
      
      .card-name {
        color: #ef4444;
      }
      
      .debuff-source {
        color: var(--secondary-text);
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      
      .debuff-effects {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
        
        .effect-tag {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 10px;
          color: var(--primary-text);
          font-weight: 600;
          white-space: nowrap;
          
          &.positive {
            border-color: rgba(34, 197, 94, 0.5);
            background: rgba(34, 197, 94, 0.1);
            color: #22c55e;
          }
          
          &.negative {
            border-color: rgba(239, 68, 68, 0.5);
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
          }
        }
      }
    }
    
    .item-card {
      border-color: #9333ea;
      background: rgba(147, 51, 234, 0.05);
      
      .card-name {
        color: #9333ea;
      }
    }
    
    .item-tooltip {
      position: fixed;
      background: linear-gradient(135deg, rgba(10, 14, 39, 0.98) 0%, rgba(20, 25, 45, 0.98) 100%);
      border: 2px solid var(--gold);
      border-radius: 8px;
      padding: 12px;
      min-width: 250px;
      max-width: 350px;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      
      /* Position will be calculated via JS or use a reasonable default */
      bottom: auto;
      left: auto;
      transform: translateY(-5px);
      
      .tooltip-title {
        color: var(--gold);
        font-weight: bold;
        font-size: 13px;
        margin-bottom: 8px;
      }
      
      .tooltip-effects {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
        
        .effect-item {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(200, 155, 60, 0.15);
          border: 1px solid rgba(200, 155, 60, 0.3);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 11px;
          color: var(--primary-text);
          font-weight: 600;
          
          img {
            width: 14px;
            height: 14px;
          }
          
          .effect-value {
            color: var(--gold);
          }
        }
      }
      
      .tooltip-description {
        color: var(--primary-text);
        font-size: 10px;
        line-height: 1.5;
      }
    }
    
    .no-items {
      color: var(--secondary-text);
      font-size: 12px;
      text-align: center;
      padding: 12px;
      font-style: italic;
    }
  }

  /* Items Grid */
  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    margin-bottom: 12px;
    
    .item-card.equipped {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(22, 163, 74, 0.05) 100%);
      border-color: rgba(34, 197, 94, 0.5);
      &.unique {
        border-color: #9333ea;
        background: rgba(147, 51, 234, 0.05);
      }
      &:hover {
        border-color: #22c55e;
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
        &.unique {
          border-color: #9333ea;
          background: rgba(147, 51, 234, 0.05);
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.15);
        }
      }
    }

  }

  /* Shop Section */
  .shop-section {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 2px solid rgba(200, 155, 60, 0.3);
    
    .section-header {
      color: var(--gold);
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .shop-hint {
      color: var(--secondary-text);
      font-size: 11px;
      line-height: 1.4;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: rgba(200, 155, 60, 0.1);
      border-radius: 6px;
      border-left: 3px solid var(--gold);
    }
    
    .shop-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      
      .shop-item-container {
        position: relative;
        
        &:hover .shop-item-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
      }
      
      .shop-item-icon {
        width: 100%;
        aspect-ratio: 1;
        background: linear-gradient(135deg, var(--primary-bg) 0%, var(--accent-bg) 100%);
        border: 2px solid var(--border);
        border-radius: 8px;
        padding: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .item-fallback {
          font-size: 16px;
          font-weight: bold;
          color: var(--gold);
        }
        
        &:hover:not(:disabled) {
          border-color: var(--gold);
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 4px 12px rgba(200, 155, 60, 0.3);
        }
        
        &:disabled, &.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          filter: grayscale(0.7);
        }
        
        .shop-item-cost-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid var(--gold);
          border-radius: 4px;
          padding: 2px 4px;
          display: flex;
          align-items: center;
          gap: 2px;
          color: var(--gold);
          font-weight: bold;
          font-size: 10px;
        }
      }
      
      .shop-item-tooltip {
        position: fixed;
        background: linear-gradient(135deg, rgba(10, 14, 39, 0.98) 0%, rgba(20, 25, 45, 0.98) 100%);
        border: 2px solid var(--gold);
        border-radius: 8px;
        padding: 12px;
        min-width: 200px;
        max-width: 300px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        
        /* Position will be calculated via JS or use a reasonable default */
        bottom: auto;
        left: auto;
        transform: translateY(-5px);
        
        .tooltip-title {
          color: var(--gold);
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 4px;
        }
        
        .tooltip-effects {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
          
          .effect-item {
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba(200, 155, 60, 0.15);
            border: 1px solid rgba(200, 155, 60, 0.3);
            border-radius: 4px;
            padding: 3px 6px;
            font-size: 11px;
            color: var(--primary-text);
            font-weight: 600;
            
            img {
              width: 14px;
              height: 14px;
            }
            
            .effect-value {
              color: var(--gold);
            }
          }
        }
        
        .tooltip-description {
          color: var(--primary-text);
          font-size: 10px;
          line-height: 1.4;
          margin-bottom: 6px;
        }
        
        .tooltip-cost {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--gold);
          font-weight: bold;
          font-size: 11px;
          padding-top: 4px;
          border-top: 1px solid var(--border);
        }
      }
    }
  }
  
  .no-selection {
    text-align: center;
    color: var(--secondary-text);
    
    .placeholder-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      background: var(--accent-bg);
      border: 2px dashed var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: var(--secondary-text);
    }
    
    .placeholder-text {
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .placeholder-hint {
      font-size: 12px;
      opacity: 0.7;
    }
  }
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
      right: 0;
      height: 100%;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.9) 0%, rgba(200, 200, 220, 0.9) 100%);
      transition: width 0.3s ease;
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

const SkillStateBadge = styled.div`
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: linear-gradient(135deg, rgba(200, 155, 60, 0.95) 0%, rgba(180, 135, 40, 0.95) 100%);
  color: var(--primary-bg);
  font-size: 11px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
  cursor: help;
  z-index: 10;
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

const VictoryOverlay = styled(motion.div) <{ isVictory: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${props => props.isVictory
    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(16, 185, 129, 0.95) 50%, rgba(5, 150, 105, 0.95) 100%)'
    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 50%, rgba(185, 28, 28, 0.95) 100%)'
  };
  backdrop-filter: blur(10px);
  z-index: 1000;
  padding: 40px;
`

const VictoryContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  max-width: 600px;
  text-align: center;
`

const VictoryTitle = styled(motion.h1) <{ isVictory: boolean }>`
  font-size: 72px;
  font-weight: bold;
  margin: 0;
  color: white;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  letter-spacing: 4px;
  text-transform: uppercase;
  
  ${props => props.isVictory && `
    animation: victoryPulse 2s ease-in-out infinite;
    
    @keyframes victoryPulse {
      0%, 100% {
        transform: scale(1);
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }
      50% {
        transform: scale(1.05);
        text-shadow: 0 8px 40px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 255, 255, 0.5);
      }
    }
  `}
`

const VictorySubtitle = styled(motion.p)`
  font-size: 24px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: 500;
`

const VictoryStats = styled(motion.div)`
  display: flex;
  gap: 40px;
  padding: 24px 40px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  
  .stat-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .stat-value {
    font-size: 32px;
    font-weight: bold;
    color: white;
  }
`

const VictoryButton = styled(motion.button)`
  padding: 16px 48px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  
  &:hover {
    background: rgba(0, 0, 0, 0.7);
    border-color: rgba(255, 255, 255, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
`

const Confetti = styled(motion.div)`
  position: absolute;
  width: 10px;
  height: 10px;
  background: ${() => {
    const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }};
  border-radius: 50%;
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

const DevToolsPanel = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  background: var(--secondary-bg);
  border: 2px solid #e74c3c;
  border-radius: 8px;
  padding: 10px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
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
  return `/icons/${piece.name.toLowerCase()}.webp`
}

// Helper function to check if a piece is a champion (can buy items)
const isChampion = (piece: ChessPiece): boolean => {
  const nonChampionTypes = [
    "Poro",
    "Melee Minion",
    "Caster Minion",
    "Siege Minion",
    "Super Minion",
    "Drake",
    "Baron Nashor",
  ]
  return !nonChampionTypes.includes(piece.name)
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
  itemPurchaseAnimations?: ItemPurchaseAnimation[]
  isRedPlayer?: boolean
  isDead?: boolean
  onSkillClick?: () => void
  boardRef: React.RefObject<HTMLDivElement>
  allItems?: ItemData[]
}> = ({ piece, canSelect, onClick, attackAnimation, moveAnimation, isAnimating = false, damageEffects = [], itemPurchaseAnimations = [], isRedPlayer = false, isDead = false, onSkillClick, boardRef, allItems = [] }) => {
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
          src={getImageUrl(piece)}
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

      {/* Item Icons (Left Side) - Only for champions */}
      {isChampion(piece) && (piece as any).items && (piece as any).items.length > 0 && (
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

      {/* Shield Bar (above HP bar) */}
      {piece.shields && piece.shields.length > 0 && (
        <div className="shield-bar">
          <div
            className="shield-fill"
            style={{
              width: `${Math.min(100, (piece.shields.reduce((sum, s) => sum + s.amount, 0) / piece.stats.maxHp) * 100)}%`
            }}
          />
        </div>
      )}

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
              src={getImageUrl(piece)}
              alt={`${piece.name} afterimage`}
            />
          </div>
        </AfterimageEffect>
      )}
    </ChessPieceComponent>
  )
}

// Helper function to get stat icon path
const getStatIcon = (stat: string): string => {
  const iconMap: { [key: string]: string } = {
    ad: '/icons/AD.svg',
    ap: '/icons/AP.svg',
    maxHp: '/icons/icon-hp.svg',
    physicalResistance: '/icons/Armor.svg',
    magicResistance: '/icons/MagicResist.svg',
    speed: '/icons/speed.png',
    attackRange: '/icons/Range.svg',
    sunder: '/icons/AS.svg',
    criticalChance: '/icons/CritChance.svg',
    criticalDamage: '/icons/CritDamage.svg',
    damageAmplification: '/icons/icon-da.png',
    cooldownReduction: '/icons/icon-cdr.webp',
    lifesteal: '/icons/icon-sv.png',
    hpRegen: '/icons/icon-hp-regen.png',
    durability: '/icons/icon-durability.png',
  };
  return iconMap[stat] || '/icons/AD.svg';
};

// Helper function to format numbers and avoid floating point precision issues
const formatNumber = (value: number, decimals: number = 0): string => {
  // Round to avoid floating point precision issues
  const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  // If it's a whole number, don't show decimals
  if (Math.abs(rounded % 1) < 0.0001) {
    return Math.round(rounded).toString();
  }
  // Otherwise, show up to the specified decimal places and remove trailing zeros
  return rounded.toFixed(decimals).replace(/\.?0+$/, '');
};

// Helper function to get skill state display for champions with payload-based mechanics
const getSkillStateDisplay = (championName: string, skillPayload: any) => {
  if (!skillPayload) return null;

  switch (championName) {
    case 'Jhin':
      const jhinCount = skillPayload.attackCount || 0;
      const jhinProgress = jhinCount % 4;
      return {
        badge: `${jhinProgress}/4`,
        tooltip: `Attack Counter: ${jhinProgress}/4 attacks${jhinProgress === 3 ? ' (Next attack is CRITICAL!)' : ''}`
      };

    case 'Nasus':
      const bonusDamage = skillPayload.bonusDamage || 0;
      return {
        badge: `+${bonusDamage}`,
        tooltip: `Siphoning Strike Bonus: +${bonusDamage} damage from kills`
      };

    case 'Tristana':
      const tristanaCount = skillPayload.attackCount || 0;
      const tristanaProgress = tristanaCount % 4;
      return {
        badge: `${tristanaProgress}/4`,
        tooltip: `Explosive Charge: ${tristanaProgress}/4 attacks${tristanaProgress === 3 ? ' (Next attack explodes!)' : ''}`
      };

    case 'Tryndamere':
      const hasUsedRage = skillPayload.hasUsedUndyingRage || false;
      return {
        badge: hasUsedRage ? '✗' : '✓',
        tooltip: `Undying Rage: ${hasUsedRage ? 'Already used this game' : 'Available (will survive at 1 HP)'}`
      };

    default:
      return null;
  }
};

// Helper function to render debuff icons
const getDebuffIcon = (debuff: any) => {
  const debuffIconMap: Record<string, { src: string; alt: string }> = {
    wounded: { src: '/icons/wounded.webp', alt: 'Wounded' },
    burned: { src: '/icons/burned.jpg', alt: 'Burned' },
    venom: { src: '/icons/SerpentsFang.png', alt: 'Venom' },
    aura_evenshroud_passive_disable: { src: '/icons/Evenshroud.png', alt: 'Evenshroud' },
    titans_resolve: { src: '/icons/TitansResolve.png', alt: 'Titans Resolve' },
    adaptive_helm_armor: { src: '/icons/AdaptiveHelm.png', alt: 'Adaptive Helm' },
    adaptive_helm_mr: { src: '/icons/AdaptiveHelm.png', alt: 'Adaptive Helm' },
    undying_rage: { src: '/icons/tryndamere_skill.webp', alt: 'Undying Rage' },
  };

  const iconConfig = debuffIconMap[debuff.id];

  if (iconConfig) {
    return (
      <img
        src={iconConfig.src}
        alt={iconConfig.alt}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
          if (fallback) (fallback as HTMLElement).style.display = 'block';
        }}
      />
    );
  }

  if (debuff.casterName) {
    return (
      <img
        src={`/icons/${debuff.casterName.toLowerCase().replace(/\s+/g, '')}_skill.webp`}
        alt={debuff.casterName}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
          if (fallback) (fallback as HTMLElement).style.display = 'block';
        }}
      />
    );
  }

  return null;
};

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const {
    gameState,
    displayState,
    queuedState,
    setDisplayState,
    setQueuedState,
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
    setDrawOfferSent,
    connected: wsConnected,
    lastUpdate,
  } = useGame(gameId || '')

  // Get current user from auth state
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()

  // Get items from Redux store
  const { basicItems: shopItems, allItems, loading: itemsLoading } = useAppSelector((state) => state.items)

  // Fetch items on component mount
  useEffect(() => {
    if (shopItems.length === 0 && !itemsLoading) {
      dispatch(fetchBasicItems())
    }
    if (allItems.length === 0 && !itemsLoading) {
      dispatch(fetchAllItems())
    }
  }, [dispatch, shopItems.length, allItems.length, itemsLoading])

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

  // Track previous game state for animation
  const previousGameStateRef = useRef<GameState | null>(null)
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

  // Play animation sequence when game state updates
  useEffect(() => {
    if (!gameState) return

    // Check if we should play animations
    const shouldAnimate = AnimationEngine.shouldPlayAnimations(
      gameState,
      previousGameStateRef.current
    )

    if (shouldAnimate && !isPlayingAnimationsRef.current) {
      // Generate animation sequence (comparing old state to new state)
      const animations = AnimationEngine.generateAnimationSequence(
        gameState,
        previousGameStateRef.current
      )

      if (animations.length > 0) {
        animationQueueRef.current = animations
        playAnimationSequence(animations)
      } else {
        // No animations to play, but we might have a queued state
        if (queuedState) {
          setDisplayState(queuedState)
          setQueuedState(null)
        }
      }
    }

    // Update previous game state
    previousGameStateRef.current = gameState
  }, [gameState, queuedState, setDisplayState, setQueuedState])

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
    console.log({ newDeadPieces })
    setDeadPieces(newDeadPieces)
    prevDeadPiecesRef.current = newDeadPieces
  }, [displayState])

  // Play animation sequence
  const playAnimationSequence = useCallback(async (animations: AnimationAction[]) => {
    try {
      isPlayingAnimationsRef.current = true
      setIsAnimating(true)

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

      // After all animations complete, swap to new state
      if (queuedState) {
        setDisplayState(queuedState)
        setQueuedState(null)
      }
    } catch (error) {
      console.error('Animation error:', error)
    } finally {
      // Always clean up, even if there's an error
      isPlayingAnimationsRef.current = false
      setIsAnimating(false)
      // Clear any lingering animation states
      setMoveAnimation(null)
      setAttackAnimation(null)
      // Note: We don't clear damageEffects and itemPurchaseAnimations here
      // as they manage their own cleanup with setTimeout
    }
  }, [queuedState, setDisplayState, setQueuedState])

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
        setAttackAnimation({
          attackerId,
          targetId,
          attackerPos: attackerPosition,
          targetPos: targetPosition,
          guinsooProc,
        })
        await new Promise(resolve => setTimeout(resolve, animation.duration))
        setAttackAnimation(null)
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
        const { casterId, casterPosition, skillName, targetPosition, targetId, pulledToPosition, cardTargets, totalCardCount } = animation.data
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
  }, [allItems, boardRef, currentUser, gameState])

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
        setItemPurchaseAnimations([])
        setDeadPieces(new Set())
        setIsAnimating(false)
        setDetailViewPiece(null)
        setActiveSkillAnimation(null)
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

  // Restore HP (dev tools)
  const handleRestoreHp = useCallback(async () => {
    if (!gameId || isResetting) return

    try {
      const result = await dispatch(restoreHp(gameId))

      if (restoreHp.fulfilled.match(result)) {
        console.log('HP restored successfully')
      } else {
        console.error('Failed to restore HP:', result.error?.message)
      }
    } catch (error) {
      console.error('Error restoring HP:', error)
    }
  }, [gameId, isResetting, dispatch])

  // Restore Cooldown (dev tools)
  const handleRestoreCooldown = useCallback(async () => {
    if (!gameId || isResetting) return

    try {
      const result = await dispatch(restoreCooldown(gameId))

      if (restoreCooldown.fulfilled.match(result)) {
        console.log('Cooldowns restored successfully')
      } else {
        console.error('Failed to restore cooldowns:', result.error?.message)
      }
    } catch (error) {
      console.error('Error restoring cooldowns:', error)
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
        const isValidSkill = validSkillTargets.some(target => target.x === x && target.y === y)

        const piece = displayState?.board.find(p => (p.position.x === x && p.position.y === y) && (p.stats.hp > 0 || p.deadAtRound === displayState?.currentRound - 1))

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

  // Check if game is finished
  const isGameFinished = gameState.status === 'finished'
  const isVictory = isGameFinished && gameState.winner && (
    (gameState.winner === 'blue' && currentUser?.id === gameState.bluePlayer) ||
    (gameState.winner === 'red' && currentUser?.id === gameState.redPlayer)
  )
  const isDraw = isGameFinished && !gameState.winner

  const isBasicItem = (itemId: string) => {
    return shopItems.some(item => item.id === itemId)
  }

  const checkItemNotPurchasability = (item: ItemData, piece: ChessPiece, gold: number) => {
    const itemLength = (piece as any).items?.length || 0
    if (itemLength > 3) return true
    if (itemLength === 3 && (piece as any).items.every((item: ItemData) => !isBasicItem(item.id))) return true
    if (gold < item.cost) return true
    if (!isMyTurn) return true
    // Check turn state flags
    if (gameState?.hasBoughtItemThisTurn) return true
    if (gameState?.hasPerformedActionThisTurn) return true
    return false
  }

  const damageReductionPercentage = (protectionFactor: number) => {
    if (protectionFactor <= 0) {
      return 0;
    }
    return Math.round(100 * protectionFactor / (protectionFactor + 50));
  }

  // Handle tooltip positioning
  const handleTooltipShow = (e: React.MouseEvent<HTMLDivElement>, content: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      top: rect.top - 10,
      left: rect.left + rect.width / 2,
      content
    })
  }

  const handleTooltipHide = () => {
    setTooltipPosition(null)
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
      <AnimatePresence>
        {isGameFinished && (
          <VictoryOverlay
            isVictory={isVictory || false}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Confetti for victory */}
            {isVictory && Array.from({ length: 50 }).map((_, i) => (
              <Confetti
                key={i}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: 0,
                  opacity: 1
                }}
                animate={{
                  y: window.innerHeight + 20,
                  rotate: Math.random() * 720 - 360,
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  delay: Math.random() * 2,
                  ease: 'linear',
                  repeat: Infinity
                }}
              />
            ))}

            <VictoryContent>
              <VictoryTitle
                isVictory={isVictory || false}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                {isDraw ? 'DRAW' : isVictory ? 'VICTORY' : 'DEFEAT'}
              </VictoryTitle>

              <VictorySubtitle
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                {isDraw
                  ? 'The battle ends in a draw!'
                  : isVictory
                    ? 'You have conquered the battlefield!'
                    : 'Your Poro has fallen...'}
              </VictorySubtitle>

              <VictoryStats
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <StatItem>
                  <span className="stat-label">Round</span>
                  <span className="stat-value">{Math.floor((gameState.currentRound || 0) / 2) + 1}</span>
                </StatItem>
                <StatItem>
                  <span className="stat-label">Your Gold</span>
                  <span className="stat-value">{currentPlayer?.gold || 0}</span>
                </StatItem>
                <StatItem>
                  <span className="stat-label">Pieces Left</span>
                  <span className="stat-value">
                    {gameState.board.filter(p => p.ownerId === currentUser?.id && p.stats.hp > 0).length}
                  </span>
                </StatItem>
              </VictoryStats>

              <VictoryButton
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/'}
              >
                Return to Lobby
              </VictoryButton>
            </VictoryContent>
          </VictoryOverlay>
        )}
      </AnimatePresence>

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
        </PlayersPanel>

        <ChessDetailPanel>
          {detailViewPiece ? (
            <>
              <h3>
                <Users size={20} />
                Chess Details
              </h3>

              <div className="chess-header">
                <div className={`chess-icon ${detailViewPiece.ownerId === 'neutral' ? 'neutral' : detailViewPiece.blue ? 'blue' : 'red'}`}>
                  <img
                    src={getImageUrl(detailViewPiece)}
                    alt={detailViewPiece.name}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <div className="chess-info">
                  <div className="chess-name">{detailViewPiece.name}</div>
                  <div className="chess-position">
                    Position: ({detailViewPiece.position.x}, {detailViewPiece.position.y}) •
                    Owner: {detailViewPiece.ownerId === 'neutral' ? 'Neutral' :
                      detailViewPiece.ownerId === currentPlayer?.userId ? 'You' : 'Opponent'}
                  </div>
                </div>
              </div>

              <div className="hp-bar-section">
                <div className="hp-label">
                  <span className="hp-text">Health</span>
                  <span className="hp-numbers">
                    {formatNumber(detailViewPiece.stats.hp)} / {formatNumber(detailViewPiece.stats.maxHp)}
                    {detailViewPiece.rawStats && detailViewPiece.rawStats.maxHp !== detailViewPiece.stats.maxHp && (
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--secondary-text)',
                        marginLeft: '4px',
                        opacity: 0.7
                      }}>
                        (base: {formatNumber(detailViewPiece.rawStats.maxHp)})
                      </span>
                    )}
                  </span>
                </div>

                {/* Shield Bar (if shields exist) */}
                {detailViewPiece.shields && detailViewPiece.shields.length > 0 && (
                  <>
                    <div className="hp-label" style={{ marginTop: '12px' }}>
                      <span className="hp-text" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        🛡️ Shield
                      </span>
                      <span className="hp-numbers" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        {formatNumber(detailViewPiece.shields.reduce((sum, s) => sum + s.amount, 0))}
                        {detailViewPiece.shields.length > 0 && detailViewPiece.shields[0].duration !== Number.MAX_SAFE_INTEGER && (
                          <span style={{
                            fontSize: '10px',
                            color: 'var(--secondary-text)',
                            marginLeft: '4px',
                            opacity: 0.7
                          }}>
                            ({detailViewPiece.shields[0].duration} {detailViewPiece.shields[0].duration === 1 ? 'turn' : 'turns'})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="hp-bar reverse">
                      <div
                        className="hp-fill"
                        style={{
                          width: `${Math.min(100, (detailViewPiece.shields.reduce((sum, s) => sum + s.amount, 0) / detailViewPiece.stats.maxHp) * 100)}%`,
                          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.9) 0%, rgba(200, 200, 220, 0.9) 50%, rgba(180, 180, 200, 0.9) 100%)',
                          boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)'
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="hp-bar">
                  <div
                    className="hp-fill"
                    style={{ width: `${(detailViewPiece.stats.hp / detailViewPiece.stats.maxHp) * 100}%` }}
                  />
                </div>
              </div>

              <div className="stats-grid">
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Attack Damage')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/AD.svg" alt="Attack" width={14} height={14} /></span>
                  <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.ad !== detailViewPiece.stats.ad
                    ? `modified ${detailViewPiece.stats.ad > detailViewPiece.rawStats.ad ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {detailViewPiece.stats.ad}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Ability Power')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/AP.svg" alt="Ability" width={14} height={14} /></span>
                  <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.ap !== detailViewPiece.stats.ap
                    ? `modified ${detailViewPiece.stats.ap > detailViewPiece.rawStats.ap ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {detailViewPiece.stats.ap}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, `Physical Resistance (${damageReductionPercentage(detailViewPiece.stats.physicalResistance)}%)`)}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/Armor.svg" alt="Physical Resistance" width={14} height={14} /></span>
                  <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.physicalResistance !== detailViewPiece.stats.physicalResistance
                    ? `modified ${detailViewPiece.stats.physicalResistance > detailViewPiece.rawStats.physicalResistance ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {detailViewPiece.stats.physicalResistance}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, `Magic Resistance (${damageReductionPercentage(detailViewPiece.stats.magicResistance)}%)`)}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/MagicResist.svg" alt="Magic Resistance" width={14} height={14} /></span>
                  <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.magicResistance !== detailViewPiece.stats.magicResistance
                    ? `modified ${detailViewPiece.stats.magicResistance > detailViewPiece.rawStats.magicResistance ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {detailViewPiece.stats.magicResistance}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Movement Speed' + (detailViewPiece.name === 'Poro' ? ' (Poro speed is always 1)' : ''))}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/speed.png" alt="Speed" width={14} height={14} /></span>
                  <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.speed !== detailViewPiece.stats.speed
                    ? `modified ${detailViewPiece.stats.speed > detailViewPiece.rawStats.speed ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {detailViewPiece.stats.speed}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Attack Range')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/Range.svg" alt="Range" width={14} height={14} /></span>
                  <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.attackRange.range !== detailViewPiece.stats.attackRange.range
                    ? `modified ${detailViewPiece.stats.attackRange.range > detailViewPiece.rawStats.attackRange.range ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {detailViewPiece.stats.attackRange.range}
                  </span>
                  <AttackRangeIndicator
                    attackRange={detailViewPiece.stats.attackRange}
                    size={20}
                  />
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Sunder (Armor Penetration)')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/AS.svg" alt="Sunder" width={14} height={14} /></span>
                  <span className={`stat-value ${(detailViewPiece as any).rawStats && (detailViewPiece as any).rawStats.sunder !== (detailViewPiece as any).stats.sunder
                    ? `modified ${(detailViewPiece as any).stats.sunder > (detailViewPiece as any).rawStats.sunder ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {(detailViewPiece as any).stats.sunder || 0}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Critical Strike Chance (%)')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/CritChance.svg" alt="Critical Chance" width={14} height={14} /></span>
                  <span className={`stat-value ${(detailViewPiece as any).rawStats && (detailViewPiece as any).rawStats.criticalChance !== (detailViewPiece as any).stats.criticalChance
                    ? `modified ${(detailViewPiece as any).stats.criticalChance > (detailViewPiece as any).rawStats.criticalChance ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {(detailViewPiece as any).stats.criticalChance || 0}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Critical Strike Damage (%)')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/CritDamage.svg" alt="Critical Damage" width={14} height={14} /></span>
                  <span className={`stat-value ${(detailViewPiece as any).rawStats && (detailViewPiece as any).rawStats.criticalDamage !== (detailViewPiece as any).stats.criticalDamage
                    ? `modified ${(detailViewPiece as any).stats.criticalDamage > (detailViewPiece as any).rawStats.criticalDamage ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {(detailViewPiece as any).stats.criticalDamage || 150}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Damage Amplification (%)')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/icon-da.png" alt="Damage Amplification" width={14} height={14} /></span>
                  <span className={`stat-value ${(detailViewPiece as any).rawStats && (detailViewPiece as any).rawStats.damageAmplification !== (detailViewPiece as any).stats.damageAmplification
                    ? `modified ${(detailViewPiece as any).stats.damageAmplification > (detailViewPiece as any).rawStats.damageAmplification ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {(detailViewPiece as any).stats.damageAmplification || 0}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Cooldown Reduction (%)')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/icon-cdr.webp" alt="Cooldown Reduction" width={14} height={14} /></span>
                  <span className={`stat-value ${(detailViewPiece as any).rawStats && (detailViewPiece as any).rawStats.cooldownReduction !== (detailViewPiece as any).stats.cooldownReduction
                    ? `modified ${(detailViewPiece as any).stats.cooldownReduction > (detailViewPiece as any).rawStats.cooldownReduction ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {(detailViewPiece as any).stats.cooldownReduction || 0}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Lifesteal (%)')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/icon-sv.png" alt="Lifesteal" width={14} height={14} /></span>
                  <span className={`stat-value ${(detailViewPiece as any).rawStats && (detailViewPiece as any).rawStats.lifesteal !== (detailViewPiece as any).stats.lifesteal
                    ? `modified ${(detailViewPiece as any).stats.lifesteal > (detailViewPiece as any).rawStats.lifesteal ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {(detailViewPiece as any).stats.lifesteal || 0}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'HP Regeneration per Turn')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/icon-hp-regen.png" alt="HP Regen" width={14} height={14} /></span>
                  <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.hpRegen !== detailViewPiece.stats.hpRegen
                    ? `modified ${detailViewPiece.stats.hpRegen > detailViewPiece.rawStats.hpRegen ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {detailViewPiece.stats.hpRegen || 0}
                  </span>
                </div>
                <div
                  className="stat-item"
                  onMouseEnter={(e) => handleTooltipShow(e, 'Durability (% damage reduction)')}
                  onMouseLeave={handleTooltipHide}
                >
                  <span className="stat-label"><img src="/icons/icon-durability.png" alt="Durability" width={14} height={14} /></span>
                  <span className={`stat-value ${detailViewPiece.rawStats && (detailViewPiece.rawStats as any).durability !== detailViewPiece.stats.durability
                    ? `modified ${(detailViewPiece.stats.durability || 0) > ((detailViewPiece.rawStats as any).durability || 0) ? 'buffed' : 'debuffed'}`
                    : ''
                    }`}>
                    {detailViewPiece.stats.durability || 0}%
                  </span>
                </div>
              </div>

              <div className="skill-section">
                <div className="section-header">
                  <Zap size={16} />
                  Ability
                </div>
                {detailViewPiece.skill ? (
                  <div className="skill-card">
                    <div className="skill-card-header">
                      <div style={{ position: 'relative' }}>
                        <img src={`/icons/${detailViewPiece.name.toLowerCase()}_skill.webp`} alt={detailViewPiece.name} className="skill-icon" />
                        {(() => {
                          const stateDisplay = getSkillStateDisplay(
                            detailViewPiece.name,
                            (detailViewPiece.skill as any)?.payload
                          );
                          return stateDisplay ? (
                            <SkillStateBadge
                              onMouseEnter={(e) => handleTooltipShow(e, stateDisplay.tooltip)}
                              onMouseLeave={handleTooltipHide}
                            >
                              {stateDisplay.badge}
                            </SkillStateBadge>
                          ) : null;
                        })()}
                      </div>
                      <div className="skill-info" >
                        <div className="card-name">{detailViewPiece.skill.name}</div>
                        <div className="skill-type">{detailViewPiece.skill.type}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {detailViewPiece.skill.type === 'active' && detailViewPiece.skill.attackRange?.range && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <img src={getStatIcon("attackRange")} alt="Range" width={14} height={14} />
                            <span style={{ color: 'var(--gold)', marginLeft: '4px' }}>{detailViewPiece.skill.attackRange.range}</span>
                          </div>}
                          {detailViewPiece.skill.type === 'active' && detailViewPiece.skill.attackRange && (
                            <AttackRangeIndicator
                              attackRange={detailViewPiece.skill.attackRange}
                              size={16}
                            />
                          )}
                          {detailViewPiece.skill.cooldown > 0 && <div>
                            <img src={getStatIcon("cooldownReduction")} alt="Cooldown" width={14} height={14} />
                            <span style={{ color: 'var(--gold)', marginLeft: '4px' }}>{detailViewPiece.skill.cooldown}</span>
                          </div>}
                        </div>
                        <div className={`card-cooldown ${detailViewPiece.skill.currentCooldown > 0 ? 'cooling' : detailViewPiece.skill.type === 'passive' && (detailViewPiece as any).debuffs?.some((debuff: any) => debuff.id === "aura_evenshroud_passive_disable") ? 'disabled' : 'ready'}`}>
                          {detailViewPiece.skill.currentCooldown > 0
                            ? `Cooldown: ${Math.ceil(detailViewPiece.skill.currentCooldown)} turns`
                            :
                            detailViewPiece.skill.type === 'passive' && (detailViewPiece as any).debuffs?.some((debuff: any) => debuff.id === "aura_evenshroud_passive_disable") ?
                              'Disabled' :
                              'Ready to use'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="card-description">
                      {detailViewPiece.skill.description || 'No description available'}
                    </div>
                  </div>
                ) : (
                  <div className="no-items">No special ability</div>
                )}
              </div>

              <div className="debuff-section">
                <div className="section-header">
                  <Shield size={16} />
                  Status Effects ({(detailViewPiece as any).debuffs?.length || 0})
                </div>
                {(detailViewPiece as any).debuffs && (detailViewPiece as any).debuffs.length > 0 ? (
                  (detailViewPiece as any).debuffs.map((debuff: any, index: number) => {
                    const isAura = debuff.duration === -1;
                    const isBuff = debuff.effects?.some((e: any) => e.modifier > 0) || false;
                    const debuffClass = isAura ? 'aura-debuff' : (isBuff ? 'buff-debuff' : '');

                    return (
                      <div key={index} className={`debuff-card ${debuffClass}`}>
                        <div className="debuff-card-header">
                          <div className="debuff-icon">
                            {getDebuffIcon(debuff)}
                            <div className="fallback-icon" style={{ display: debuff.casterName ? 'none' : 'block' }}>
                              {isAura ? '✨' : isBuff ? '⬆' : '⬇'}
                            </div>
                          </div>
                          <div className="debuff-info">
                            <div className="card-name">{debuff.name}</div>
                            {debuff.casterName && (
                              <div className="debuff-source">From: {debuff.casterName}</div>
                            )}
                            <div className={`card-duration ${isAura ? 'active' : debuff.duration <= 1 ? 'cooling' : 'ready'}`}>
                              {isAura
                                ? "🌟 Active (Aura)"
                                : `⏱ ${debuff.duration} turn${debuff.duration !== 1 ? 's' : ''} left`}
                            </div>
                          </div>
                        </div>
                        <div className="card-description">
                          {debuff.description || 'No description available'}
                        </div>
                        {debuff.effects && debuff.effects.length > 0 && (
                          <div className="debuff-effects">
                            {debuff.effects.filter((effect: any) => effect.modifier !== 0).map((effect: any, idx: number) => (
                              <div key={idx} className={`effect-tag ${effect.modifier > 0 ? 'positive' : 'negative'}`}>
                                {effect.stat.toUpperCase()} {effect.modifier > 0 ? '+' : ''}{effect.modifier}
                              </div>
                            ))}
                          </div>
                        )}
                        {debuff.damagePerTurn > 0 && (
                          <div className="debuff-effects">
                            <div className="effect-tag negative">
                              💥 {formatNumber(debuff.damagePerTurn)} {debuff.damageType} dmg/turn
                            </div>
                          </div>
                        )}
                        {debuff.healPerTurn > 0 && (
                          <div className="debuff-effects">
                            <div className="effect-tag positive">
                              💚 {formatNumber(debuff.healPerTurn)} heal/turn
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="no-items">No active status effects</div>
                )}
              </div>

              <div className="items-section">
                <div className="section-header">
                  <Package size={16} />
                  Items ({(detailViewPiece as any).items?.length || 0}/3)
                </div>
                {(detailViewPiece as any).items && (detailViewPiece as any).items.length > 0 ? (
                  <div className="items-grid">
                    {(detailViewPiece as any).items.map((item: any, index: number) => {
                      // Find the item data from all items to get the icon (includes combined items)
                      const itemData = allItems.find((allItem: ItemData) => allItem.id === item.id)

                      return (
                        <div key={index} className={`item-card equipped ${item.unique ? 'unique' : ''}`}>
                          <div className="item-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            {itemData?.icon && (
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                border: '2px solid rgba(34, 197, 94, 0.5)',
                                background: 'rgba(0, 0, 0, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                overflow: 'hidden',
                                padding: '4px'
                              }}>
                                <img
                                  src={itemData.icon}
                                  alt={item.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div className="card-name" style={{ marginBottom: '8px' }}>{item.name}</div>
                              {itemData?.cooldown && itemData.cooldown > 0 && <div>
                                <img src={getStatIcon("cooldownReduction")} alt="Cooldown" width={14} height={14} />
                                <span style={{ color: 'var(--gold)', marginLeft: '4px' }}>{itemData.cooldown}</span>
                              </div>}
                              {/* Cooldown Display */}
                              {itemData?.cooldown && itemData.cooldown > 0 && (
                                <div className={`card-cooldown ${item.currentCooldown > 0 ? 'cooling' : 'ready'}`} style={{ marginBottom: '8px' }}>
                                  {item.currentCooldown > 0
                                    ? `Cooldown: ${Math.ceil(item.currentCooldown)} turns`
                                    : 'Ready to use'
                                  }
                                </div>
                              )}

                              {/* Stat Effects */}
                              {itemData?.effects && itemData.effects.length > 0 && (
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '6px',
                                  marginBottom: '8px'
                                }}>
                                  {itemData.effects.filter((effect) => !effect.conditional).map((effect, idx) => (
                                    <div key={idx} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(200, 155, 60, 0.15)',
                                      border: '1px solid rgba(200, 155, 60, 0.3)',
                                      borderRadius: '4px',
                                      padding: '3px 6px',
                                      fontSize: '11px',
                                      color: 'var(--primary-text)',
                                      fontWeight: 600,
                                    }}>
                                      <img
                                        src={getStatIcon(effect.stat)}
                                        alt={effect.stat}
                                        style={{ width: '14px', height: '14px' }}
                                      />
                                      <span style={{ color: 'var(--gold)' }}>
                                        +{effect.type === 'multiply' ? Math.floor(effect.value * 100 - 100) : effect.value}{effect.type === 'multiply' ? '%' : ''}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Description */}
                              {(item.description || itemData?.description) && (
                                <div className="card-description">
                                  {item.description || itemData?.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="no-items">No items equipped</div>
                )}
              </div>

              {/* Item Shop - Only show for owned champions */}
              {detailViewPiece.ownerId === currentPlayer?.userId && isChampion(detailViewPiece) && (
                <div className="shop-section">
                  <div className="section-header">
                    <ShoppingCart size={16} />
                    Item Shop
                  </div>
                  <div className="shop-hint">
                    Buy basic items. When 2 basic items combine, they create a powerful item!
                  </div>
                  {/* Turn state indicator */}
                  {isMyTurn && (
                    <div style={{
                      padding: '8px 12px',
                      marginBottom: '12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: gameState?.hasBoughtItemThisTurn
                        ? 'rgba(200, 155, 60, 0.15)'
                        : gameState?.hasPerformedActionThisTurn
                          ? 'rgba(200, 100, 100, 0.15)'
                          : 'rgba(91, 192, 222, 0.15)',
                      border: `1px solid ${gameState?.hasBoughtItemThisTurn
                        ? 'var(--gold)'
                        : gameState?.hasPerformedActionThisTurn
                          ? '#c86464'
                          : 'var(--hover)'
                        }`,
                      color: gameState?.hasBoughtItemThisTurn
                        ? 'var(--gold)'
                        : gameState?.hasPerformedActionThisTurn
                          ? '#ff9999'
                          : 'var(--hover)'
                    }}>
                      {gameState?.hasBoughtItemThisTurn ? (
                        <>
                          <ShoppingCart size={14} />
                          <span>Item purchased (1/1) - Perform your action</span>
                        </>
                      ) : gameState?.hasPerformedActionThisTurn ? (
                        <>
                          <AlertCircle size={14} />
                          <span>Cannot buy after performing an action</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={14} />
                          <span>Can buy 1 item before your action</span>
                        </>
                      )}
                    </div>
                  )}
                  {itemsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-text)' }}>
                      Loading items...
                    </div>
                  ) : shopItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-text)' }}>
                      No items available
                    </div>
                  ) : (
                    <div className="shop-grid">
                      {shopItems.map((item: ItemData) => (
                        <div
                          key={item.id}
                          className="shop-item-container"
                          onMouseEnter={(e) => {
                            const tooltip = e.currentTarget.querySelector('.shop-item-tooltip') as HTMLElement;
                            if (tooltip) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              tooltip.style.top = `${rect.top - 10}px`;
                              tooltip.style.left = `${rect.left + rect.width / 2}px`;
                              tooltip.style.transform = 'translate(-50%, -100%)';
                            }
                          }}
                        >
                          <button
                            className={`shop-item-icon ${checkItemNotPurchasability(item, detailViewPiece, currentPlayer?.gold || 0) ? 'disabled' : ''}`}
                            onClick={() => handleBuyItem(item.id, detailViewPiece.id)}
                            disabled={checkItemNotPurchasability(item, detailViewPiece, currentPlayer?.gold || 0)}
                          >
                            <img
                              src={item.icon || `/icons/${item.id}.png`}
                              alt={item.name}
                              width={100}
                              height={100}
                              onError={(e) => {
                                // Fallback to a generic icon or text if image not found
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'item-fallback';
                                  fallback.textContent = item.name.substring(0, 2).toUpperCase();
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          </button>
                          <div className="shop-item-tooltip">
                            <div className="tooltip-title">{item.name}</div>
                            {item.effects && item.effects.length > 0 && (
                              <div className="tooltip-effects">
                                {item.effects.map((effect, idx) => (
                                  <div key={idx} className="effect-item">
                                    <img src={getStatIcon(effect.stat)} alt={effect.stat} />
                                    <span className="effect-value">
                                      +{effect.value}{effect.type === 'multiply' ? '%' : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.description && (
                              <div className="tooltip-description">{item.description}</div>
                            )}
                            <div className="tooltip-cost">
                              <Coins size={12} /> {item.cost} gold
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <h3>
                <Users size={20} />
                Select a Chess Piece
              </h3>
              <div className="no-selection">
                <div className="placeholder-icon">
                  <Users size={24} />
                </div>
                <div className="placeholder-text">No piece selected</div>
                <div className="placeholder-hint">Click on any chess piece to view detailed information</div>
              </div>
            </>
          )}
        </ChessDetailPanel>

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
        {/* Development Tools - Only show in development environment */}
        {import.meta.env.DEV && (
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
            <button
              className="dev-button"
              onClick={handleRestoreHp}
              disabled={isResetting || !gameState}
              title="Restore all chess pieces to full HP"
              style={{ marginTop: '8px' }}
            >
              <Shield size={14} />
              {isResetting ? 'Restoring...' : 'Restore HP'}
            </button>
            <button
              className="dev-button"
              onClick={handleRestoreCooldown}
              disabled={isResetting || !gameState}
              title="Reset all skill cooldowns to 0"
              style={{ marginTop: '8px' }}
            >
              <Zap size={14} />
              {isResetting ? 'Restoring...' : 'Restore Cooldowns'}
            </button>
          </DevToolsPanel>
        )}
      </GameContainer>
    </>
  )
}

export default GamePage
