import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: () =>
        new Promise(() => {
          // never resolves during this test — keeps loading state active
        }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
    },
  }),
}))

function TestConsumer() {
  const { user, loading } = useAuth()
  if (loading) return <div>loading</div>
  return <div>{user ? 'signed-in' : 'signed-out'}</div>
}

test('AuthContext renders without crashing and starts in loading state', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </MemoryRouter>
  )
  // Starts loading (supabase.auth.getSession is async)
  expect(screen.getByText('loading')).toBeInTheDocument()
})
