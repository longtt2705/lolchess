import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Play, Users, Trophy, Sword, AlertCircle, ArrowRight, BookOpen } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { fetchActiveGame } from '../store/gameSlice'

const HomeContainer = styled.div`
  min-height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
`

const HeroSection = styled(motion.div)`
  margin-bottom: 60px;
  
  h1 {
    font-size: 4rem;
    background: linear-gradient(135deg, var(--gold) 0%, var(--hover) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 20px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  p {
    font-size: 1.5rem;
    color: var(--secondary-text);
    max-width: 600px;
    line-height: 1.6;
  }
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  max-width: 1000px;
  width: 100%;
  margin-bottom: 50px;
`

const FeatureCard = styled(motion.div)`
  background: var(--secondary-bg);
  padding: 30px;
  border-radius: 12px;
  border: 1px solid var(--border);
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  
  .icon {
    color: var(--gold);
    margin-bottom: 20px;
  }
  
  h3 {
    color: var(--primary-text);
    margin-bottom: 15px;
    font-size: 1.3rem;
  }
  
  p {
    color: var(--secondary-text);
    line-height: 1.5;
  }
`

const CTASection = styled(motion.div)`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
`

const PrimaryButton = styled(Link)`
  background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
  color: var(--primary-bg);
  padding: 16px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(200, 155, 60, 0.3);
  }
`

const SecondaryButton = styled(Link)`
  background: transparent;
  color: var(--primary-text);
  padding: 16px 32px;
  border: 2px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--gold);
    box-shadow: 0 0 12px rgba(200, 155, 60, 0.2);
    transform: translateY(-2px);
  }
`

const ActiveGameBanner = styled(motion.div)`
  background: linear-gradient(135deg, var(--hover) 0%, #0596aa 100%);
  border: 2px solid var(--hover);
  border-radius: 12px;
  padding: 20px 32px;
  margin-bottom: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: 0 6px 24px rgba(91, 192, 222, 0.3);
  max-width: 800px;
  width: 100%;
  
  .alert-content {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .alert-icon {
      color: var(--primary-bg);
    }
    
    .alert-text {
      h4 {
        color: var(--primary-bg);
        font-size: 1.3rem;
        margin-bottom: 4px;
      }
      
      p {
        color: rgba(10, 14, 39, 0.8);
        font-size: 0.95rem;
      }
    }
  }
`

const ActiveGameButton = styled(motion.button)`
  background: var(--primary-bg);
  color: var(--hover);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(10, 14, 39, 0.3);
  }
`

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated, user } = useAppSelector(state => state.auth)
  const { activeGame } = useAppSelector(state => state.game)

  useEffect(() => {
    if (user && isAuthenticated) {
      dispatch(fetchActiveGame(user.id))
    }
  }, [user, isAuthenticated, dispatch])

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

  const features = [
    {
      icon: <Sword size={48} />,
      title: "Strategic Battles",
      description: "Experience the thrill of auto-chess with League of Legends champions. Build your team and watch them fight!"
    },
    {
      icon: <Users size={48} />,
      title: "1v1 Battles",
      description: "Face off against another player in intense head-to-head matches. Prove your strategic mastery in direct combat!"
    },
    {
      icon: <Trophy size={48} />,
      title: "Ranked System",
      description: "Earn your place on the leaderboard with our comprehensive ranking system. Track your progress and achievements!"
    },
    {
      icon: <BookOpen size={48} />,
      title: "Learn the Rules",
      description: "New to LOL Chess? Check out our comprehensive rulebook to master the game mechanics and strategies!"
    }
  ]

  return (
    <HomeContainer>
      <HeroSection
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>Welcome to LOL Chess</h1>
        <p>
          The ultimate 1v1 League of Legends auto-chess experience. Build your team,
          strategize your positioning, and defeat your opponent in epic battles!
        </p>
      </HeroSection>

      {activeGame && isAuthenticated && (
        <ActiveGameBanner
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="alert-content">
            <div className="alert-icon">
              <AlertCircle size={32} />
            </div>
            <div className="alert-text">
              <h4>Active Game in Progress</h4>
              <p>You have an ongoing match. Click to return!</p>
            </div>
          </div>
          <ActiveGameButton onClick={handleReturnToGame}>
            Return to Game
            <ArrowRight size={18} />
          </ActiveGameButton>
        </ActiveGameBanner>
      )}

      <FeatureGrid>
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            as={feature.title === "Learn the Rules" ? Link : "div"}
            to={feature.title === "Learn the Rules" ? "/instructions" : undefined}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: index * 0.2 }}
            whileHover={{ scale: 1.05 }}
            style={{ textDecoration: 'none', cursor: feature.title === "Learn the Rules" ? 'pointer' : 'default' }}
          >
            <div className="icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </FeatureCard>
        ))}
      </FeatureGrid>

      <CTASection
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        {isAuthenticated ? (
          <PrimaryButton to="/lobby">
            <Play size={20} />
            Enter 1v1 Lobby
          </PrimaryButton>
        ) : (
          <>
            <PrimaryButton to="/register">
              <Users size={20} />
              Join the Battle
            </PrimaryButton>
            <SecondaryButton to="/login">
              <Play size={20} />
              Login to Play
            </SecondaryButton>
          </>
        )}
      </CTASection>
    </HomeContainer>
  )
}

export default HomePage
