import React, { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { LogIn, User, Lock } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { loginUser } from '../store/authSlice'

const LoginContainer = styled.div`
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`

const LoginCard = styled(motion.div)`
  background: var(--secondary-bg);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
`

const Title = styled.h1`
  text-align: center;
  color: var(--primary-text);
  margin-bottom: 10px;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  
  .icon {
    color: var(--gold);
  }
`

const Subtitle = styled.p`
  text-align: center;
  color: var(--secondary-text);
  margin-bottom: 30px;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  label {
    color: var(--primary-text);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    
    .icon {
      color: var(--gold);
    }
  }
`

const Input = styled.input`
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 6px;
  background: var(--primary-bg);
  color: var(--primary-text);
  font-size: 16px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(200, 155, 60, 0.1);
  }
  
  &::placeholder {
    color: var(--secondary-text);
  }
`

const ErrorMessage = styled.span`
  color: var(--red);
  font-size: 14px;
`

const LoginButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
  color: var(--primary-bg);
  padding: 16px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const RegisterLink = styled.div`
  text-align: center;
  margin-top: 20px;
  color: var(--secondary-text);
  
  a {
    color: var(--gold);
    text-decoration: none;
    font-weight: bold;
    
    &:hover {
      color: var(--hover);
    }
  }
`

interface LoginFormData {
  username: string
  password: string
}

const LoginPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>()
  const { loading, isAuthenticated } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isAuthenticated) {
      // Redirect to the page they were trying to access, or default to lobby
      const from = (location.state as any)?.from?.pathname || '/lobby'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const onSubmit = (data: LoginFormData) => {
    dispatch(loginUser(data))
  }

  return (
    <LoginContainer>
      <LoginCard
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Title>
          <LogIn className="icon" size={32} />
          Login
        </Title>
        <Subtitle>Welcome back, champion!</Subtitle>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <InputGroup>
            <label>
              <User className="icon" size={18} />
              Username
            </label>
            <Input
              type="text"
              placeholder="Enter your username"
              {...register('username', {
                required: 'Username is required',
                minLength: { value: 3, message: 'Username must be at least 3 characters' }
              })}
            />
            {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
          </InputGroup>

          <InputGroup>
            <label>
              <Lock className="icon" size={18} />
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' }
              })}
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </InputGroup>

          <LoginButton
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </LoginButton>
        </Form>

        <RegisterLink>
          Don't have an account?{' '}
          <Link to="/register">Register here</Link>
        </RegisterLink>
      </LoginCard>
    </LoginContainer>
  )
}

export default LoginPage
