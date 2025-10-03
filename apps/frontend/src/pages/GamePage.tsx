import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Coins, RotateCcw, Users, Zap, Shield, Package } from 'lucide-react'
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
    
    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--accent-bg);
      border-radius: 6px;
      border: 1px solid var(--border);
      
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
      
      &.hp {
        .stat-value { 
          color: #e74c3c;
          &.modified { color: #e74c3c; }
        }
      }
      
      &.attack {
        .stat-value { 
          color: #f39c12;
          &.modified { color: #f39c12; }
          &.modified.buffed { color: #22c55e; }
          &.modified.debuffed { color: #ef4444; }
        }
      }
      
      &.armor {
        .stat-value { 
          color: #3498db;
          &.modified.buffed { color: #22c55e; }
          &.modified.debuffed { color: #ef4444; }
        }
      }
      
      &.speed {
        .stat-value { 
          color: #2ecc71;
          &.modified.buffed { color: #22c55e; }
          &.modified.debuffed { color: #ef4444; }
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
      }
    }
    
    .debuff-card {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.05);
      
      .card-name {
        color: #ef4444;
      }
    }
    
    .item-card {
      border-color: #9333ea;
      background: rgba(147, 51, 234, 0.05);
      
      .card-name {
        color: #9333ea;
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

const GameBoard = styled.div`
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

const Board = styled.div`
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
  
  .square {
    background: rgba(30, 35, 40, 0.7);
    border: 1px solid rgba(200, 155, 60, 0.3);
    border-radius: 2px;
    backdrop-filter: blur(2px);
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
    
    &.valid-skill {
      background: rgba(59, 130, 246, 0.3);
      border-color: #3b82f6;
      cursor: pointer;
      position: relative;
      
      &:after {
        content: '⚡';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #3b82f6;
        font-size: 16px;
        font-weight: bold;
      }
      
      &:hover {
        background: rgba(59, 130, 246, 0.4);
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
  z-index: ${props => props.isAttacking ? 10 : 1};
  box-shadow: 0 0 2px 2px ${props =>
    props.isNeutral ? '#9333ea' :
      props.isBlue ? '#3b82f6' : '#ef4444'};
  
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
  gap: 10px;
  margin-top: 20px;
  justify-content: center;
  padding: 16px;
  background: linear-gradient(135deg, rgba(20, 25, 35, 0.6) 0%, rgba(10, 14, 39, 0.6) 100%);
  border-radius: 12px;
  border: 2px solid rgba(200, 155, 60, 0.2);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  
  button {
    background: linear-gradient(135deg, rgba(60, 60, 65, 0.8) 0%, rgba(40, 40, 45, 0.8) 100%);
    border: 2px solid var(--border);
    color: var(--primary-text);
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    font-size: 14px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    
    &:hover {
      border-color: var(--gold);
      background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
      color: var(--primary-bg);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(200, 155, 60, 0.5);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      filter: grayscale(1);
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

  // Detail view state - separate from action selection
  const [detailViewPiece, setDetailViewPiece] = useState<ChessPiece | null>(null)

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

  // Handle detail view click - can click any piece anytime
  const handleDetailClick = (piece: ChessPiece) => {
    setDetailViewPiece(piece)
  }

  // Handle square click for actions
  const handleSquareClick = (x: number, y: number) => {
    if (!gameState || !isMyTurn || isAnimating) return
    const clickedPosition = { x, y }

    // Check if clicking on a piece
    const clickedPiece = gameState.board.find(piece =>
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
        setDeadPieces(new Set())
        setIsAnimating(false)
        setDetailViewPiece(null)
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
        const isValidSkill = validSkillTargets.some(target => target.x === x && target.y === y)

        const piece = gameState?.board.find(p => p.position.x === x && p.position.y === y && p.stats.hp > 0)

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
                  {detailViewPiece.stats.hp} / {detailViewPiece.stats.maxHp}
                  {detailViewPiece.rawStats && detailViewPiece.rawStats.maxHp !== detailViewPiece.stats.maxHp && (
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--secondary-text)',
                      marginLeft: '4px',
                      opacity: 0.7
                    }}>
                      (base: {detailViewPiece.rawStats.maxHp})
                    </span>
                  )}
                </span>
              </div>
              <div className="hp-bar">
                <div
                  className="hp-fill"
                  style={{ width: `${(detailViewPiece.stats.hp / detailViewPiece.stats.maxHp) * 100}%` }}
                />
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-item attack">
                <span className="stat-label">Attack (AD)</span>
                <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.ad !== detailViewPiece.stats.ad
                  ? `modified ${detailViewPiece.stats.ad > detailViewPiece.rawStats.ad ? 'buffed' : 'debuffed'}`
                  : ''
                  }`}>
                  {detailViewPiece.stats.ad}
                  {detailViewPiece.rawStats && detailViewPiece.rawStats.ad !== detailViewPiece.stats.ad && (
                    <span className="base-value">({detailViewPiece.rawStats.ad})</span>
                  )}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Ability (AP)</span>
                <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.ap !== detailViewPiece.stats.ap
                  ? `modified ${detailViewPiece.stats.ap > detailViewPiece.rawStats.ap ? 'buffed' : 'debuffed'}`
                  : ''
                  }`}>
                  {detailViewPiece.stats.ap}
                  {detailViewPiece.rawStats && detailViewPiece.rawStats.ap !== detailViewPiece.stats.ap && (
                    <span className="base-value">({detailViewPiece.rawStats.ap})</span>
                  )}
                </span>
              </div>
              <div className="stat-item armor">
                <span className="stat-label">Phys. Resist</span>
                <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.physicalResistance !== detailViewPiece.stats.physicalResistance
                  ? `modified ${detailViewPiece.stats.physicalResistance > detailViewPiece.rawStats.physicalResistance ? 'buffed' : 'debuffed'}`
                  : ''
                  }`}>
                  {detailViewPiece.stats.physicalResistance}
                  {detailViewPiece.rawStats && detailViewPiece.rawStats.physicalResistance !== detailViewPiece.stats.physicalResistance && (
                    <span className="base-value">({detailViewPiece.rawStats.physicalResistance})</span>
                  )}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Magic Resist</span>
                <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.magicResistance !== detailViewPiece.stats.magicResistance
                  ? `modified ${detailViewPiece.stats.magicResistance > detailViewPiece.rawStats.magicResistance ? 'buffed' : 'debuffed'}`
                  : ''
                  }`}>
                  {detailViewPiece.stats.magicResistance}
                  {detailViewPiece.rawStats && detailViewPiece.rawStats.magicResistance !== detailViewPiece.stats.magicResistance && (
                    <span className="base-value">({detailViewPiece.rawStats.magicResistance})</span>
                  )}
                </span>
              </div>
              <div className="stat-item speed">
                <span className="stat-label">Speed</span>
                <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.speed !== detailViewPiece.stats.speed
                  ? `modified ${detailViewPiece.stats.speed > detailViewPiece.rawStats.speed ? 'buffed' : 'debuffed'}`
                  : ''
                  }`}>
                  {detailViewPiece.stats.speed}
                  {detailViewPiece.rawStats && detailViewPiece.rawStats.speed !== detailViewPiece.stats.speed && (
                    <span className="base-value">({detailViewPiece.rawStats.speed})</span>
                  )}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Range</span>
                <span className={`stat-value ${detailViewPiece.rawStats && detailViewPiece.rawStats.attackRange.range !== detailViewPiece.stats.attackRange.range
                  ? `modified ${detailViewPiece.stats.attackRange.range > detailViewPiece.rawStats.attackRange.range ? 'buffed' : 'debuffed'}`
                  : ''
                  }`}>
                  {detailViewPiece.stats.attackRange.range}
                  {detailViewPiece.rawStats && detailViewPiece.rawStats.attackRange.range !== detailViewPiece.stats.attackRange.range && (
                    <span className="base-value">({detailViewPiece.rawStats.attackRange.range})</span>
                  )}
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
                    <img src={`/icons/${detailViewPiece.name.toLowerCase()}_skill.webp`} alt={detailViewPiece.name} className="skill-icon" />
                    <div className="skill-info" >
                      <div className="card-name">{detailViewPiece.skill.name}</div>
                      <div className="skill-type">{detailViewPiece.skill.type}</div>
                      <div className={`card-cooldown ${detailViewPiece.skill.currentCooldown > 0 ? 'cooling' : 'ready'}`}>
                        {detailViewPiece.skill.currentCooldown > 0
                          ? `Cooldown: ${detailViewPiece.skill.currentCooldown} turns`
                          : 'Ready to use'
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
                Debuffs ({(detailViewPiece as any).debuffs?.length || 0})
              </div>
              {(detailViewPiece as any).debuffs && (detailViewPiece as any).debuffs.length > 0 ? (
                (detailViewPiece as any).debuffs.map((debuff: any, index: number) => (
                  <div key={index} className="debuff-card">
                    <div className="card-name">{debuff.name}</div>
                    <div className="card-duration active">
                      Duration: {debuff.duration} turns remaining
                    </div>
                    <div className="card-description">
                      Effects: {debuff.effects?.map((effect: any) =>
                        `${effect.stat} ${effect.type === 'percentage' ? '' : ''}${effect.modifier > 0 ? '+' : ''}${effect.modifier}${effect.type === 'percentage' ? '%' : ''}`
                      ).join(', ') || 'No effect details available'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-items">No active debuffs</div>
              )}
            </div>

            <div className="items-section">
              <div className="section-header">
                <Package size={16} />
                Items ({(detailViewPiece as any).items?.length || 0})
              </div>
              {(detailViewPiece as any).items && (detailViewPiece as any).items.length > 0 ? (
                (detailViewPiece as any).items.map((item: any, index: number) => (
                  <div key={index} className="item-card">
                    <div className="card-name">{item.name}</div>
                    <div className="card-description">
                      {item.description || 'No description available'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-items">No items equipped</div>
              )}
            </div>
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

      <GameBoard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <TurnIndicator isMyTurn={isMyTurn}>
            {isMyTurn ? "Your Turn" : "Opponent's Turn"}
            <div className="round-info">Round {gameState.currentRound}</div>
          </TurnIndicator>

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
                // TODO: Implement offer draw functionality
                console.log('Offer draw clicked')
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
                  // TODO: Implement resign functionality
                  console.log('Resign clicked')
                }
              }}
            >
              🏳️ Resign
            </button>
          </div>
        </div>

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
                {isSkillMode ? (
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                    ⚡ Select a target for {selectedPiece.skill?.name} ({validSkillTargets.length} targets available)
                  </span>
                ) : (
                  <>
                    {validMoves.length > 0 && `${validMoves.length} moves available`}
                    {validMoves.length > 0 && validAttacks.length > 0 && ' • '}
                    {validAttacks.length > 0 && `${validAttacks.length} attacks available`}
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  clearSelection()
                  setDetailViewPiece(null)
                }}
                style={{ background: 'var(--accent-bg)' }}
              >
                {isSkillMode ? 'Cancel Skill' : 'Clear Selection'}
              </button>

              {!isSkillMode && selectedPiece.skill && selectedPiece.skill.type === 'active' && (
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
          </GameActions>
        )}
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
        </DevToolsPanel>
      )}
    </GameContainer>
  )
}

export default GamePage
