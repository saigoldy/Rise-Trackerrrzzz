import { verifyUser, getPlatformCreds } from '../_lib/auth.js'
import { fetchAudiomackStats } from '../_lib/platformFetch.js'
import { createHmac, randomBytes } from 'node:crypto'

function buildOAuth1Header(method, url, consumerKey, consumerSecret) {
  const nonce = randomBytes(16).toString('hex')
  const ts = Math.floor(Date.now() / 1000).toString()
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: ts,
    oauth_version: '1.0',
  }
  const paramStr = Object.entries(params).sort()
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`
  const sig = createHmac('sha1', `${encodeURIComponent(consumerSecret)}&`).update(base).digest('base64')
  params.oauth_signature = sig
  return 'OAuth ' + Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(', ')
}

async function artistHandler(req, res, creds) {
  const stats = await fetchAudiomackStats(creds)
  res.json(stats)
}

async function songs(req, res, creds) {
  const url = `https://api.audiomack.com/v1/artist/${creds.slug}/songs`
  const auth = buildOAuth1Header('GET', url, creds.consumer_key, creds.consumer_secret)
  const r = await fetch(url, { headers: { Authorization: auth } })
  if (!r.ok) return res.status(r.status).json({ error: 'Audiomack API error' })
  const d = await r.json()
  res.json((d.results ?? []).slice(0, 10).map(s => ({
    id: s.id,
    title: s.title,
    plays: s.plays ?? 0,
    favorites: s.favorites ?? 0,
    date: s.created,
    thumbnail: s.image ?? '',
  })))
}

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'audiomack')
    const { endpoint } = req.query
    if (endpoint === 'artist') return await artistHandler(req, res, creds)
    if (endpoint === 'songs')  return await songs(req, res, creds)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    res.status(err.message?.includes('No audiomack') ? 404 : 401).json({ error: err.message })
  }
}
