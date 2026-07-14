import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
    children: React.ReactNode
    requireAdmin?: boolean
}

const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
    const { user, token, loading } = useAuth()
    const location = useLocation()

    if (loading) return null

    if (!token || !user) return <Navigate to="/login" replace />

    const isFirstLogin = user.firstLogin || (user as any).first_login
    if (isFirstLogin && location.pathname !== '/first-login') 
        return <Navigate to="/first-login" replace />

    const isProfileCompleted = user.profileCompleted || (user as any).profile_completed
    if (user.role === 'faculty' && !isProfileCompleted && location.pathname !== '/onboarding') 
        return <Navigate to="/onboarding" replace />

    if (requireAdmin && user.role !== 'admin') 
        return <Navigate to="/home" replace />

    return <>{children}</>
}

export default ProtectedRoute