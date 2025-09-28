import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Sword, Shield, Star, X, SkipForward } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAppSelector } from '../hooks/redux'
import { useBanPick } from '../hooks/useBanPick'
import { useChampions, ChampionData } from '../hooks/useChampions'

const BanPickContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  background: var(--secondary-bg);
  border-bottom: 2px solid var(--border);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const GameInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  
  h2 {
    color: var(--gold);
    margin: 0;
  }
  
  .phase {
    background: var(--accent-bg);
    padding: 8px 16px;
    border-radius: 6px;
    color: var(--primary-text);
    font-weight: bold;
    text-transform: uppercase;
  }
`

const Timer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--accent-bg);
  padding: 12px 20px;
  border-radius: 8px;
  border: 2px solid var(--border);
  
  .time {
    font-size: 24px;
    font-weight: bold;
    color: var(--gold);
    min-width: 60px;
    text-align: center;
  }
  
  &.urgent {
    border-color: var(--red);
    background: rgba(200, 155, 60, 0.1);
    
    .time {
      color: var(--red);
    }
  }
`

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`

const BannedChampionsSection = styled.div`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  
  h3 {
    color: var(--gold);
    margin: 0 0 16px 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
`

const BannedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
`

const BannedChampionSlot = styled.div<{ banned?: boolean; skipped?: boolean }>`
  aspect-ratio: 1;
  background: var(--accent-bg);
  border: 2px solid var(--border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 40px;
  
  ${props => props.banned && !props.skipped && `
    background: var(--red);
    
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      width: 3px;
      height: 80%;
      background: white;
      border-radius: 2px;
    }
    
    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      width: 3px;
      height: 80%;
      background: white;
      border-radius: 2px;
    }
  `}
  
  ${props => props.skipped && `
    background: var(--secondary-text);
    border-color: var(--secondary-text);
    opacity: 0.7;
  `}
`

const PlayerSections = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 20px;
  align-items: start;
`

const SkipBanButton = styled(motion.button)`
  background: var(--accent-bg);
  border: 2px solid var(--border);
  color: var(--primary-text);
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: bold;
  margin-top: 16px;
  width: 100%;
  justify-content: center;
  
  &:hover {
    border-color: var(--gold);
    background: var(--gold);
    color: var(--primary-bg);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    
    &:hover {
      border-color: var(--border);
      background: var(--accent-bg);
      color: var(--primary-text);
    }
  }
