import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { LogOut, User, Home, Gamepad2, BookOpen, Database } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { logout } from '../store/authSlice'

const HeaderContainer = styled.header`
  background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--accent-bg) 100%);
  border-bottom: 2px solid var(--border);
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`

const Logo = styled(Link)`
  font-size: 28px;
  font-weight: bold;
  color: var(--gold);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 12px;
  
  &:hover {
    color: var(--hover);
  }
`

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 24px;
`

const NavLink = styled(Link)`
  color: var(--primary-text);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  
  &:hover {
    background: rgba(200, 155, 60, 0.1);
    color: var(--gold);
  }
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--primary-text);
  
  .user-details {
    text-align: right;
    
    .username {
      font-weight: bold;
      color: var(--gold);
    }
    
    .rating {
      font-size: 14px;
      color: var(--secondary-text);
    }
  }
`

const LogoutButton = styled.button`
  background: transparent;
  border: 1px solid var(--red);
  color: var(--red);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--red);
    color: var(--primary-bg);
  }
`

const Header: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  return (
    <HeaderContainer>
      <Logo to="/">
        <Gamepad2 size={32} />
        LOL Chess
      </Logo>

      <Nav>
        <NavLink to="/">
          <Home size={18} />
          Home
        </NavLink>
        <NavLink to="/instructions">
          <BookOpen size={18} />
          Rules
        </NavLink>
        <NavLink to="/database">
          <Database size={18} />
          Database
        </NavLink>

        {isAuthenticated ? (
          <>
            <NavLink to="/lobby">
              <Gamepad2 size={18} />
              1v1 Lobby
            </NavLink>
            <NavLink to="/profile">
              <User size={18} />
              Profile
            </NavLink>
            <UserInfo>
              <div className="user-details">
                <div className="username">{user?.username}</div>
                <div className="rating">Rating: {user?.rating || 1000}</div>
              </div>
              <LogoutButton onClick={handleLogout}>
                <LogOut size={16} />
                Logout
              </LogoutButton>
            </UserInfo>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </Nav>
    </HeaderContainer>
  )
}

export default Header
