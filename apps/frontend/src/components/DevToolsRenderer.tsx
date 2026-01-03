import { RotateCcw, Shield, Zap } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useChampions } from '../hooks/useChampions';
import { resetGameplay, restoreCooldown, restoreHp } from '../store/gameSlice';
import { GameState } from '../hooks/useGame';
import { ChampionSelectionModal } from './ChampionSelectionModal';

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

interface DevToolsRendererProps {
    gameId: string;
    gameState: GameState | null;
    onResetComplete?: () => void;
}

export const DevToolsRenderer: React.FC<DevToolsRendererProps> = ({
    gameId,
    gameState,
    onResetComplete,
}) => {
    const dispatch = useAppDispatch();
    const isResetting = useAppSelector((state) => state.game.loading);
    const { champions: availableChampions } = useChampions();
    const [showResetModal, setShowResetModal] = useState(false);

    // Reset gameplay (dev tools)
    const handleResetGameplay = useCallback(() => {
        if (!gameId || isResetting) return;
        setShowResetModal(true);
    }, [gameId, isResetting]);

    // Handle reset with selected champions
    const handleResetWithChampions = useCallback(async (blueChampions: string[], redChampions: string[]) => {
        if (!gameId || isResetting) return;

        try {
            // Close modal first
            setShowResetModal(false);

            // Dispatch the reset gameplay thunk with champion arrays
            const result = await dispatch(resetGameplay({ gameId, blueChampions, redChampions }));

            if (resetGameplay.fulfilled.match(result)) {
                // Success - notify parent to clear animation state
                onResetComplete?.();
            } else {
                // Error handled by Redux, but we can show additional feedback
                console.error('Failed to reset gameplay:', result.error?.message);
            }
        } catch (error) {
            console.error('Error resetting gameplay:', error);
        }
    }, [gameId, isResetting, dispatch, onResetComplete]);

    // Restore HP (dev tools)
    const handleRestoreHp = useCallback(async () => {
        if (!gameId || isResetting) return;

        try {
            const result = await dispatch(restoreHp(gameId));

            if (!restoreHp.fulfilled.match(result)) {
                console.error('Failed to restore HP:', result.error?.message);
            }
        } catch (error) {
            console.error('Error restoring HP:', error);
        }
    }, [gameId, isResetting, dispatch]);

    // Restore Cooldown (dev tools)
    const handleRestoreCooldown = useCallback(async () => {
        if (!gameId || isResetting) return;

        try {
            const result = await dispatch(restoreCooldown(gameId));

            if (!restoreCooldown.fulfilled.match(result)) {
                console.error('Failed to restore cooldowns:', result.error?.message);
            }
        } catch (error) {
            console.error('Error restoring cooldowns:', error);
        }
    }, [gameId, isResetting, dispatch]);

    // Only show in development environment
    if (!import.meta.env.DEV) {
        return null;
    }

    return (
        <>
            <DevToolsPanel>
                <h4>🔧 Dev Tools</h4>
                <button
                    className="dev-button"
                    onClick={handleResetGameplay}
                    disabled={isResetting || !gameState}
                    title={`Reset the game to initial state\n\nCurrent Blue Squad:\n${gameState?.players?.find((p: any) => p.side === 'blue')?.selectedChampions?.join(', ') || 'N/A'}\n\nCurrent Red Squad:\n${gameState?.players?.find((p: any) => p.side === 'red')?.selectedChampions?.join(', ') || 'N/A'}`}
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

            {/* Champion Selection Modal */}
            <ChampionSelectionModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={handleResetWithChampions}
                currentBlueChampions={
                    gameState?.players?.find((p: any) => p.side === 'blue')?.selectedChampions ||
                    ['Garen', 'Garen', 'Garen', 'Garen', 'Garen']
                }
                currentRedChampions={
                    gameState?.players?.find((p: any) => p.side === 'red')?.selectedChampions ||
                    ['Aatrox', 'Aatrox', 'Aatrox', 'Aatrox', 'Aatrox']
                }
                availableChampions={availableChampions.map((c) => c.name)}
                isResetting={isResetting}
            />
        </>
    );
};
