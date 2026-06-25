import { verifyOAuthState, supabaseAdmin } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
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
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}
