import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

async function channel(req, res, creds) {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels')
  url.searchParams.set('part', 'snippet,statistics')
  url.searchParams.set('id', creds.channel_id)
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
}

async function videos(req, res, creds) {
  const key = process.env.YOUTUBE_API_KEY

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'id')
  searchUrl.searchParams.set('channelId', creds.channel_id)
  searchUrl.searchParams.set('maxResults', '10')
  searchUrl.searchParams.set('order', 'date')
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('key', key)

  const searchRes = await fetch(searchUrl.toString())
  if (!searchRes.ok) return res.status(searchRes.status).json({ error: 'YouTube search error' })

  const searchData = await searchRes.json()
  const ids = (searchData.items ?? []).map(i => i.id.videoId).join(',')
  if (!ids) return res.json([])

  const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
  statsUrl.searchParams.set('part', 'snippet,statistics')
  statsUrl.searchParams.set('id', ids)
  statsUrl.searchParams.set('key', key)

  const statsRes = await fetch(statsUrl.toString())
  const statsData = await statsRes.json()

  res.json((statsData.items ?? []).map(v => ({
    id: v.id,
    title: v.snippet.title,
    published: v.snippet.publishedAt,
    thumbnail: v.snippet.thumbnails?.medium?.url ?? '',
    views: Number(v.statistics.viewCount ?? 0),
    likes: Number(v.statistics.likeCount ?? 0),
    comments: Number(v.statistics.commentCount ?? 0),
  })))
}

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'youtube')
    const { endpoint } = req.query

    if (endpoint === 'channel') return channel(req, res, creds)
    if (endpoint === 'videos')  return videos(req, res, creds)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
