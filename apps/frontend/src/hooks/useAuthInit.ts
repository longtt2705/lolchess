import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './redux'
import { getCurrentUser } from '../store/authSlice'

export const useAuthInit = () => {
  const dispatch = useAppDispatch()
  const { user, token, loading } = useAppSelector(state => state.auth)

  useEffect(() => {
    // If we have a token but no user data, fetch user from server
    if (token && !user && !loading) {
      console.log('Token found but no user data, fetching from /auth/me')
      dispatch(getCurrentUser())
    }
  }, [dispatch, token, user, loading])

  return {
    isInitialized: !token || !!user || loading,
    loading,
  }
}
