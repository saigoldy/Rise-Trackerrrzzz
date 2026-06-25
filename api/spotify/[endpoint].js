import { verifyUser, getPlatformCreds } from '../_lib/auth.js'
import { fetchSpotifyStats } from '../_lib/platformFetch.js'

async function getToken(creds) {
  const encoded = Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString('base64')
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const d = await r.json()
  if (!d.access_token) throw new Error('Spotify token exchange failed')
  return d.access_token
}

async function artist(req, res, creds) {
  const stats = await fetchSpotifyStats(creds)
  res.json(stats)
}

async function topTracks(req, res, creds) {
  const token = await getToken(creds)
  const r = await fetch(`https://api.spotify.com/v1/artists/${creds.artist_id}/top-tracks?market=US`, {
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
    if (endpoint === 'artist')     return await artist(req, res, creds)
    if (endpoint === 'top-tracks') return await topTracks(req, res, creds)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    res.status(err.message?.includes('No spotify') ? 404 : 401).json({ error: err.message })
  }
}
