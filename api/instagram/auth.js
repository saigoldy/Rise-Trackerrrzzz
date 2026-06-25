import { verifyUser, signOAuthState } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
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
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
