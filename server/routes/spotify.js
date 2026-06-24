const express = require('express')
const axios = require('axios')
const router = express.Router()

// In-memory token cache (expires every 55 min)
let _token = null
let _expiry = 0

async function clientToken() {
  if (_token && Date.now() < _expiry) return _token
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET)
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET not set in .env')

  const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
  const { data } = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  _token = data.access_token
  _expiry = Date.now() + (data.expires_in - 60) * 1000
  return _token
}

router.get('/artist', async (req, res) => {
  const id = process.env.SPOTIFY_ARTIST_ID
  if (!id) return res.status(400).json({ error: 'SPOTIFY_ARTIST_ID not set in .env' })

  try {
    const token = await clientToken()
    const { data } = await axios.get(`https://api.spotify.com/v1/artists/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    res.json({
      name: data.name,
      followers: data.followers.total,
      popularity: data.popularity,
      genres: data.genres,
      image: data.images?.[0]?.url ?? null,
    })
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message ?? err.message })
  }
})

router.get('/top-tracks', async (req, res) => {
  const id = process.env.SPOTIFY_ARTIST_ID
  if (!id) return res.status(400).json({ error: 'SPOTIFY_ARTIST_ID not set in .env' })

  try {
    const token = await clientToken()
    const { data } = await axios.get(`https://api.spotify.com/v1/artists/${id}/top-tracks`, {
      params: { market: 'UG' },
      headers: { Authorization: `Bearer ${token}` },
    })
    res.json(data.tracks.map(t => ({
      id: t.id,
      title: t.name,
      popularity: t.popularity,
      preview: t.preview_url,
      album: t.album.name,
      image: t.album.images?.[0]?.url ?? null,
    })))
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message ?? err.message })
  }
})

module.exports = router
