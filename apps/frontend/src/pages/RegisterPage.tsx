import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { UserPlus, User, Lock, Mail } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { registerUser } from '../store/authSlice'

const RegisterContainer = styled.div`
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`

const RegisterCard = styled(motion.div)`
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

const RegisterButton = styled(motion.button)`
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

const LoginLink = styled.div`
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

interface RegisterFormData {
    username: string
    email: string
    password: string
    confirmPassword: string
}

const RegisterPage: React.FC = () => {
    const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterFormData>()
    const { loading, isAuthenticated } = useAppSelector(state => state.auth)
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const password = watch('password')

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/lobby')
        }
    }, [isAuthenticated, navigate])

    const onSubmit = (data: RegisterFormData) => {
        const { username, email, password } = data
        dispatch(registerUser({ username, email, password }))
    }

    return (
        <RegisterContainer>
            <RegisterCard
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <Title>
                    <UserPlus className="icon" size={32} />
                    Register
                </Title>
                <Subtitle>Join the battle, summoner!</Subtitle>

                <Form onSubmit={handleSubmit(onSubmit)}>
                    <InputGroup>
                        <label>
                            <User className="icon" size={18} />
                            Username
                        </label>
                        <Input
                            type="text"
                            placeholder="Choose a username"
                            {...register('username', {
                                required: 'Username is required',
                                minLength: { value: 3, message: 'Username must be at least 3 characters' },
                                maxLength: { value: 20, message: 'Username must be less than 20 characters' }
                            })}
                        />
                        {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
                    </InputGroup>

                    <InputGroup>
                        <label>
                            <Mail className="icon" size={18} />
                            Email
                        </label>
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            {...register('email', {
                                required: 'Email is required',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Invalid email address'
                                }
                            })}
                        />
                        {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
                    </InputGroup>

                    <InputGroup>
                        <label>
                            <Lock className="icon" size={18} />
                            Password
                        </label>
                        <Input
                            type="password"
                            placeholder="Create a password"
                            {...register('password', {
                                required: 'Password is required',
                                minLength: { value: 6, message: 'Password must be at least 6 characters' }
                            })}
                        />
                        {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
                    </InputGroup>

                    <InputGroup>
                        <label>
                            <Lock className="icon" size={18} />
                            Confirm Password
                        </label>
                        <Input
                            type="password"
                            placeholder="Confirm your password"
                            {...register('confirmPassword', {
                                required: 'Please confirm your password',
                                validate: value => value === password || 'Passwords do not match'
                            })}
                        />
                        {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>}
                    </InputGroup>

                    <RegisterButton
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </RegisterButton>
                </Form>

                <LoginLink>
                    Already have an account?{' '}
                    <Link to="/login">Login here</Link>
                </LoginLink>
            </RegisterCard>
        </RegisterContainer>
    )
}

export default RegisterPage
