import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Sword, Shield, X, SkipForward, Zap, Target, RotateCcw, Check, Shuffle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { useBanPick } from '../hooks/useBanPick'
import { useChampions, ChampionData } from '../hooks/useChampions'
import { resetBanPick } from '../store/gameSlice'

const BanPickContainer = styled.div`
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background: radial-gradient(ellipse at top, rgba(200, 155, 60, 0.15) 0%, var(--primary-bg) 50%, var(--primary-bg) 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(200, 155, 60, 0.05) 50%, transparent 100%);
    pointer-events: none;
  }
`

const Header = styled.div`
  background: linear-gradient(180deg, var(--secondary-bg) 0%, rgba(30, 35, 40, 0.95) 100%);
  border-bottom: 3px solid var(--gold);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  z-index: 100;
  position: relative;
  flex-shrink: 0;
`

const GameInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  h2 {
    color: var(--gold);
    margin: 0;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 0 2px 8px rgba(200, 155, 60, 0.5);
    letter-spacing: 1px;
  }
  
  .phase {
    background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
    padding: 8px 16px;
    border-radius: 8px;
    color: var(--primary-bg);
    font-weight: bold;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 1px;
    box-shadow: 0 4px 12px rgba(200, 155, 60, 0.4);
  }
`

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 20px;
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;
  overflow: hidden;
  min-height: 0;
`

const BannedChampionsSection = styled.div`
  background: linear-gradient(135deg, var(--secondary-bg) 0%, rgba(30, 35, 40, 0.9) 100%);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%);
  }
  
  h3 {
    color: var(--gold);
    margin: 0 0 8px 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    text-shadow: 0 2px 8px rgba(200, 155, 60, 0.5);
    
    svg {
      filter: drop-shadow(0 2px 4px rgba(200, 155, 60, 0.5));
    }
  }
`

const BannedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-width: 500px;
  margin: 0 auto;
`

const BannedChampionSlot = styled(motion.div) <{ banned?: boolean; skipped?: boolean }>`
  aspect-ratio: 1;
  background: linear-gradient(135deg, var(--accent-bg) 0%, rgba(60, 60, 65, 0.5) 100%);
  border: 3px solid var(--border);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 48px;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  
  .champion-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
  }
  
  .empty-slot {
    color: var(--secondary-text);
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  ${props => props.banned && !props.skipped && `
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.3) 100%);
    border-color: #ef4444;
    
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, transparent 0%, #ef4444 20%, #ef4444 80%, transparent 100%);
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
    }
    
    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, transparent 0%, #ef4444 20%, #ef4444 80%, transparent 100%);
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
    }
    
    img {
      filter: grayscale(1) brightness(0.5);
    }
  `}
  
  ${props => props.skipped && `
    background: linear-gradient(135deg, var(--secondary-text) 0%, rgba(160, 155, 140, 0.5) 100%);
    border-color: var(--secondary-text);
    opacity: 0.6;
    
    svg {
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }
  `}
`

const PlayerSections = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr 260px;
  gap: 12px;
  align-items: center;
  flex: 1;
  min-height: 0;
  
  @media (max-width: 1400px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`

const SkipBanButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--accent-bg) 0%, rgba(60, 60, 65, 0.8) 100%);
  border: 2px solid var(--border);
  color: var(--primary-text);
  padding: 10px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  font-size: 11px;
  width: 100%;
  justify-content: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  
  svg {
    transition: transform 0.3s ease;
    width: 14px;
    height: 14px;
  }
  
  &:hover {
    border-color: var(--gold);
    background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
    color: var(--primary-bg);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(200, 155, 60, 0.4);
    
    svg {
      transform: translateX(4px);
    }
  }
  
  &:active {
    transform: translateY(0px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    
    &:hover {
      border-color: var(--border);
      background: linear-gradient(135deg, var(--accent-bg) 0%, rgba(60, 60, 65, 0.8) 100%);
      color: var(--primary-text);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      
      svg {
        transform: none;
      }
    }
  }
`

const SidePanel = styled.div<{ isActive?: boolean }>`
  background: linear-gradient(135deg, var(--secondary-bg) 0%, rgba(30, 35, 40, 0.9) 100%);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  height: fit-content;
  max-height: 100%;
  
  h3 {
    color: var(--gold);
    margin: 0 0 4px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    text-shadow: 0 2px 4px rgba(200, 155, 60, 0.5);
  }
  
  h4 {
    color: var(--primary-text);
    margin: 0 0 6px 0;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.8;
  }
  
  &.blue {
    border-left: 5px solid #0596aa;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 5px;
      height: 100%;
      background: linear-gradient(180deg, #0596aa 0%, transparent 100%);
      box-shadow: 0 0 20px rgba(5, 150, 170, 0.5);
    }
  }
  
  &.red {
    border-left: 5px solidrgb(240, 21, 21);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 5px;
      height: 100%;
      background: linear-gradient(180deg,rgb(255, 0, 0) 0%, transparent 100%);
      box-shadow: 0 0 20px rgba(250, 0, 0, 0.5);
    }
  }
  
  ${props => props.isActive && `
    border-color: var(--gold);
    box-shadow: 0 0 40px rgba(200, 155, 60, 0.5);
    background: linear-gradient(135deg, rgba(200, 155, 60, 0.15) 0%, rgba(30, 35, 40, 0.9) 100%);
    
    &::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: conic-gradient(
        from 0deg,
        transparent 0deg,
        rgba(200, 155, 60, 0.3) 60deg,
        transparent 120deg
      );
      animation: rotateGlow 3s linear infinite;
      pointer-events: none;
    }
    
    @keyframes rotateGlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `}
