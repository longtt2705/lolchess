import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Search, X, Users, Clock, Zap, AlertCircle, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAppSelector } from '../hooks/redux'
import { useQueue } from '../hooks/useQueue'

const LobbyContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
`

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 40px;
  
  h1 {
    color: var(--gold);
    font-size: 2.5rem;
    margin-bottom: 10px;
  }
  
  p {
    color: var(--secondary-text);
    font-size: 1.1rem;
  }
`

const QueueSection = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
`

const FindMatchCard = styled(motion.div)`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 100%;
  
  .find-match-icon {
    color: var(--gold);
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
  }
  
  h2 {
    color: var(--primary-text);
    margin-bottom: 12px;
    font-size: 1.8rem;
  }
  
  p {
    color: var(--secondary-text);
    margin-bottom: 24px;
    font-size: 1.1rem;
  }
`

const FindMatchButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
  color: var(--primary-bg);
  border: none;
  padding: 16px 32px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 auto 20px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(200, 155, 60, 0.4);
  }
`

const QueueInfo = styled.div`
  color: var(--secondary-text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
`

const QueueStatusCard = styled(motion.div)`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 100%;
  
  .queue-icon {
    color: var(--hover);
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
  }
  
  h3 {
    color: var(--primary-text);
    margin-bottom: 16px;
    font-size: 1.5rem;
  }
  
  .queue-info {
    margin-bottom: 20px;
    
    p {
      color: var(--secondary-text);
      margin-bottom: 8px;
      
      .position, .queue-size {
        color: var(--gold);
        font-weight: bold;
      }
    }
  }
`

const LoadingBar = styled.div`
  width: 100%;
  height: 4px;
  background: var(--primary-bg);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 20px;
  
  .loading-fill {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, var(--gold), var(--hover));
    animation: loading 2s ease-in-out infinite alternate;
  }
  
  @keyframes loading {
    0% { width: 20%; }
    100% { width: 80%; }
  }
`

const CancelButton = styled(motion.button)`
  background: transparent;
  color: var(--red);
  border: 2px solid var(--red);
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--red);
    color: var(--primary-bg);
    transform: translateY(-1px);
  }
`

const MatchFoundCard = styled(motion.div)`
  background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--accent-bg) 100%);
  border: 2px solid var(--gold);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 6px 24px rgba(200, 155, 60, 0.3);
  max-width: 500px;
  width: 100%;
  
  .match-found-icon {
    color: var(--gold);
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  h2 {
    color: var(--gold);
    margin-bottom: 16px;
    font-size: 2rem;
  }
  
  p {
    color: var(--primary-text);
    margin-bottom: 8px;
    font-size: 1.2rem;
    
    .opponent-name {
      color: var(--hover);
      font-weight: bold;
    }
  }
  
  .entering-game {
    color: var(--secondary-text);
    font-style: italic;
    animation: fadeInOut 1s ease-in-out infinite alternate;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  
  @keyframes fadeInOut {
    0% { opacity: 0.6; }
    100% { opacity: 1; }
  }
`

const StatsSection = styled.div`
  display: flex;
  justify-content: center;
`

const StatCard = styled.div`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  min-width: 250px;
  
  h4 {
    color: var(--gold);
    margin-bottom: 16px;
    text-align: center;
    font-size: 1.2rem;
  }
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    color: var(--primary-text);
    
    .stat-value {
      color: var(--gold);
      font-weight: bold;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
  }
`

const ActiveGameAlert = styled(motion.div)`
  background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--accent-bg) 100%);
  border: 2px solid var(--hover);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 6px 24px rgba(91, 192, 222, 0.3);
  max-width: 500px;
  width: 100%;
  margin-bottom: 20px;
  
  .alert-icon {
    color: var(--hover);
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
  }
  
  h3 {
    color: var(--hover);
    margin-bottom: 12px;
    font-size: 1.5rem;
  }
  
  p {
    color: var(--primary-text);
    margin-bottom: 20px;
    font-size: 1rem;
  }
`

const ReturnToGameButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--hover) 0%, #0596aa 100%);
  color: var(--primary-bg);
  border: none;
  padding: 14px 28px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 auto;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(91, 192, 222, 0.4);
  }
