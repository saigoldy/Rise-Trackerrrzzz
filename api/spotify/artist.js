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

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'spotify')
    const { artist_id } = creds

    const token = await getSpotifyToken()
    const r = await fetch(`https://api.spotify.com/v1/artists/${artist_id}`, {
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
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
