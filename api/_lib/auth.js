import { createClient } from '@supabase/supabase-js'
import { createHmac, randomBytes } from 'node:crypto'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function verifyUser(req) {
  const auth = req.headers['authorization'] ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw new Error('Missing Authorization header')

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Invalid or expired token')
  return user
}

export async function getPlatformCreds(userId, platform) {
  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .select('credentials')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single()

  if (error || !data) throw new Error(`No ${platform} connection found`)
  return data.credentials
}

export function signOAuthState(userId) {
  const nonce = randomBytes(16).toString('hex')
  const payload = `${userId}.${nonce}`
  const sig = createHmac('sha256', process.env.OAUTH_STATE_SECRET).update(payload).digest('hex')
  return { state: `${payload}.${sig}`, nonce }
}

export function verifyOAuthState(state, nonce) {
  const parts = state.split('.')
  if (parts.length !== 3) throw new Error('Invalid state format')
  const [userId, statNonce, sig] = parts
  if (statNonce !== nonce) throw new Error('Nonce mismatch')
  const expected = createHmac('sha256', process.env.OAUTH_STATE_SECRET)
    .update(`${userId}.${nonce}`)
    .digest('hex')
  if (sig !== expected) throw new Error('State signature invalid')
  return userId
}
