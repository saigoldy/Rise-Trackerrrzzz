import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, onboardingComplete } = useAuth()
  if (loading) return <div style={{ color: '#F1F5F9', padding: 40 }}>Loading…</div>
  if (!user) return <Navigate to="/signin" replace />
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
