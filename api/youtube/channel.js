import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'youtube')
    const { channel_id } = creds

    const url = new URL('https://www.googleapis.com/youtube/v3/channels')
    url.searchParams.set('part', 'snippet,statistics')
    url.searchParams.set('id', channel_id)
    url.searchParams.set('key', process.env.YOUTUBE_API_KEY)

    const r = await fetch(url.toString())
    if (!r.ok) return res.status(r.status).json({ error: 'YouTube API error' })

    const d = await r.json()
    const ch = d.items?.[0]
    if (!ch) return res.status(404).json({ error: 'Channel not found' })

    res.json({
      name: ch.snippet.title,
      subscribers: Number(ch.statistics.subscriberCount),
      totalViews: Number(ch.statistics.viewCount),
      videoCount: Number(ch.statistics.videoCount),
      thumbnail: ch.snippet.thumbnails?.default?.url ?? '',
    })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
