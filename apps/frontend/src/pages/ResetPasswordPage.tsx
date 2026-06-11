import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { resetPassword } from '../store/authSlice';

const Container = styled.div`
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`;

const Card = styled(motion.div)`
  background: var(--secondary-bg);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
`;

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
`;

const Subtitle = styled.p`
  text-align: center;
  color: var(--secondary-text);
  margin-bottom: 30px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

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
`;

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
`;

const ErrorMessage = styled.span`
  color: var(--red);
  font-size: 14px;
`;

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
`;

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
`;

const Notice = styled.p`
  text-align: center;
  color: var(--primary-text);
  line-height: 1.6;
`;

interface ResetFormData {
  newPassword: string;
  confirmPassword: string;
}

const ResetPasswordPage: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetFormData>();
  const { loading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const onSubmit = async (data: ResetFormData) => {
    if (!token) return;
    try {
      await dispatch(resetPassword({ token, newPassword: data.newPassword })).unwrap();
      toast.success('Password reset! Please log in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Password reset failed');
    }
  };

  if (!token) {
    return (
      <Container>
        <Card
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Title>
            <ShieldCheck className="icon" size={32} />
            Reset Password
          </Title>
          <Notice>This password reset link is invalid or incomplete.</Notice>
          <BackLink>
            <Link to="/forgot-password">Request a new link</Link>
          </BackLink>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Title>
          <ShieldCheck className="icon" size={32} />
          Reset Password
        </Title>
        <Subtitle>Choose a new password for your account.</Subtitle>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <InputGroup>
            <label>
              <Lock className="icon" size={18} />
              New Password
            </label>
            <Input
              type="password"
              placeholder="Enter a new password"
              {...register('newPassword', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            {errors.newPassword && <ErrorMessage>{errors.newPassword.message}</ErrorMessage>}
          </InputGroup>

          <InputGroup>
            <label>
              <Lock className="icon" size={18} />
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Re-enter your new password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === watch('newPassword') || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && (
              <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>
            )}
          </InputGroup>

          <SubmitButton
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </SubmitButton>
        </Form>

        <BackLink>
          <Link to="/login">Back to Login</Link>
        </BackLink>
      </Card>
    </Container>
  );
};

export default ResetPasswordPage;
