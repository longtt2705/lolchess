import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GameLobbyPage from './pages/GameLobbyPage'
import BanPickPage from './pages/BanPickPage'
import GamePage from './pages/GamePage'
import ProfilePage from './pages/ProfilePage'
import InstructionsPage from './pages/InstructionsPage'
import DatabasePage from './pages/DatabasePage'
import { useAuthInit } from './hooks/useAuthInit'

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`

const MainContent = styled.main<{ isGamePage?: boolean }>`
  flex: 1;
  padding: ${props => props.isGamePage ? '0' : '20px'};
  overflow: ${props => props.isGamePage ? 'hidden' : 'auto'};
`

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);
  color: var(--primary-text);
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 3px solid var(--border);
    border-top: 3px solid var(--gold);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  h2 {
    color: var(--gold);
    margin-bottom: 10px;
  }
  
  p {
    color: var(--secondary-text);
  }
`

function App() {
  const { isInitialized, loading } = useAuthInit()
  const location = useLocation()

  // Check if current route is a game page or ban-pick page
  const isGamePage = location.pathname.startsWith('/game/')
  const isBanPickPage = location.pathname.startsWith('/ban-pick/')
  const hideHeader = isGamePage || isBanPickPage

  // Show loading screen while initializing auth
  if (!isInitialized) {
    return (
      <LoadingContainer>
        <div className="spinner"></div>
        <h2>Loading LOL Chess</h2>
        <p>Initializing your session...</p>
      </LoadingContainer>
    )
  }

  return (
    <AppContainer>
      {/* Hide header on game and ban-pick pages for immersive experience */}
      {!hideHeader && <Header />}
      <MainContent isGamePage={hideHeader}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/instructions" element={<InstructionsPage />} />
          <Route path="/database" element={<DatabasePage />} />
          <Route path="/lobby" element={
            <ProtectedRoute>
              <GameLobbyPage />
            </ProtectedRoute>
          } />
          <Route path="/ban-pick/:gameId" element={
            <ProtectedRoute>
              <BanPickPage />
            </ProtectedRoute>
          } />
          <Route path="/game/:gameId" element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
        </Routes>
      </MainContent>
    </AppContainer>
  )
}

export default App
