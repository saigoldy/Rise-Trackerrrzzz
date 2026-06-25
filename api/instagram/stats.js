import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'instagram')
    const { access_token } = creds

    const r = await fetch(
      `https://graph.instagram.com/me?fields=followers_count,media_count&access_token=${access_token}`
    )
    if (!r.ok) return res.status(r.status).json({ error: 'Instagram API error' })

    const d = await r.json()
    res.json({ followers: d.followers_count ?? 0, mediaCount: d.media_count ?? 0 })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
