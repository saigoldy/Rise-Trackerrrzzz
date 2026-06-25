import { verifyUser, getPlatformCreds, signOAuthState, verifyOAuthState, supabaseAdmin } from '../_lib/auth.js'

async function auth(req, res) {
  const user = await verifyUser(req)
  const { state, nonce } = signOAuthState(user.id)

  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/tiktok/callback`

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    scope: 'user.info.basic',
    response_type: 'code',
    redirect_uri: redirect,
    state,
  })

  res.setHeader('Set-Cookie', `tt_nonce=${nonce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`)
  res.redirect(`https://www.tiktok.com/auth/authorize/?${params}`)
}

async function callback(req, res) {
  const { code, state } = req.query
  const cookieHeader = req.headers.cookie ?? ''
  const nonce = cookieHeader.split(';').find(c => c.trim().startsWith('tt_nonce='))?.split('=')[1]?.trim()
  if (!nonce) return res.status(400).json({ error: 'Missing nonce cookie' })

  const userId = verifyOAuthState(state, nonce)

  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/tiktok/callback`

  const tokenRes = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirect,
    }),
  })
  const tokenData = await tokenRes.json()
  const token = tokenData.data
  if (!token?.access_token) return res.status(400).json({ error: 'Token exchange failed' })

  await supabaseAdmin.from('platform_connections').upsert({
    user_id: userId,
    platform: 'tiktok',
    credentials: { access_token: token.access_token, open_id: token.open_id },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  res.setHeader('Set-Cookie', 'tt_nonce=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  res.redirect(`${protocol}://${host.replace(':3001', ':5173')}/connections?connected=tiktok`)
}

async function stats(req, res) {
  const user = await verifyUser(req)
  const creds = await getPlatformCreds(user.id, 'tiktok')
  const { access_token } = creds

  const r = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count,video_count,like_count', {
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  })
  if (!r.ok) return res.status(r.status).json({ error: 'TikTok API error' })

  const d = await r.json()
  const info = d.data?.user ?? {}
  res.json({
    followers: info.follower_count ?? 0,
    videoCount: info.video_count ?? 0,
    likes: info.like_count ?? 0,
  })
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
