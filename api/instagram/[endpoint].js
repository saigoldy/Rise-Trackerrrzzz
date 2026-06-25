import {
  verifyUser, getPlatformCreds, signOAuthState, verifyOAuthState, supabaseAdmin
} from '../_lib/auth.js'
import { fetchInstagramStats } from '../_lib/platformFetch.js'

async function auth(req, res) {
  const user = await verifyUser(req)
  const creds = await getPlatformCreds(user.id, 'instagram')
  if (!creds.app_id) return res.status(400).json({ error: 'Save App ID and App Secret first' })

  const { state, nonce } = signOAuthState(user.id)
  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/instagram/callback`

  const params = new URLSearchParams({
    client_id: creds.app_id,
    redirect_uri: redirect,
    scope: 'user_profile,user_media',
    response_type: 'code',
    state,
  })

  res.setHeader('Set-Cookie', `ig_nonce=${nonce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`)
  res.redirect(`https://api.instagram.com/oauth/authorize?${params}`)
}

async function callback(req, res) {
  const { code, state } = req.query
  const cookieHeader = req.headers.cookie ?? ''
  const nonce = cookieHeader.split(';')
    .find(c => c.trim().startsWith('ig_nonce='))?.split('=')[1]?.trim()
  if (!nonce) return res.status(400).json({ error: 'Missing nonce cookie' })

  const userId = verifyOAuthState(state, nonce)

  const existingCreds = await getPlatformCreds(userId, 'instagram')

  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/instagram/callback`

  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: existingCreds.app_id,
      client_secret: existingCreds.app_secret,
      grant_type: 'authorization_code',
      redirect_uri: redirect,
      code,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) return res.status(400).json({ error: 'Token exchange failed' })

  await supabaseAdmin.from('platform_connections').upsert({
    user_id: userId,
    platform: 'instagram',
    credentials: { ...existingCreds, access_token: tokenData.access_token, user_id: String(tokenData.user_id) },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  const frontendHost = host.includes('localhost') ? 'localhost:5173' : host
  const frontendUrl = `${protocol}://${frontendHost}/connections?connected=instagram`
  res.setHeader('Set-Cookie', 'ig_nonce=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  res.redirect(frontendUrl)
}

async function stats(req, res) {
  const user = await verifyUser(req)
  const creds = await getPlatformCreds(user.id, 'instagram')
  const result = await fetchInstagramStats(creds)
  res.json(result)
}

export default async function handler(req, res) {
  const { endpoint } = req.query
  try {
    if (endpoint === 'auth')     return await auth(req, res)
    if (endpoint === 'callback') return await callback(req, res)
    if (endpoint === 'stats')    return await stats(req, res)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    const status = err.message?.includes('nonce') || err.message?.includes('state') ? 400
      : err.message?.includes('No instagram') ? 404 : 401
    res.status(status).json({ error: err.message })
  }
}
