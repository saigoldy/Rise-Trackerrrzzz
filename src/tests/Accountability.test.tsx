import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

const chainable = (result: unknown = { data: null, error: null }): unknown => {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'gte', 'order', 'single', 'maybeSingle', 'upsert']
  methods.forEach(m => {
    chain[m] = () => chainable(result)
  })
  // terminal methods return a promise
  ;(chain as Record<string, unknown>).single = () => Promise.resolve({ data: null, error: null })
  ;(chain as Record<string, unknown>).maybeSingle = () => Promise.resolve({ data: null, error: null })
  ;(chain as Record<string, unknown>).then = undefined // not a thenable itself
  return chain
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => chainable(),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, session: null }),
}))

test('Accountability renders slate items', async () => {
  const { default: Accountability } = await import('../pages/Accountability')
  render(<MemoryRouter><Accountability /></MemoryRouter>)
  expect(await screen.findByText('Gym Session')).toBeInTheDocument()
  expect(screen.getByText('Salon Duty')).toBeInTheDocument()
})