`

const BanIndicator = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  flex-shrink: 0;
  
  h4 {
    color: #ef4444;
    margin: 0 0 6px 0;
    font-size: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
`

const BanSlot = styled.div<{ filled?: boolean }>`
  width: 40px;
  height: 40px;
  background: ${props => props.filled ? 'var(--accent-bg)' : 'rgba(0, 0, 0, 0.3)'};
  border: 2px solid ${props => props.filled ? '#ef4444' : 'var(--border)'};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s ease;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
    filter: grayscale(1) brightness(0.5);
  }
  
  ${props => props.filled && `
    &::after {
      content: "✕";
      position: absolute;
      color: #ef4444;
      font-size: 20px;
      font-weight: bold;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    }
  `}
`

const ChampionGrid = styled.div`
  background: linear-gradient(135deg, var(--secondary-bg) 0%, rgba(30, 35, 40, 0.9) 100%);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%);
  }
  
  h3 {
    color: var(--gold);
    margin: 0 0 8px 0;
    text-align: center;
    font-size: 14px;
    text-shadow: 0 2px 8px rgba(200, 155, 60, 0.5);
    flex-shrink: 0;
  }
`

const ChampionList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  overflow-y: auto;
  padding: 4px;
  flex: 1;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--primary-bg);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--gold);
    border-radius: 4px;
    
    &:hover {
      background: #b8860b;
    }
  }
