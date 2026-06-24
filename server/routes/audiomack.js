const express = require('express')
const axios = require('axios')
const crypto = require('crypto')
const tokens = require('../lib/tokens')
const router = express.Router()

// Audiomack uses OAuth 1.0a for authenticated endpoints.
// Public artist stats are available with just consumer key + artist slug.
const BASE = 'https://api.audiomack.com/v1'
const FRONTEND = 'http://localhost:5173'

function oauthHeader(method, url, consumerKey, consumerSecret) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(8).toString('hex')
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0',
  }
  const base = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')),
  ].join('&')

  const signingKey = `${encodeURIComponent(consumerSecret)}&`
  const signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64')
  params.oauth_signature = signature

  return 'OAuth ' + Object.keys(params).map(k => `${k}="${encodeURIComponent(params[k])}"`).join(', ')
}

router.get('/artist', async (req, res) => {
  const { AUDIOMACK_CONSUMER_KEY, AUDIOMACK_CONSUMER_SECRET, AUDIOMACK_SLUG } = process.env
  if (!AUDIOMACK_CONSUMER_KEY || !AUDIOMACK_SLUG)
    return res.status(400).json({ error: 'Audiomack credentials not set in .env' })

  const url = `${BASE}/artist/${AUDIOMACK_SLUG}`
  try {
    const { data } = await axios.get(url, {
      headers: { Authorization: oauthHeader('GET', url, AUDIOMACK_CONSUMER_KEY, AUDIOMACK_CONSUMER_SECRET) },
    })
    const a = data.results
    res.json({
      name: a?.name ?? AUDIOMACK_SLUG,
      slug: a?.url_slug ?? AUDIOMACK_SLUG,
      followers: a?.followers ?? 0,
      plays: a?.plays ?? 0,
      songs: a?.song_count ?? 0,
      image: a?.image ?? null,
    })
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error_message ?? err.message })
  }
})

router.get('/songs', async (req, res) => {
  const { AUDIOMACK_CONSUMER_KEY, AUDIOMACK_CONSUMER_SECRET, AUDIOMACK_SLUG } = process.env
  if (!AUDIOMACK_CONSUMER_KEY || !AUDIOMACK_SLUG)
    return res.status(400).json({ error: 'Audiomack not configured' })

  const url = `${BASE}/artist/${AUDIOMACK_SLUG}/songs`
  try {
    const { data } = await axios.get(url, {
      headers: { Authorization: oauthHeader('GET', url, AUDIOMACK_CONSUMER_KEY, AUDIOMACK_CONSUMER_SECRET) },
    })
    const songs = (data.results ?? []).slice(0, 10).map(s => ({
      id: s.id,
      title: s.title,
      plays: s.plays ?? 0,
      favorites: s.favorites ?? 0,
      date: s.created,
      image: s.image ?? null,
    }))
    res.json(songs)
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error_message ?? err.message })
  }
})

module.exports = router
