import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { User, Trophy, Target, TrendingUp, Calendar, Star } from 'lucide-react'
import { useAppSelector } from '../hooks/redux'

const ProfileContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px;
`

const ProfileHeader = styled(motion.div)`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  margin-bottom: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  
  .avatar {
    width: 120px;
    height: 120px;
    background: linear-gradient(135deg, var(--gold) 0%, var(--hover) 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 3rem;
    color: var(--primary-bg);
    box-shadow: 0 4px 16px rgba(200, 155, 60, 0.3);
  }
  
  h1 {
    color: var(--primary-text);
    margin-bottom: 10px;
    font-size: 2.5rem;
  }
  
  .join-date {
    color: var(--secondary-text);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
`

const StatCard = styled(motion.div)`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  
  .icon {
    color: var(--gold);
    margin-bottom: 12px;
  }
  
  .value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-text);
    margin-bottom: 8px;
  }
  
  .label {
    color: var(--secondary-text);
    text-transform: uppercase;
    font-size: 14px;
    font-weight: 500;
  }
  
  &.rating {
    border-left: 4px solid var(--gold);
    
    .value {
      color: var(--gold);
    }
  }
  
  &.wins {
    border-left: 4px solid #27ae60;
    
    .value {
      color: #27ae60;
    }
  }
  
  &.losses {
    border-left: 4px solid #e74c3c;
    
    .value {
      color: #e74c3c;
    }
  }
  
  &.winrate {
    border-left: 4px solid var(--hover);
    
    .value {
      color: var(--hover);
    }
  }
`

const RankSection = styled(motion.div)`
  background: var(--secondary-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  
  h2 {
    color: var(--gold);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  
  .rank-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 20px;
    
    .rank-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: var(--primary-bg);
      box-shadow: 0 4px 12px rgba(200, 155, 60, 0.3);
    }
    
    .rank-info {
      text-align: left;
      
      .rank-name {
        font-size: 1.5rem;
        color: var(--primary-text);
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      .rank-description {
        color: var(--secondary-text);
        font-size: 14px;
      }
    }
  }
  
  .progress-bar {
    width: 100%;
    height: 8px;
    background: var(--primary-bg);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--gold) 0%, var(--hover) 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
  }
  
  .progress-text {
    color: var(--secondary-text);
    font-size: 14px;
  }
`

const ProfilePage: React.FC = () => {
    const { user } = useAppSelector(state => state.auth)

    if (!user) return null

    const winRate = user.wins + user.losses > 0 ? ((user.wins / (user.wins + user.losses)) * 100) : 0
    const nextRankRating = Math.ceil((user.rating + 100) / 100) * 100
    const progressToNextRank = ((user.rating % 100) / 100) * 100

    const getRankName = (rating: number) => {
        if (rating < 800) return 'Bronze'
        if (rating < 1200) return 'Silver'
        if (rating < 1600) return 'Gold'
        if (rating < 2000) return 'Platinum'
        if (rating < 2400) return 'Diamond'
        return 'Master'
    }

    return (
        <ProfileContainer>
            <ProfileHeader
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="avatar">
                    <User size={64} />
                </div>
                <h1>{user.username}</h1>
                <div className="join-date">
                    <Calendar size={16} />
                    Summoner since {new Date().getFullYear()}
                </div>
            </ProfileHeader>

            <StatsGrid>
                <StatCard
                    className="rating"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    whileHover={{ scale: 1.02 }}
                >
                    <Trophy className="icon" size={32} />
                    <div className="value">{user.rating}</div>
                    <div className="label">Rating</div>
                </StatCard>

                <StatCard
                    className="wins"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    whileHover={{ scale: 1.02 }}
                >
                    <Target className="icon" size={32} />
                    <div className="value">{user.wins}</div>
                    <div className="label">Wins</div>
                </StatCard>

                <StatCard
                    className="losses"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                >
                    <Target className="icon" size={32} />
                    <div className="value">{user.losses}</div>
                    <div className="label">Losses</div>
                </StatCard>

                <StatCard
                    className="winrate"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                >
                    <TrendingUp className="icon" size={32} />
                    <div className="value">{winRate.toFixed(1)}%</div>
                    <div className="label">Win Rate</div>
                </StatCard>
            </StatsGrid>

            <RankSection
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
            >
                <h2>
                    <Star size={24} />
                    Current Rank
                </h2>
                <div className="rank-display">
                    <div className="rank-icon">
                        <Trophy />
                    </div>
                    <div className="rank-info">
                        <div className="rank-name">{getRankName(user.rating)}</div>
                        <div className="rank-description">
                            Keep climbing the ladder to reach higher ranks!
                        </div>
                    </div>
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progressToNextRank}%` }}
                    />
                </div>
                <div className="progress-text">
                    {user.rating} / {nextRankRating} ({(100 - progressToNextRank).toFixed(0)} rating to next rank)
                </div>
            </RankSection>
        </ProfileContainer>
    )
}

export default ProfilePage