`

const ChampionCard = styled(motion.div) <{
  banned?: boolean;
  picked?: boolean;
  clickable?: boolean;
}>`
  aspect-ratio: 3/4;
  background: linear-gradient(135deg, var(--accent-bg) 0%, rgba(60, 60, 65, 0.5) 100%);
  border: 2px solid var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  .champion-portrait {
    width: 100%;
    height: 70%;
    object-fit: cover;
    transition: all 0.3s ease;
  }
  
  .champion-info {
    flex: 1;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
  }
  
  .name {
    font-size: 13px;
    font-weight: bold;
    text-align: center;
    color: var(--primary-text);
    margin-bottom: 4px;
  }
  
  .stats {
    font-size: 10px;
    color: var(--secondary-text);
    text-align: center;
  }
  
  ${props => props.clickable && `
    &:hover {
      transform: translateY(-4px) scale(1.02);
      border-color: var(--gold);
      box-shadow: 0 8px 24px rgba(200, 155, 60, 0.4);
      z-index: 10;
      
      .champion-portrait {
        transform: scale(1.1);
      }
      
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 0%, rgba(200, 155, 60, 0.2) 100%);
        pointer-events: none;
      }
    }
    
    &:active {
      transform: translateY(-2px) scale(1.0);
    }
  `}
  
  ${props => props.banned && `
    opacity: 0.4;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.2) 100%);
    pointer-events: none;
    filter: grayscale(1);
    
    .champion-portrait {
      filter: brightness(0.5);
    }
    
    &::after {
      content: "BANNED";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-12deg);
      background: #ef4444;
      color: white;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.8);
      letter-spacing: 1px;
    }
  `}
  
  ${props => props.picked && `
    opacity: 0.5;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 163, 74, 0.2) 100%);
    pointer-events: none;
    
    .champion-portrait {
      filter: brightness(0.7);
    }
    
    &::after {
      content: "PICKED";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-8deg);
      background: #22c55e;
      color: white;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.6);
      letter-spacing: 1px;
    }
  `}
`

const BanPickList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--gold);
    border-radius: 2px;
  }
`

const BanPickSlot = styled.div<{ filled?: boolean; active?: boolean }>`
  height: 48px;
  width: 100%;
  background: ${props => props.filled ? 'linear-gradient(135deg, var(--accent-bg) 0%, rgba(60, 60, 65, 0.8) 100%)' : 'rgba(0, 0, 0, 0.3)'};
  border: 2px solid ${props => props.active ? 'var(--gold)' : 'var(--border)'};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s ease;
  padding: 4px;
  overflow: hidden;
  box-shadow: ${props => props.active ? '0 0 20px rgba(200, 155, 60, 0.5)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'};
  flex-shrink: 0;
  
  ${props => props.active && `
    animation: activePulse 2s ease-in-out infinite;
    
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(200, 155, 60, 0.3) 50%, transparent 100%);
      animation: shimmer 2s linear infinite;
    }
  `}
  
  @keyframes activePulse {
    0%, 100% { box-shadow: 0 0 20px rgba(200, 155, 60, 0.5); }
    50% { box-shadow: 0 0 30px rgba(200, 155, 60, 0.8); }
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .champion-icon {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .empty-text {
    font-size: 9px;
    color: var(--secondary-text);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
`

