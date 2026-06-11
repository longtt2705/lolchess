import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { KeyRound, Mail } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { requestPasswordReset } from '../store/authSlice'

const Container = styled.div`
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`

const Card = styled(motion.div)`
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

const SubmitButton = styled(motion.button)`
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

const BackLink = styled.div`
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

const Confirmation = styled.p`
  text-align: center;
  color: var(--primary-text);
  line-height: 1.6;
`

interface ForgotFormData {
  email: string
}

const ForgotPasswordPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotFormData>()
  const { loading } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = async (data: ForgotFormData) => {
    try {
      await dispatch(requestPasswordReset(data)).unwrap()
      setSubmitted(true)
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Request failed')
    }
  }

  return (
    <Container>
      <Card
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Title>
          <KeyRound className="icon" size={32} />
          Forgot Password
        </Title>

        {submitted ? (
          <>
            <Confirmation>
              If an account exists for that email, we&apos;ve sent a password reset link.
              Check your inbox and follow the link to set a new password.
            </Confirmation>
            <BackLink>
              <Link to="/login">Back to Login</Link>
            </BackLink>
          </>
        ) : (
          <>
            <Subtitle>Enter your email and we&apos;ll send you a reset link.</Subtitle>
            <Form onSubmit={handleSubmit(onSubmit)}>
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
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                />
                {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
              </InputGroup>

              <SubmitButton
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </SubmitButton>
            </Form>

            <BackLink>
              Remembered it? <Link to="/login">Back to Login</Link>
            </BackLink>
          </>
        )}
      </Card>
    </Container>
  )
}

export default ForgotPasswordPage
