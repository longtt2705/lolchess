import React from 'react'
import { Routes, Route } from 'react-router-dom'
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
import { useAuthInit } from './hooks/useAuthInit'

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`

const MainContent = styled.main`
  flex: 1;
  padding: 20px;
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
      <Header />
      <MainContent>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
