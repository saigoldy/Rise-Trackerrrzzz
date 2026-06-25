import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'youtube')
    const { channel_id } = creds
    const key = process.env.YOUTUBE_API_KEY

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'id')
    searchUrl.searchParams.set('channelId', channel_id)
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

    const videos = (statsData.items ?? []).map(v => ({
      id: v.id,
      title: v.snippet.title,
      published: v.snippet.publishedAt,
      thumbnail: v.snippet.thumbnails?.medium?.url ?? '',
      views: Number(v.statistics.viewCount ?? 0),
      likes: Number(v.statistics.likeCount ?? 0),
      comments: Number(v.statistics.commentCount ?? 0),
    }))

    res.json(videos)
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
