import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'tiktok')
    const { access_token, open_id } = creds

    const r = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count,video_count,like_count', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!r.ok) return res.status(r.status).json({ error: 'TikTok API error' })

    const d = await r.json()
    const info = d.data?.user ?? {}
    res.json({
      followers: info.follower_count ?? 0,
      videoCount: info.video_count ?? 0,
      likes: info.like_count ?? 0,
    })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