const TurnIndicator = styled(motion.div) <{ isMyTurn: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  background: ${props => props.isMyTurn
    ? 'linear-gradient(135deg, var(--gold) 0%, #b8860b 100%)'
    : 'linear-gradient(135deg, var(--secondary-text) 0%, #5b5b5b 100%)'};
  color: ${props => props.isMyTurn ? 'var(--primary-bg)' : 'white'};
  padding: 32px 64px;
  border-radius: 16px;
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  z-index: 1000;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  border: 3px solid ${props => props.isMyTurn ? '#ffd700' : '#888'};
  letter-spacing: 2px;
  text-transform: uppercase;
  
  ${props => props.isMyTurn && `
    animation: victoryGlow 1s ease-in-out infinite;
    
    @keyframes victoryGlow {
      0%, 100% { box-shadow: 0 12px 48px rgba(200, 155, 60, 0.6); }
      50% { box-shadow: 0 12px 64px rgba(200, 155, 60, 1); }
    }
  `}
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

const ReorderContainer = styled.div`
  background: linear-gradient(135deg, var(--secondary-bg) 0%, rgba(30, 35, 40, 0.9) 100%);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%);
  }
  
  h3 {
    color: var(--gold);
    margin: 0 0 16px 0;
    text-align: center;
    font-size: 18px;
    text-shadow: 0 2px 8px rgba(200, 155, 60, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
`

const ReorderInstructions = styled.div`
  text-align: center;
  color: var(--secondary-text);
  font-size: 14px;
  margin-bottom: 20px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`

const ChampionOrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
`

const SortableChampionCard = styled(motion.div) <{ isDragging?: boolean; isReady?: boolean }>`
  background: linear-gradient(135deg, var(--accent-bg) 0%, rgba(60, 60, 65, 0.8) 100%);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: ${props => props.isReady ? 'default' : 'grab'};
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  ${props => props.isDragging && `
    opacity: 0.5;
    cursor: grabbing;
    transform: scale(1.05);
    z-index: 1000;
  `}
  
  ${props => !props.isReady && `
    &:hover {
      border-color: var(--gold);
      transform: translateX(4px);
      box-shadow: 0 6px 20px rgba(200, 155, 60, 0.4);
    }
  `}
  
  .position-number {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    color: var(--primary-bg);
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(200, 155, 60, 0.4);
  }
  
  .champion-portrait {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
  }
  
  .champion-details {
    flex: 1;
    
    .name {
      font-size: 16px;
      font-weight: bold;
      color: var(--primary-text);
      margin-bottom: 4px;
    }
    
    .hint {
      font-size: 12px;
      color: var(--secondary-text);
    }
  }
  
  .drag-handle {
    color: var(--secondary-text);
    opacity: ${props => props.isReady ? '0.3' : '0.6'};
    transition: opacity 0.3s ease;
    
    ${props => !props.isReady && `
      &:hover {
        opacity: 1;
      }
    `}
  }
`

const ReadySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding-top: 16px;
  border-top: 2px solid var(--border);
`

const ReadyButton = styled(motion.button) <{ isReady?: boolean }>`
  background: ${props => props.isReady
    ? 'linear-gradient(135deg, var(--gold) 0%, #b8860b 100%)'
    : 'linear-gradient(135deg, var(--accent-bg) 0%, rgba(60, 60, 65, 0.8) 100%)'};
  border: 2px solid ${props => props.isReady ? 'var(--gold)' : 'var(--border)'};
  color: ${props => props.isReady ? 'var(--primary-bg)' : 'var(--primary-text)'};
  padding: 12px 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: ${props => props.isReady
    ? '0 6px 20px rgba(200, 155, 60, 0.4)'
    : '0 4px 12px rgba(0, 0, 0, 0.2)'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.isReady
    ? '0 8px 24px rgba(200, 155, 60, 0.6)'
    : '0 6px 20px rgba(200, 155, 60, 0.3)'};
    border-color: var(--gold);
  }
  
  &:active {
    transform: translateY(0px);
  }
`

const ReadyStatusIndicator = styled.div<{ isReady?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${props => props.isReady
    ? 'rgba(34, 197, 94, 0.2)'
    : 'rgba(160, 155, 140, 0.2)'};
  border: 2px solid ${props => props.isReady ? '#22c55e' : 'var(--secondary-text)'};
  border-radius: 8px;
  font-size: 12px;
  color: ${props => props.isReady ? '#22c55e' : 'var(--secondary-text)'};
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  
  svg {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
`

const BothReadyMessage = styled(motion.div)`
  background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
  border: 3px solid #ffd700;
  border-radius: 12px;
  padding: 16px 24px;
  text-align: center;
  color: var(--primary-bg);
  font-size: 16px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 8px 24px rgba(200, 155, 60, 0.6);
  
  animation: pulseGlow 1.5s ease-in-out infinite;
  
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 8px 24px rgba(200, 155, 60, 0.6); }
    50% { box-shadow: 0 8px 32px rgba(200, 155, 60, 1); }
  }
`

interface SortableItemProps {
  id: string
  index: number
  championName: string
  isReady: boolean
}

const SortableItem: React.FC<SortableItemProps> = ({ id, index, championName, isReady }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isReady })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <SortableChampionCard
      ref={setNodeRef}
      style={style}
      isDragging={isDragging}
      isReady={isReady}
      {...(isReady ? {} : { ...attributes, ...listeners })}
    >
      <div className="position-number">{index + 1}</div>
      <img
        src={`/icons/${championName.toLowerCase()}.webp`}
        alt={championName}
        className="champion-portrait"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <div className="champion-details">
        <div className="name">{championName}</div>
        <div className="hint">
          {index === 0 && "Back Row - Tank"}
          {index === 1 && "Back Row - Support"}
          {index === 2 && "Front Row - DPS"}
          {index === 3 && "Front Row - Carry"}
          {index === 4 && "Front Row - Flex"}
        </div>
      </div>
      {!isReady && (
        <div className="drag-handle">
          <Shuffle size={24} />
        </div>
      )}
    </SortableChampionCard>
  )
}

const BanPickPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { user } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const [showTurnIndicator, setShowTurnIndicator] = useState(false)

  // Get champion data
  const { champions, loading: championsLoading, error: championsError } = useChampions()

  // Get loading state from Redux for reset operation
  const isResetting = useAppSelector((state) => state.game.loading)

  // Use the actual ban/pick hook
  const {
    isConnected,
    loading: banPickLoading,
    gameData,
    banPickState,
    playerSide,
    isMyTurn,
    currentAction,
    banChampion,
    pickChampion,
    skipBan,
    reorderChampions,
    setReady,
  } = useBanPick(gameId || '')

  // Local state for champion order during reorder phase
  const [localChampionOrder, setLocalChampionOrder] = useState<string[]>([])

  const currentPhase = banPickState?.phase === 'ban' ? 'Ban Phase' :
    banPickState?.phase === 'pick' ? 'Pick Phase' :
      banPickState?.phase === 'reorder' ? 'Reorder Phase' :
        'Loading...'

  useEffect(() => {
    if (!gameId || !user) {
      navigate('/lobby')
      return
    }
  }, [gameId, user, navigate])


  useEffect(() => {
    if (!banPickState) return

    // Show turn indicator briefly when turn changes
    setShowTurnIndicator(true)
    const timer = setTimeout(() => setShowTurnIndicator(false), 2500)
    return () => clearTimeout(timer)
  }, [banPickState?.currentTurn])

  const handleChampionClick = (championName: string) => {
    if (!banPickState) return

    if (!isMyTurn) {
      toast.error("It's not your turn!")
      return
    }

    if (banPickState.bannedChampions.includes(championName) ||
      banPickState.bluePicks.includes(championName) ||
      banPickState.redPicks.includes(championName)) {
      toast.error('Champion already banned or picked!')
      return
    }

    // Use the actual ban/pick functions
    if (banPickState.phase === 'ban') {
      banChampion(championName)
    } else if (banPickState.phase === 'pick') {
      pickChampion(championName)
    }
  }

  const handleSkipBan = () => {
    if (!banPickState || banPickState.phase !== 'ban' || !isMyTurn) return
    skipBan()
  }

  // Initialize local champion order when entering reorder phase
  useEffect(() => {
    if (banPickState?.phase === 'reorder' && playerSide) {
      const currentOrder = playerSide === 'blue'
        ? banPickState.blueChampionOrder
        : banPickState.redChampionOrder

      if (currentOrder && currentOrder.length > 0) {
        setLocalChampionOrder(currentOrder)
      }
    }
  }, [banPickState?.phase, banPickState?.blueChampionOrder, banPickState?.redChampionOrder, playerSide])

  // Handle drag and drop reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setLocalChampionOrder((items) => {
      const oldIndex = items.indexOf(active.id as string)
      const newIndex = items.indexOf(over.id as string)

      const newOrder = arrayMove(items, oldIndex, newIndex)

      // Send the new order to the server
      reorderChampions(newOrder)

      return newOrder
    })
  }

  const handleReadyToggle = () => {
    if (!banPickState || banPickState.phase !== 'reorder') return

    const isCurrentlyReady = playerSide === 'blue'
      ? banPickState.blueReady
      : banPickState.redReady

    setReady(!isCurrentlyReady)
  }

  // Reset ban/pick (dev tools)
  const handleResetBanPick = useCallback(async () => {
    if (!gameId || isResetting) return

    try {
      // Dispatch the reset ban/pick thunk
      const result = await dispatch(resetBanPick(gameId))

      if (resetBanPick.fulfilled.match(result)) {
        // Success
        toast.success('Ban/Pick phase has been reset!')
      } else {
        // Error handled by Redux, but we can show additional feedback
        console.error('Failed to reset ban/pick:', result.error?.message)
        toast.error('Failed to reset ban/pick phase')
      }
    } catch (error) {
      console.error('Error resetting ban/pick:', error)
      toast.error('Error resetting ban/pick phase')
    }
  }, [gameId, isResetting, dispatch])

  if (championsLoading || banPickLoading) {
    return (
      <BanPickContainer>
        <Header>
          <GameInfo>
            <h2>Champion Select</h2>
            <div className="phase">Loading...</div>
          </GameInfo>
        </Header>
        <MainContent>
          <div style={{ textAlign: 'center', color: 'var(--primary-text)', fontSize: '18px' }}>
            ⏳ {championsLoading ? 'Loading champions...' : 'Loading ban/pick state...'}
          </div>
        </MainContent>
      </BanPickContainer>
    )
  }

  if (championsError) {
    return (
      <BanPickContainer>
        <Header>
          <GameInfo>
            <h2>Champion Select</h2>
            <div className="phase">Error</div>
          </GameInfo>
        </Header>
        <MainContent>
          <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '18px' }}>
            ❌ Error loading champions: {championsError}
          </div>
        </MainContent>
      </BanPickContainer>
    )
  }

  // Check if ban/pick state is available
  if (!banPickLoading && !banPickState) {
    return (
      <BanPickContainer>
        <Header>
          <GameInfo>
            <h2>Champion Select</h2>
            <div className="phase">Error</div>
          </GameInfo>
        </Header>
        <MainContent>
          <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '18px' }}>
            ❌ Ban/Pick phase not found. Redirecting...
          </div>
        </MainContent>
      </BanPickContainer>
    )
  }

  // Get blue and red bans for display
  const blueBans = banPickState?.blueBans || []
  const redBans = banPickState?.redBans || []

  // Create panel components
  const blueSidePanel = (
    <SidePanel className="blue" isActive={banPickState?.currentTurn === 'blue'}>
      <h3>
        <Shield size={16} />
        Blue Side {banPickState?.currentTurn === 'blue' && <Zap size={14} />}
      </h3>

      {/* Bans */}
      <BanIndicator>
        <div style={{ flex: 1 }}>
          <h4><Target size={12} />Bans ({blueBans.length}/2)</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1].map(index => (
              <BanSlot key={`blue-ban-${index}`} filled={!!blueBans[index]}>
                {blueBans[index] && (
                  <img
                    src={`/icons/${blueBans[index].toLowerCase()}.webp`}
                    alt={blueBans[index]}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
              </BanSlot>
            ))}
          </div>
        </div>
      </BanIndicator>

      {/* Picks */}
      <div>
        <h4>Picks ({banPickState?.bluePicks.length || 0}/5)</h4>
        <BanPickList>
          {[0, 1, 2, 3, 4].map(index => (
            <BanPickSlot
              key={`blue-pick-${index}`}
              filled={!!(banPickState?.bluePicks[index])}
              active={isMyTurn && playerSide === 'blue' && banPickState?.phase === 'pick' && (banPickState?.bluePicks.length === index)}
            >
              {banPickState?.bluePicks[index] ? (
                <img
                  src={`/icons/${banPickState.bluePicks[index].toLowerCase()}.webp`}
                  alt={banPickState.bluePicks[index]}
                  className="champion-icon"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="empty-text">Pick {index + 1}</div>
              )}
            </BanPickSlot>
          ))}
        </BanPickList>
      </div>

      {/* Skip Ban Button */}
      {banPickState?.phase === 'ban' && isMyTurn && playerSide === 'blue' && (
        <SkipBanButton
          onClick={handleSkipBan}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <SkipForward size={18} />
          Skip Ban
        </SkipBanButton>
      )}
    </SidePanel>
  )

  const redSidePanel = (
    <SidePanel className="red" isActive={banPickState?.currentTurn === 'red'}>
      <h3>
        <Sword size={16} />
        Red Side {banPickState?.currentTurn === 'red' && <Zap size={14} />}
      </h3>

      {/* Bans */}
      <BanIndicator>
        <div style={{ flex: 1 }}>
          <h4><Target size={12} />Bans ({redBans.length}/2)</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1].map(index => (
              <BanSlot key={`red-ban-${index}`} filled={!!redBans[index]}>
                {redBans[index] && (
                  <img
                    src={`/icons/${redBans[index].toLowerCase()}.webp`}
                    alt={redBans[index]}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
              </BanSlot>
            ))}
          </div>
        </div>
      </BanIndicator>

      {/* Picks */}
      <div>
        <h4>Picks ({banPickState?.redPicks.length || 0}/5)</h4>
        <BanPickList>
          {[0, 1, 2, 3, 4].map(index => (
            <BanPickSlot
              key={`red-pick-${index}`}
              filled={!!(banPickState?.redPicks[index])}
              active={isMyTurn && playerSide === 'red' && banPickState?.phase === 'pick' && (banPickState?.redPicks.length === index)}
            >
              {banPickState?.redPicks[index] ? (
                <img
                  src={`/icons/${banPickState.redPicks[index].toLowerCase()}.webp`}
                  alt={banPickState.redPicks[index]}
                  className="champion-icon"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="empty-text">Pick {index + 1}</div>
              )}
            </BanPickSlot>
          ))}
        </BanPickList>
      </div>

      {/* Skip Ban Button */}
      {banPickState?.phase === 'ban' && isMyTurn && playerSide === 'red' && (
        <SkipBanButton
          onClick={handleSkipBan}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <SkipForward size={18} />
          Skip Ban
        </SkipBanButton>
      )}
    </SidePanel>
  )

  // Reorder phase UI
  const reorderUI = (
    <ReorderContainer>
      <h3>
        <Shuffle size={20} />
        Arrange Your Champion Lineup
      </h3>
      <ReorderInstructions>
        Drag and drop to reorder your champions. The order determines their starting positions on the board.
      </ReorderInstructions>

      {localChampionOrder.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localChampionOrder}
            strategy={verticalListSortingStrategy}
          >
            <ChampionOrderList>
              {localChampionOrder.map((championName, index) => (
                <SortableItem
                  key={championName}
                  id={championName}
                  index={index}
                  championName={championName}
                  isReady={playerSide === 'blue' ? !!banPickState?.blueReady : !!banPickState?.redReady}
                />
              ))}
            </ChampionOrderList>
          </SortableContext>
        </DndContext>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--secondary-text)', padding: '20px' }}>
          Loading your champions...
        </div>
      )}

      <ReadySection>
        {/* Show both players' ready status */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <ReadyStatusIndicator isReady={banPickState?.blueReady}>
            {banPickState?.blueReady ? <Check size={16} /> : <X size={16} />}
            Blue {playerSide === 'blue' && '(You)'}
          </ReadyStatusIndicator>
          <ReadyStatusIndicator isReady={banPickState?.redReady}>
            {banPickState?.redReady ? <Check size={16} /> : <X size={16} />}
            Red {playerSide === 'red' && '(You)'}
          </ReadyStatusIndicator>
        </div>

        {/* Show "Both Ready" message or Ready button */}
        {banPickState?.blueReady && banPickState?.redReady ? (
          <BothReadyMessage
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            🎮 Both Players Ready! Starting Game...
          </BothReadyMessage>
        ) : (
          <ReadyButton
            isReady={playerSide === 'blue' ? banPickState?.blueReady : banPickState?.redReady}
            onClick={handleReadyToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {(playerSide === 'blue' ? banPickState?.blueReady : banPickState?.redReady) ? (
              <>
                <X size={18} />
                Unready (Make Changes)
              </>
            ) : (
              <>
                <Check size={18} />
                Ready to Start
              </>
            )}
          </ReadyButton>
        )}
      </ReadySection>
    </ReorderContainer>
  )

  const championGrid = (
    <ChampionGrid>
      <h3>Select Champions ({champions.length} Available)</h3>
      <ChampionList>
        {champions.map(champion => (
          <ChampionCard
            key={champion.name}
            banned={banPickState?.bannedChampions.includes(champion.name) || false}
            picked={(banPickState?.bluePicks.includes(champion.name) || banPickState?.redPicks.includes(champion.name)) || false}
            clickable={!!(isMyTurn && banPickState && !banPickState.bannedChampions.includes(champion.name) && !banPickState.bluePicks.includes(champion.name) && !banPickState.redPicks.includes(champion.name))}
            onClick={() => handleChampionClick(champion.name)}
            whileHover={isMyTurn ? { scale: 1.03 } : {}}
            whileTap={isMyTurn ? { scale: 0.97 } : {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={`/icons/${champion.name.toLowerCase()}.webp`}
              alt={champion.name}
              className="champion-portrait"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="champion-info">
              <div className="name">{champion.name}</div>
              <div className="stats">
                HP: {champion.stats.maxHp} | AD: {champion.stats.ad}
              </div>
            </div>
          </ChampionCard>
        ))}
      </ChampionList>
    </ChampionGrid>
  )

  return (
    <BanPickContainer>
      <Header>
        <GameInfo>
          <h2>Champion Select</h2>
          <div className="phase">{currentPhase}</div>
        </GameInfo>
      </Header>

      <MainContent>
        {banPickState?.phase === 'reorder' ? (
          // Reorder phase - show reorder UI instead of pick UI
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
            maxWidth: '800px',
            margin: '0 auto',
            width: '100%'
          }}>
            {reorderUI}
          </div>
        ) : (
          // Ban/Pick phases - show normal UI
          <PlayerSections>
            {/* Conditionally render panels - player's side always on the left */}
            {playerSide === 'blue' ? (
              <>
                {blueSidePanel}
                {championGrid}
                {redSidePanel}
              </>
            ) : (
              <>
                {redSidePanel}
                {championGrid}
                {blueSidePanel}
              </>
            )}
          </PlayerSections>
        )}
      </MainContent>

      {/* Turn Indicator */}
      <AnimatePresence>
        {showTurnIndicator && (
          <TurnIndicator
            isMyTurn={isMyTurn}
            initial={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            {isMyTurn ? 'YOUR TURN!' : "OPPONENT'S TURN"}
          </TurnIndicator>
        )}
      </AnimatePresence>

      {/* Development Tools - Only show in development environment */}
      {import.meta.env.DEV && (
        <DevToolsPanel>
          <h4>🔧 Dev Tools</h4>
          <button
            className="dev-button"
            onClick={handleResetBanPick}
            disabled={isResetting || !gameData}
            title="Reset the ban/pick phase to initial state"
          >
            <RotateCcw size={14} />
            {isResetting ? 'Resetting...' : 'Reset Ban/Pick'}
          </button>
        </DevToolsPanel>
      )}
    </BanPickContainer>
  )
}

export default BanPickPage
