import { verifyUser, signOAuthState } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
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
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