`

const GameLobbyPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector(state => state.auth)
  const { activeGame } = useAppSelector(state => state.game)
  const { queue, joinQueue, cancelQueue, getQueueStatus, isConnected } = useQueue()

  useEffect(() => {
    // Get initial queue status when component mounts
    if (isConnected) {
      getQueueStatus()
    }
  }, [isConnected, getQueueStatus])

  const handleFindMatch = () => {
    if (!user) {
      toast.error('Please log in to find a match')
      return
    }

    if (!isConnected) {
      toast.error('Connecting to server...')
      return
    }

    if (activeGame) {
      toast.error('You are already in an active game!')
      return
    }

    if (queue.inQueue) {
      cancelQueue()
    } else {
      joinQueue()
    }
  }

  const handleReturnToGame = () => {
    if (!activeGame) return

    const gameId = activeGame.id || (activeGame as any)._id

    // Navigate based on game status/phase
    if (activeGame.status === 'ban_pick' || activeGame.phase === 'ban_phase' || activeGame.phase === 'pick_phase') {
      navigate(`/ban-pick/${gameId}`)
    } else {
      navigate(`/game/${gameId}`)
    }
  }

  return (
    <LobbyContainer>
      <Header>
        <div>
          <h1>1v1 Matchmaking</h1>
          <p>Find an opponent for intense 1v1 battles</p>
        </div>
      </Header>

      <QueueSection>
        {activeGame && !queue.matchFound ? (
          <ActiveGameAlert
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="alert-icon">
              <AlertCircle size={40} />
            </div>
            <h3>Active Game Found</h3>
            <p>You have an ongoing game. Return to continue playing!</p>
            <ReturnToGameButton onClick={handleReturnToGame}>
              <ArrowRight size={20} />
              Return to Game
            </ReturnToGameButton>
          </ActiveGameAlert>
        ) : queue.matchFound ? (
          <MatchFoundCard
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="match-found-icon">
              <Zap size={48} />
            </div>
            <h2>Match Found!</h2>
            <p>Opponent: <span className="opponent-name">{queue.opponent?.username}</span></p>
            <p className="entering-game">Entering game...</p>
          </MatchFoundCard>
        ) : queue.inQueue ? (
          <QueueStatusCard
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="queue-icon">
              <Clock size={32} />
            </div>
            <h3>Searching for Match</h3>
            <div className="queue-info">
              {queue.position && (
                <p>Position in queue: <span className="position">{queue.position}</span></p>
              )}
              <p>Players in queue: <span className="queue-size">{queue.queueSize}</span></p>
            </div>
            <LoadingBar>
              <div className="loading-fill" />
            </LoadingBar>
            <CancelButton onClick={handleFindMatch}>
              <X size={16} />
              Cancel Search
            </CancelButton>
          </QueueStatusCard>
        ) : (
          <FindMatchCard
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="find-match-icon">
              <Search size={48} />
            </div>
            <h2>Ready to Battle?</h2>
            <p>Click below to find an opponent for a 1v1 match</p>
            <FindMatchButton
              onClick={handleFindMatch}
              style={{
                opacity: activeGame ? 0.5 : 1,
                cursor: activeGame ? 'not-allowed' : 'pointer'
              }}
              disabled={!!activeGame}
            >
              <Search size={20} />
              {activeGame ? 'Already in Game' : 'Find Match'}
            </FindMatchButton>
            {queue.queueSize > 0 && (
              <QueueInfo>
                <Users size={16} />
                {queue.queueSize} player{queue.queueSize === 1 ? '' : 's'} looking for matches
              </QueueInfo>
            )}
          </FindMatchCard>
        )}
      </QueueSection>

      <StatsSection>
        <StatCard>
          <h4>Your Stats</h4>
          <div className="stat-item">
            <span>Rating:</span>
            <span className="stat-value">{user?.rating || 1000}</span>
          </div>
          <div className="stat-item">
            <span>Wins:</span>
            <span className="stat-value">{user?.wins || 0}</span>
          </div>
          <div className="stat-item">
            <span>Losses:</span>
            <span className="stat-value">{user?.losses || 0}</span>
          </div>
        </StatCard>
      </StatsSection>
    </LobbyContainer>
  )
}

export default GameLobbyPage