`

const SidePanel = styled.div<{ isActive?: boolean }>`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.3s ease;
  position: relative;
  
  h3 {
    color: var(--gold);
    margin: 0 0 12px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  &.blue {
    border-left: 4px solid #0596aa;
  }
  
  &.red {
    border-left: 4px solid #c8aa6e;
  }
  
  ${props => props.isActive && `
    border-color: var(--gold);
    box-shadow: 0 0 20px rgba(200, 155, 60, 0.4);
    background: rgba(200, 155, 60, 0.05);
    
    &::before {
      content: "";
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(45deg, var(--gold), var(--blue), var(--gold));
      border-radius: 10px;
      z-index: -1;
      animation: rotate 3s linear infinite;
    }
    
    @keyframes rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}
`

const ChampionGrid = styled.div`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  
  h3 {
    color: var(--gold);
    margin: 0 0 20px 0;
    text-align: center;
  }
`

const ChampionList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
`

const ChampionCard = styled(motion.div) <{
  banned?: boolean;
  picked?: boolean;
  clickable?: boolean;
  role: string;
}>`
  aspect-ratio: 1;
  background: var(--accent-bg);
  border: 2px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  
  .name {
    font-size: 12px;
    font-weight: bold;
    text-align: center;
    color: var(--primary-text);
    margin-bottom: 4px;
  }
  
  .role {
    font-size: 10px;
    color: var(--secondary-text);
    text-transform: uppercase;
  }
  
  .role-icon {
    margin-bottom: 8px;
    opacity: 0.7;
  }
  
  ${props => props.clickable && `
    &:hover {
      transform: translateY(-2px);
      border-color: var(--gold);
      box-shadow: 0 4px 12px rgba(200, 155, 60, 0.3);
    }
  `}
  
  ${props => props.banned && `
    opacity: 0.3;
    background: var(--red);
    pointer-events: none;
    
    &::after {
      content: "BANNED";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      background: var(--red);
      color: white;
      padding: 4px 12px;
      font-size: 10px;
      font-weight: bold;
      border-radius: 4px;
    }
  `}
  
  ${props => props.picked && `
    opacity: 0.7;
    background: var(--green);
    pointer-events: none;
    
    &::after {
      content: "PICKED";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--green);
      color: white;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: bold;
      border-radius: 4px;
    }
  `}
`

const BanPickList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const BanPickSlot = styled.div<{ filled?: boolean; active?: boolean }>`
  height: 56px;
  width: 100%;
  min-width: 56px;
  background: ${props => props.filled ? 'var(--accent-bg)' : 'var(--primary-bg)'};
  border: 2px solid ${props => props.active ? 'var(--gold)' : 'var(--border)'};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s ease;
  padding: 8px;
  
  ${props => props.active && `
    box-shadow: 0 0 12px rgba(200, 155, 60, 0.5);
    animation: pulse 2s infinite;
  `}
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .champion-name {
    font-size: 12px;
    font-weight: bold;
    color: var(--primary-text);
  }
  
  .champion-icon {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
  }
  
  .empty-text {
    font-size: 11px;
    color: var(--secondary-text);
    text-transform: uppercase;
  }
`

const TurnIndicator = styled(motion.div) <{ isMyTurn: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${props => props.isMyTurn ? 'var(--gold)' : 'var(--secondary-text)'};
  color: var(--primary-bg);
  padding: 20px 40px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
`

const BanPickPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { user } = useAppSelector(state => state.auth)
  const [timeLeft, setTimeLeft] = useState(30)
  const [showTurnIndicator, setShowTurnIndicator] = useState(false)

  // Get champion data
  const { champions, loading: championsLoading, error: championsError } = useChampions()

  // Use the actual ban/pick hook
  const {
    isConnected,
    gameData,
    banPickState,
    playerSide,
    isMyTurn,
    currentAction,
    banChampion,
    pickChampion,
    skipBan,
  } = useBanPick(gameId || '')

  const currentPhase = banPickState?.phase === 'ban' ? 'Ban Phase' :
    banPickState?.phase === 'pick' ? 'Pick Phase' :
      'Loading...'

  useEffect(() => {
    if (!gameId || !user) {
      navigate('/lobby')
      return
    }

    // Initialize ban/pick connection
    // This will be implemented with the useBanPick hook
  }, [gameId, user, navigate])

  useEffect(() => {
    if (!banPickState) return

    // Timer countdown
    const interval = setInterval(() => {
      const elapsed = (Date.now() - banPickState.turnStartTime) / 1000
      const remaining = Math.max(0, banPickState.turnTimeLimit - elapsed)
      setTimeLeft(Math.floor(remaining))

      if (remaining <= 0 && isMyTurn) {
        toast.error('Time expired! Auto-banning/picking...')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [banPickState?.turnStartTime, banPickState?.turnTimeLimit, isMyTurn])

  useEffect(() => {
    if (!banPickState) return

    // Show turn indicator briefly when turn changes
    setShowTurnIndicator(true)
    const timer = setTimeout(() => setShowTurnIndicator(false), 2000)
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Fighter': return <Sword size={20} className="role-icon" />
      case 'Tank': return <Shield size={20} className="role-icon" />
      case 'Mage': return <Star size={20} className="role-icon" />
      case 'Assassin': return <Sword size={20} className="role-icon" />
      case 'Marksman': return <Star size={20} className="role-icon" />
      case 'Support': return <Shield size={20} className="role-icon" />
      default: return <Star size={20} className="role-icon" />
    }
  }

  if (championsLoading) {
    return (
      <BanPickContainer>
        <Header>
          <GameInfo>
            <h2>Champion Select</h2>
            <div className="phase">Loading...</div>
          </GameInfo>
          <Timer>
            <Clock size={20} />
            <div className="time">--s</div>
          </Timer>
        </Header>
        <MainContent>
          <div style={{ textAlign: 'center', color: 'var(--primary-text)' }}>
            Loading champions...
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
          <Timer>
            <Clock size={20} />
            <div className="time">--s</div>
          </Timer>
        </Header>
        <MainContent>
          <div style={{ textAlign: 'center', color: 'var(--red)' }}>
            Error loading champions: {championsError}
          </div>
        </MainContent>
      </BanPickContainer>
    )
  }

  return (
    <BanPickContainer>
      <Header>
        <GameInfo>
          <h2>Champion Select</h2>
          <div className="phase">{currentPhase}</div>
        </GameInfo>

        <Timer className={timeLeft <= 10 ? 'urgent' : ''}>
          <Clock size={20} />
          <div className="time">{timeLeft}s</div>
        </Timer>
      </Header>

      <MainContent>
        {/* Banned Champions Section */}
        <BannedChampionsSection>
          <h3>
            <X size={18} />
            Banned Champions
          </h3>
          <BannedGrid>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => {
              const banHistoryItem = banPickState?.banHistory?.[index]
              const isSkipped = banHistoryItem === 'SKIPPED'
              const isBanned = !!(banHistoryItem && !isSkipped)

              return (
                <BannedChampionSlot
                  key={`banned-${index}`}
                  banned={isBanned}
                  skipped={isSkipped}
                >
                  {isSkipped ? '❌' : isBanned ? <img src={`/icons/${banHistoryItem.toLowerCase()}.webp`} alt={banHistoryItem} className="champion-image" width={40} height={40} /> : ''}
                </BannedChampionSlot>
              )
            })}
          </BannedGrid>
        </BannedChampionsSection>

        <PlayerSections>
          {/* Blue Side Panel */}
          <SidePanel className="blue" isActive={banPickState?.currentTurn === 'blue'}>
            <h3>
              <Shield size={18} />
              Blue Side {banPickState?.currentTurn === 'blue' && '⚡'}
            </h3>

            <div>
              <h4>Picks</h4>
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
                      />
                    ) : (
                      <div className="empty-text">Pick {index + 1}</div>
                    )}
                  </BanPickSlot>
                ))}
              </BanPickList>
            </div>

            {/* Skip Ban Button - only show during ban phase for current player */}
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

          {/* Champion Grid */}
          <ChampionGrid>
            <h3>Select Champions</h3>
            <ChampionList>
              {champions.map(champion => (
                <ChampionCard
                  key={champion.name}
                  role="default"
                  banned={banPickState?.bannedChampions.includes(champion.name) || false}
                  picked={(banPickState?.bluePicks.includes(champion.name) || banPickState?.redPicks.includes(champion.name)) || false}
                  clickable={!!(isMyTurn && banPickState && !banPickState.bannedChampions.includes(champion.name) && !banPickState.bluePicks.includes(champion.name) && !banPickState.redPicks.includes(champion.name))}
                  onClick={() => handleChampionClick(champion.name)}
                  whileHover={isMyTurn ? { scale: 1.05 } : {}}
                  whileTap={isMyTurn ? { scale: 0.95 } : {}}
                >
                  <img src={`/icons/${champion.name.toLowerCase()}.webp`} alt={champion.name} className="champion-image" width={40} height={40} />
                  <div className="name">{champion.name}</div>
                  <div className="role" style={{ fontSize: '10px', opacity: 0.7 }}>
                    HP: {champion.stats.maxHp} | AD: {champion.stats.ad}
                  </div>
                </ChampionCard>
              ))}
            </ChampionList>
          </ChampionGrid>

          {/* Red Side Panel */}
          <SidePanel className="red" isActive={banPickState?.currentTurn === 'red'}>
            <h3>
              <Sword size={18} />
              Red Side {banPickState?.currentTurn === 'red' && '⚡'}
            </h3>

            <div>
              <h4>Picks</h4>
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
                      />
                    ) : (
                      <div className="empty-text">Pick {index + 1}</div>
                    )}
                  </BanPickSlot>
                ))}
              </BanPickList>
            </div>

            {/* Skip Ban Button - only show during ban phase for current player */}
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
        </PlayerSections>
      </MainContent>

      {/* Turn Indicator */}
      <AnimatePresence>
        {showTurnIndicator && (
          <TurnIndicator
            isMyTurn={isMyTurn}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            {isMyTurn ? 'Your Turn!' : "Opponent's Turn"}
          </TurnIndicator>
        )}
      </AnimatePresence>
    </BanPickContainer>
  )
}

export default BanPickPage
