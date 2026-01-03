import { AlertCircle, Check, Coins, Package, Shield, ShoppingCart, Users, Zap } from 'lucide-react';
import React, { useMemo } from 'react';
import styled from "styled-components";
import { AttackRangeIndicator } from '../components/AttackRangeIndicator';
import { ChessPiece } from "../hooks/useGame";
import { ItemData } from '../store/itemsSlice';
import { formatNumber, getIconConfig, getImageUrl, getSkillStateDisplay, getStatIcon, isChampion, VIKTOR_DAMAGE_THRESHOLDS } from "../utils/chessHelper";

const ChessDetailPanel = styled.div`
  grid-area: player-info;
  background: linear-gradient(135deg, rgba(30, 35, 40, 0.95) 0%, rgba(20, 25, 35, 0.95) 100%);
  border: 2px solid rgba(200, 155, 60, 0.3);
  border-radius: 12px;
  padding: 18px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  box-shadow: 
    inset 0 0 20px rgba(0, 0, 0, 0.3),
    0 4px 16px rgba(0, 0, 0, 0.4);
  
  h3 {
    color: var(--gold);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    position: sticky;
    top: -18px;
    background: linear-gradient(135deg, rgba(30, 35, 40, 1) 0%, rgba(20, 25, 35, 1) 100%);
    padding: 18px 18px 12px 18px;
    margin: -18px -18px 16px -18px;
    z-index: 10;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    font-weight: bold;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(200, 155, 60, 0.2);
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
      
      &.transform-debuff {
        border-color: rgba(255, 215, 0, 0.6);
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(184, 134, 11, 0.08) 100%);
        box-shadow: 0 0 12px rgba(255, 215, 0, 0.2);
        
        &:hover {
          border-color: #ffd700;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, rgba(184, 134, 11, 0.12) 100%);
          box-shadow: 0 4px 16px rgba(255, 215, 0, 0.3);
        }
        
        .card-name {
          color: #ffd700;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }
        
        .debuff-icon {
          border-color: rgba(255, 215, 0, 0.5) !important;
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
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
      transition: opacity 0.2s ease, visibility 0.2s ease;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      
      /* Position will be calculated via JS */
      top: 0;
      left: 0;
      
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
        transition: opacity 0.2s ease, visibility 0.2s ease;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        
        /* Position will be calculated via JS */
        top: 0;
        left: 0;
        bottom: auto;
        
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

// Helper function to render debuff icons
const getDebuffIcon = (debuff: any, iconConfig: { src: string; alt: string }) => {
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

const damageReductionPercentage = (protectionFactor: number) => {
    if (protectionFactor <= 0) {
        return 0;
    }
    return Math.round(100 * protectionFactor / (protectionFactor + 50));
}

export const ChessDetailPanelRenderer: React.FC<{
    detailViewPiece: ChessPiece | null,
    currentPlayer: any,
    isMyTurn: boolean,
    hasBoughtItemThisTurn: boolean,
    hasPerformedActionThisTurn: boolean,
    setTooltipPosition: (tooltipPosition: { top: number; left: number; content: string } | null) => void,
    basicItems: ItemData[],
    allItems: ItemData[],
    viktorModules: ItemData[],
    handleBuyItem: (itemId: string, championId: string) => void
    shopItems: string[] | null,
    itemsLoading: boolean,
}> = ({ detailViewPiece, currentPlayer, isMyTurn, hasBoughtItemThisTurn, hasPerformedActionThisTurn, setTooltipPosition, basicItems, allItems, viktorModules, handleBuyItem, shopItems, itemsLoading }) => {
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

    const isBasicItem = (itemId: string) => {
        return basicItems.some(item => item.id === itemId)
    }

    const getCurrentItemPrice = (player: any): number => {
        if (!player) return 25; // default base cost
        const baseItemCost = player.baseItemCost ?? 25;
        const itemsBought = player.itemsBought ?? 0;
        const inflationStep = player.inflationStep ?? 15;
        return baseItemCost + (Math.min(itemsBought, 5) * inflationStep);
    }

    const checkItemNotPurchasability = (item: ItemData, piece: ChessPiece, gold: number) => {
        const itemLength = (piece as any).items?.length || 0
        if (itemLength > 3) return true
        if (itemLength === 3 && (piece as any).items.every((item: ItemData) => !isBasicItem(item.id))) return true

        // Use dynamic pricing for basic items
        const currentPrice = item.isBasic ? getCurrentItemPrice(currentPlayer) : item.cost;
        if (gold < currentPrice) return true

        if (!isMyTurn) return true
        // Check turn state flags
        if (hasBoughtItemThisTurn) return true
        if (hasPerformedActionThisTurn) return true
        return false
    }


    // Filter shop items based on gameState.shopItems (rotated selection) or fall back to all basicItems
    const shopItemsData = useMemo(() => {
        if (shopItems && shopItems.length > 0) {
            // Filter basicItems to only show the ones in gameState.shopItems
            return basicItems.filter(item => shopItems?.includes(item.id))
        }
        // Fallback: show all basic items if shopItems not set (backwards compatibility)
        return basicItems
    }, [shopItems, basicItems])

    const displayDetailStats = (detailViewPiece: any, statName: string): string => {
        const base = statName === 'attackRange' ? (detailViewPiece.rawStats as any).attackRange?.range || 0 : (detailViewPiece.rawStats as any)[statName] || 0
        const current = statName === 'attackRange' ? detailViewPiece.stats.attackRange?.range || 0 : detailViewPiece.stats[statName] || 0
        const gap = current - base
        if (gap === 0) {
            return ''
        }
        return `${base}${gap > 0 ? '+' : ''}${gap}`
    }

    return (
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Attack Damage ${displayDetailStats(detailViewPiece, 'ad')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Ability Power ${displayDetailStats(detailViewPiece, 'ap')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Physical Resistance (${damageReductionPercentage(detailViewPiece.stats.physicalResistance)}%) ${displayDetailStats(detailViewPiece, 'physicalResistance')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Magic Resistance (${damageReductionPercentage(detailViewPiece.stats.magicResistance)}%) ${displayDetailStats(detailViewPiece, 'magicResistance')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Movement Speed ${displayDetailStats(detailViewPiece, 'speed')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Attack Range ${displayDetailStats(detailViewPiece, 'attackRange')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Sunder (Armor Penetration) ${displayDetailStats(detailViewPiece, 'sunder')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Critical Strike Chance (%) ${displayDetailStats(detailViewPiece, 'criticalChance')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Critical Strike Damage (%) ${displayDetailStats(detailViewPiece, 'criticalDamage')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Damage Amplification (%) ${displayDetailStats(detailViewPiece, 'damageAmplification')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Cooldown Reduction (%) ${displayDetailStats(detailViewPiece, 'cooldownReduction')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Lifesteal (%) ${displayDetailStats(detailViewPiece, 'lifesteal')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `HP Regeneration per Turn ${displayDetailStats(detailViewPiece, 'hpRegen')}`)}
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
                            onMouseEnter={(e) => handleTooltipShow(e, `Durability (% damage reduction) ${displayDetailStats(detailViewPiece, 'durability')}`)}
                            onMouseLeave={handleTooltipHide}
                        >
                            <span className="stat-label"><img src="/icons/icon-durability.png" alt="Durability" width={14} height={14} /></span>
                            <span className={`stat-value ${detailViewPiece.rawStats && +((detailViewPiece.rawStats as any).durability || 0) !== +(detailViewPiece.stats.durability || 0)
                                ? `modified ${(detailViewPiece.stats.durability || 0) > +((detailViewPiece.rawStats as any).durability || 0) ? 'buffed' : 'debuffed'}`
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
                                        <div className={`card-cooldown ${detailViewPiece.skill.currentCooldown > 0 ? 'cooling' : 'ready'}`}>
                                            {detailViewPiece.skill.currentCooldown > 0
                                                ? `Cooldown: ${Math.ceil(detailViewPiece.skill.currentCooldown)} turns`
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
                            Status Effects ({(detailViewPiece as any).debuffs?.length || 0})
                        </div>
                        {(detailViewPiece as any).debuffs && (detailViewPiece as any).debuffs.length > 0 ? (
                            (detailViewPiece as any).debuffs.map((debuff: any, index: number) => {
                                const isAura = debuff.duration === -1;
                                const isTransformation = debuff.isTransformation === true;
                                const isBuff = debuff.effects?.some((e: any) => e.modifier > 0) || false;
                                const debuffClass = isTransformation ? 'transform-debuff' : (isAura ? 'aura-debuff' : (isBuff ? 'buff-debuff' : ''));

                                return (
                                    <div key={index} className={`debuff-card ${debuffClass}`}>
                                        <div className="debuff-card-header">
                                            <div className="debuff-icon">
                                                {getDebuffIcon(debuff, getIconConfig(debuff))}
                                                <div className="fallback-icon" style={{ display: debuff.casterName ? 'none' : 'block' }}>
                                                    {isTransformation ? '🔥' : isAura ? '✨' : isBuff ? '⬆' : '⬇'}
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

                    {/* Viktor Module Shop - Only show for owned Viktor */}
                    {detailViewPiece.name === "Viktor" &&
                        detailViewPiece.ownerId === currentPlayer?.userId &&
                        detailViewPiece.skill?.payload &&
                        viktorModules.length > 0 && (() => {
                            // Count purchased modules (modules are items with isViktorModule flag)
                            const purchasedModules = detailViewPiece.items?.filter(
                                item => viktorModules.some(m => m.id === item.id)
                            ) || [];
                            const moduleCount = purchasedModules.length;
                            const cumulativeDamage = detailViewPiece.skill.payload.cumulativeDamage || 0;
                            const currentModuleIndex = detailViewPiece.skill.payload.currentModuleIndex || 0;
                            const currentModule = viktorModules[currentModuleIndex % viktorModules.length];

                            // Calculate which modules are unlocked based on damage thresholds
                            const nextThreshold = VIKTOR_DAMAGE_THRESHOLDS[moduleCount] || 9999;
                            const isModuleUnlocked = cumulativeDamage >= nextThreshold;
                            const hasMaxItems = (detailViewPiece.items?.length || 0) >= 3;
                            const canPurchase = isMyTurn && !hasBoughtItemThisTurn && !hasPerformedActionThisTurn && isModuleUnlocked && !hasMaxItems;

                            return (
                                <div className="shop-section" style={{ borderColor: 'rgba(147, 51, 234, 0.5)' }}>
                                    <div className="section-header" style={{ color: '#9333ea' }}>
                                        <Zap size={16} />
                                        Viktor's Module Shop
                                    </div>

                                    {/* Damage progress */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--secondary-text)', marginBottom: '4px' }}>
                                            Siphon Power Damage: <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{cumulativeDamage}</span>
                                        </div>
                                        {moduleCount < 3 && (
                                            <div style={{
                                                height: '6px',
                                                background: 'rgba(147, 51, 234, 0.2)',
                                                borderRadius: '3px',
                                                overflow: 'hidden'
                                            }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        width: `${Math.min(100, (cumulativeDamage / nextThreshold) * 100)}%`,
                                                        background: 'linear-gradient(90deg, #9333ea, #a855f7)',
                                                        borderRadius: '3px',
                                                        transition: 'width 0.3s ease'
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div style={{ fontSize: '10px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                                            {moduleCount >= 3
                                                ? "Glorious Evolution Complete! +50% AP"
                                                : `Next module unlocks at ${nextThreshold} damage`}
                                        </div>
                                    </div>

                                    {/* Purchased modules */}
                                    {purchasedModules.length > 0 && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--secondary-text)', marginBottom: '6px' }}>
                                                Equipped Modules ({moduleCount}/3):
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {purchasedModules.map((item) => {
                                                    const module = viktorModules.find(m => m.id === item.id);
                                                    return module ? (
                                                        <div
                                                            key={item.id}
                                                            style={{
                                                                width: '36px',
                                                                height: '36px',
                                                                borderRadius: '4px',
                                                                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(88, 28, 135, 0.3))',
                                                                border: '1px solid #9333ea',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                position: 'relative',
                                                            }}
                                                            title={`${module.name}: ${module.description}`}
                                                        >
                                                            <img
                                                                src={module.icon}
                                                                alt={module.name}
                                                                style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            />
                                                            <div style={{
                                                                position: 'absolute',
                                                                bottom: '-2px',
                                                                right: '-2px',
                                                                width: '12px',
                                                                height: '12px',
                                                                background: '#22c55e',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}>
                                                                <Check size={8} color="white" />
                                                            </div>
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Current available module */}
                                    {!hasMaxItems && currentModule && (
                                        <div style={{
                                            background: isModuleUnlocked
                                                ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(88, 28, 135, 0.15))'
                                                : 'rgba(50, 50, 50, 0.3)',
                                            border: `1px solid ${isModuleUnlocked ? 'rgba(147, 51, 234, 0.5)' : 'rgba(100, 100, 100, 0.3)'}`,
                                            borderRadius: '8px',
                                            padding: '12px',
                                            opacity: isModuleUnlocked ? 1 : 0.6,
                                        }}>
                                            <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginBottom: '8px' }}>
                                                {isModuleUnlocked ? 'Available Module:' : 'Next Module (Locked):'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                                <div style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '8px',
                                                    background: isModuleUnlocked
                                                        ? 'linear-gradient(135deg, #9333ea, #581c87)'
                                                        : 'rgba(100, 100, 100, 0.3)',
                                                    border: `2px solid ${isModuleUnlocked ? '#a855f7' : 'rgba(100, 100, 100, 0.5)'}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <img
                                                        src={currentModule.icon}
                                                        alt={currentModule.name}
                                                        style={{ width: '36px', height: '36px', objectFit: 'contain', filter: isModuleUnlocked ? 'none' : 'grayscale(100%)' }}
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ color: isModuleUnlocked ? '#a855f7' : 'var(--secondary-text)', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                                                        {currentModule.name}
                                                    </div>
                                                    <div style={{ color: 'var(--secondary-text)', fontSize: '11px', lineHeight: '1.4' }}>
                                                        {currentModule.description}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (handleBuyItem && detailViewPiece.id && currentModule) {
                                                        handleBuyItem(currentModule.id, detailViewPiece.id);
                                                    }
                                                }}
                                                disabled={!canPurchase}
                                                style={{
                                                    marginTop: '12px',
                                                    width: '100%',
                                                    padding: '8px 16px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    background: canPurchase
                                                        ? 'linear-gradient(135deg, #9333ea, #581c87)'
                                                        : 'rgba(100, 100, 100, 0.3)',
                                                    color: canPurchase ? 'white' : 'var(--secondary-text)',
                                                    fontWeight: 'bold',
                                                    cursor: canPurchase ? 'pointer' : 'not-allowed',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                }}
                                            >
                                                <Zap size={14} />
                                                <span>{isModuleUnlocked ? 'Acquire Module' : `Unlock at ${nextThreshold} damage`}</span>
                                            </button>
                                            {!isMyTurn && (
                                                <div style={{ fontSize: '10px', color: 'var(--secondary-text)', textAlign: 'center', marginTop: '4px' }}>
                                                    Wait for your turn
                                                </div>
                                            )}
                                            {isMyTurn && hasPerformedActionThisTurn && (
                                                <div style={{ fontSize: '10px', color: '#ff9999', textAlign: 'center', marginTop: '4px' }}>
                                                    Cannot buy after performing an action
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {hasMaxItems && moduleCount < 3 && (
                                        <div style={{ fontSize: '11px', color: '#ff9999', textAlign: 'center', padding: '8px' }}>
                                            Viktor has maximum items (3). Remove an item to buy more modules.
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

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
                                    background: hasBoughtItemThisTurn
                                        ? 'rgba(200, 155, 60, 0.15)'
                                        : hasPerformedActionThisTurn
                                            ? 'rgba(200, 100, 100, 0.15)'
                                            : 'rgba(91, 192, 222, 0.15)',
                                    border: `1px solid ${hasBoughtItemThisTurn
                                        ? 'var(--gold)'
                                        : hasPerformedActionThisTurn
                                            ? '#c86464'
                                            : 'var(--hover)'
                                        }`,
                                    color: hasBoughtItemThisTurn
                                        ? 'var(--gold)'
                                        : hasPerformedActionThisTurn
                                            ? '#ff9999'
                                            : 'var(--hover)'
                                }}>
                                    {hasBoughtItemThisTurn ? (
                                        <>
                                            <ShoppingCart size={14} />
                                            <span>Item purchased (1/1) - Perform your action</span>
                                        </>
                                    ) : hasPerformedActionThisTurn ? (
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
                            ) : shopItemsData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-text)' }}>
                                    No items available
                                </div>
                            ) : (
                                <div className="shop-grid">
                                    {shopItemsData.map((item: ItemData) => (
                                        <div
                                            key={item.id}
                                            className="shop-item-container"
                                            onMouseEnter={(e) => {
                                                const tooltip = e.currentTarget.querySelector('.shop-item-tooltip') as HTMLElement;
                                                if (tooltip) {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const tooltipHeight = tooltip.offsetHeight || 150; // estimate if not rendered yet
                                                    const viewportHeight = window.innerHeight;

                                                    // Position tooltip to the right of the item
                                                    tooltip.style.left = `${rect.right + 10}px`;

                                                    // Check if tooltip would overflow bottom of viewport
                                                    if (rect.top + tooltipHeight > viewportHeight - 20) {
                                                        // Position from bottom instead
                                                        tooltip.style.top = 'auto';
                                                        tooltip.style.bottom = `${viewportHeight - rect.bottom}px`;
                                                    } else {
                                                        tooltip.style.top = `${rect.top}px`;
                                                        tooltip.style.bottom = 'auto';
                                                    }
                                                    tooltip.style.transform = 'translateY(0)';
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
                                                    <Coins size={12} /> {item.isBasic ? getCurrentItemPrice(currentPlayer) : item.cost} gold
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
    )
}