import { verifyOAuthState, supabaseAdmin } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
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
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}
