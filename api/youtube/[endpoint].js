import { verifyUser, getPlatformCreds } from '../_lib/auth.js'
import { fetchYouTubeStats } from '../_lib/platformFetch.js'

async function channel(req, res, creds) {
  const stats = await fetchYouTubeStats(creds)
  res.json(stats)
}

async function videos(req, res, creds) {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'id')
  searchUrl.searchParams.set('channelId', creds.channel_id)
  searchUrl.searchParams.set('maxResults', '10')
  searchUrl.searchParams.set('order', 'date')
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('key', creds.api_key)

  const searchRes = await fetch(searchUrl.toString())
  if (!searchRes.ok) return res.status(searchRes.status).json({ error: 'YouTube search error' })

  const searchData = await searchRes.json()
  const ids = (searchData.items ?? []).map(i => i.id.videoId).join(',')
  if (!ids) return res.json([])

  const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
  statsUrl.searchParams.set('part', 'snippet,statistics')
  statsUrl.searchParams.set('id', ids)
  statsUrl.searchParams.set('key', creds.api_key)

  const statsRes = await fetch(statsUrl.toString())
  if (!statsRes.ok) return res.status(statsRes.status).json({ error: 'YouTube stats error' })
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
    if (endpoint === 'channel') return await channel(req, res, creds)
    if (endpoint === 'videos')  return await videos(req, res, creds)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    res.status(err.message?.includes('No youtube') ? 404 : 401).json({ error: err.message })
  }
}
