const express = require('express')
const axios = require('axios')
const router = express.Router()

const BASE = 'https://www.googleapis.com/youtube/v3'

router.get('/channel', async (req, res) => {
  const { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } = process.env
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID)
    return res.status(400).json({ error: 'YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID not set in .env' })

  try {
    const { data } = await axios.get(`${BASE}/channels`, {
      params: { part: 'statistics,snippet', id: YOUTUBE_CHANNEL_ID, key: YOUTUBE_API_KEY },
    })
    const ch = data.items?.[0]
    if (!ch) return res.status(404).json({ error: 'Channel not found' })

    res.json({
      name: ch.snippet.title,
      subscribers: parseInt(ch.statistics.subscriberCount) || 0,
      totalViews: parseInt(ch.statistics.viewCount) || 0,
      videoCount: parseInt(ch.statistics.videoCount) || 0,
      thumbnail: ch.snippet.thumbnails?.default?.url ?? null,
    })
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message ?? err.message })
  }
})

router.get('/videos', async (req, res) => {
  const { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } = process.env
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID)
    return res.status(400).json({ error: 'YouTube not configured' })

  try {
    const search = await axios.get(`${BASE}/search`, {
      params: {
        part: 'snippet', channelId: YOUTUBE_CHANNEL_ID,
        type: 'video', order: 'date', maxResults: 10, key: YOUTUBE_API_KEY,
      },
    })

    const ids = search.data.items.map(i => i.id.videoId).join(',')
    if (!ids) return res.json([])

    const { data } = await axios.get(`${BASE}/videos`, {
      params: { part: 'statistics,snippet', id: ids, key: YOUTUBE_API_KEY },
    })

    res.json(data.items.map(v => ({
      id: v.id,
      title: v.snippet.title,
      date: v.snippet.publishedAt,
      views: parseInt(v.statistics.viewCount) || 0,
      likes: parseInt(v.statistics.likeCount) || 0,
      comments: parseInt(v.statistics.commentCount) || 0,
      thumbnail: v.snippet.thumbnails?.medium?.url ?? null,
    })))
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message ?? err.message })
  }
})

module.exports = router
