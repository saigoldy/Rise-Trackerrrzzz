import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      }),
      insert: () => Promise.resolve({ data: [{ id: 'new-id' }], error: null }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, session: null }),
}))

test('Content page renders Add Content button', async () => {
  const { default: Content } = await import('../pages/Content')
  render(<MemoryRouter><Content /></MemoryRouter>)
  expect(await screen.findByText('Add Content')).toBeInTheDocument()
})
