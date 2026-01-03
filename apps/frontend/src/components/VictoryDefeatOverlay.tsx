import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import styled from 'styled-components';
import { GameState } from '../hooks/useGame';

const VictoryOverlay = styled(motion.div)<{ isVictory: boolean }>`
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

const VictoryTitle = styled(motion.h1)<{ isVictory: boolean }>`
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
        filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
      }
      50% {
        transform: scale(1.05);
        filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.8));
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
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  backdrop-filter: blur(5px);
  
  &:hover {
    background: rgba(0, 0, 0, 0.7);
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
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

interface VictoryDefeatOverlayProps {
  gameState: GameState | null;
  currentUserId?: string;
  onReturnToLobby: () => void;
}

export const VictoryDefeatOverlay: React.FC<VictoryDefeatOverlayProps> = ({
  gameState,
  currentUserId,
  onReturnToLobby,
}) => {
  if (!gameState) return null;

  // Check if game is finished
  const isGameFinished = gameState.status === 'finished';
  const isVictory = isGameFinished && gameState.winner && (
    (gameState.winner === 'blue' && currentUserId === gameState.bluePlayer) ||
    (gameState.winner === 'red' && currentUserId === gameState.redPlayer)
  );
  const isDraw = isGameFinished && !gameState.winner;

  if (!isGameFinished) return null;

  return (
    <AnimatePresence>
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
              rotate: 360,
              opacity: 0
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
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
              <span className="stat-value">{gameState.players.find(p => p.userId === currentUserId)?.gold || 0}</span>
            </StatItem>
            <StatItem>
              <span className="stat-label">Pieces Left</span>
              <span className="stat-value">
                {gameState.board.filter(p => p.ownerId === currentUserId && p.stats.hp > 0).length}
              </span>
            </StatItem>
          </VictoryStats>

          <VictoryButton
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReturnToLobby}
          >
            Return to Lobby
          </VictoryButton>
        </VictoryContent>
      </VictoryOverlay>
    </AnimatePresence>
  );
};
