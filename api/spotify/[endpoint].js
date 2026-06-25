import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

async function getSpotifyToken() {
  const creds = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const d = await r.json()
  return d.access_token
}

async function artist(req, res, artistId) {
  const token = await getSpotifyToken()
  const r = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return res.status(r.status).json({ error: 'Spotify API error' })

  const d = await r.json()
  res.json({
    name: d.name,
    followers: d.followers.total,
    popularity: d.popularity,
    genres: d.genres,
    thumbnail: d.images?.[0]?.url ?? '',
  })
}

async function topTracks(req, res, artistId) {
  const token = await getSpotifyToken()
  const r = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return res.status(r.status).json({ error: 'Spotify API error' })

  const d = await r.json()
  res.json((d.tracks ?? []).map(t => ({
    id: t.id,
    name: t.name,
    album: t.album.name,
    releaseDate: t.album.release_date,
    popularity: t.popularity,
    previewUrl: t.preview_url,
    thumbnail: t.album.images?.[0]?.url ?? '',
  })))
}

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'spotify')
    const { endpoint } = req.query

    if (endpoint === 'artist')     return artist(req, res, creds.artist_id)
    if (endpoint === 'top-tracks') return topTracks(req, res, creds.artist_id)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
