import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '../hooks/redux'
import { toast } from 'react-hot-toast'

interface ProtectedRouteProps {
    children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, user, loading } = useAppSelector(state => state.auth)
    const location = useLocation()

    // Show loading state while initializing
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '50vh',
                color: 'var(--primary-text)'
            }}>
                <div>Loading...</div>
            </div>
        )
    }

    // If not authenticated or no user data, redirect to login
    if (!isAuthenticated || !user) {
        // Show toast message only once per redirect
        if (!sessionStorage.getItem('redirected')) {
            toast.error('Please log in to access this page')
            sessionStorage.setItem('redirected', 'true')
        }

        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Clear redirect flag when successfully authenticated
    sessionStorage.removeItem('redirected')

    return <>{children}</>
}

export default ProtectedRoute
