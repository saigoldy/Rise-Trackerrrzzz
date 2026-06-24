const express = require('express')
const axios = require('axios')
const crypto = require('crypto')
const tokens = require('../lib/tokens')
const router = express.Router()

const REDIRECT = 'http://localhost:3001/api/tiktok/callback'
const FRONTEND = 'http://localhost:5173'

// Step 1 — redirect to TikTok OAuth
router.get('/auth', (req, res) => {
  const { TIKTOK_CLIENT_KEY } = process.env
  if (!TIKTOK_CLIENT_KEY)
    return res.status(400).json({ error: 'TIKTOK_CLIENT_KEY not set in .env' })

  const state = crypto.randomBytes(16).toString('hex')
  req.session.tiktokState = state

  const url = new URL('https://www.tiktok.com/v2/auth/authorize/')
  url.searchParams.set('client_key', TIKTOK_CLIENT_KEY)
  url.searchParams.set('scope', 'user.info.basic,video.list')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', REDIRECT)
  url.searchParams.set('state', state)
  res.redirect(url.toString())
})

// Step 2 — TikTok redirects back with ?code=
router.get('/callback', async (req, res) => {
  const { code, state } = req.query
  const { TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET } = process.env

  if (!code || state !== req.session.tiktokState)
    return res.redirect(`${FRONTEND}/connections?error=tiktok_denied`)

  try {
    const { data } = await axios.post('https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    tokens.set('tiktok', { access_token: data.access_token, open_id: data.open_id })
    res.redirect(`${FRONTEND}/connections?connected=tiktok`)
  } catch (err) {
    console.error('TikTok callback error:', err.response?.data ?? err.message)
    res.redirect(`${FRONTEND}/connections?error=tiktok`)
  }
})

// Fetch live stats
router.get('/stats', async (req, res) => {
  const t = tokens.get('tiktok')
  if (!t) return res.status(401).json({ error: 'TikTok not connected' })

  try {
    const fields = 'open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count'
    const { data } = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
      params: { fields },
      headers: { Authorization: `Bearer ${t.access_token}` },
    })
    const u = data.data?.user ?? {}
    res.json({
      username: u.display_name,
      followers: u.follower_count ?? 0,
      likes: u.likes_count ?? 0,
      videos: u.video_count ?? 0,
      avatar: u.avatar_url ?? null,
    })
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message ?? err.message })
  }
})

router.delete('/disconnect', (req, res) => {
  tokens.remove('tiktok')
  res.json({ ok: true })
})

module.exports = router
