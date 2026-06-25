import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  onboardingComplete: boolean
  refreshOnboardingStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null, session: null, loading: true,
  onboardingComplete: false, refreshOnboardingStatus: async () => {},
})

async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', userId)
    .single()
  return data?.onboarding_complete ?? false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState(false)

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) { setOnboardingComplete(false); setLoading(false); return }
    const complete = await fetchOnboardingStatus(u.id)
    setOnboardingComplete(complete)
    setLoading(false)
  }, [])

  const refreshOnboardingStatus = useCallback(async () => {
    if (!user) return
    const complete = await fetchOnboardingStatus(user.id)
    setOnboardingComplete(complete)
  }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  return (
    <AuthContext.Provider value={{ user, session, loading, onboardingComplete, refreshOnboardingStatus }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
