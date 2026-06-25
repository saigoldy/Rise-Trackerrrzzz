import { verifyUser, getPlatformCreds, signOAuthState, verifyOAuthState, supabaseAdmin } from '../_lib/auth.js'

async function auth(req, res) {
  const user = await verifyUser(req)
  const { state, nonce } = signOAuthState(user.id)

  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/instagram/callback`

  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID,
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
  const nonce = cookieHeader.split(';').find(c => c.trim().startsWith('ig_nonce='))?.split('=')[1]?.trim()
  if (!nonce) return res.status(400).json({ error: 'Missing nonce cookie' })

  const userId = verifyOAuthState(state, nonce)

  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/instagram/callback`

  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET,
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
    credentials: { access_token: tokenData.access_token, user_id: tokenData.user_id },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  res.setHeader('Set-Cookie', 'ig_nonce=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  res.redirect(`${protocol}://${host.replace(':3001', ':5173')}/connections?connected=instagram`)
}

async function stats(req, res) {
  const user = await verifyUser(req)
  const creds = await getPlatformCreds(user.id, 'instagram')
  const { access_token } = creds

  const r = await fetch(
    `https://graph.instagram.com/me?fields=followers_count,media_count&access_token=${access_token}`
  )
  if (!r.ok) return res.status(r.status).json({ error: 'Instagram API error' })

  const d = await r.json()
  res.json({ followers: d.followers_count ?? 0, mediaCount: d.media_count ?? 0 })
}

export default async function handler(req, res) {
  const { endpoint } = req.query
  try {
    if (endpoint === 'auth')     return await auth(req, res)
    if (endpoint === 'callback') return await callback(req, res)
    if (endpoint === 'stats')    return await stats(req, res)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    res.status(err.message?.includes('nonce') || err.message?.includes('state') ? 400 : 401).json({ error: err.message })
  }
}
