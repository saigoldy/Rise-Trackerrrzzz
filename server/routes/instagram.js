const express = require('express')
const axios = require('axios')
const tokens = require('../lib/tokens')
const router = express.Router()

const REDIRECT = 'http://localhost:3001/api/instagram/callback'
const FRONTEND = 'http://localhost:5173'

// Step 1 — redirect user to Instagram OAuth
router.get('/auth', (req, res) => {
  const { INSTAGRAM_APP_ID } = process.env
  if (!INSTAGRAM_APP_ID)
    return res.status(400).json({ error: 'INSTAGRAM_APP_ID not set in .env' })

  const url = new URL('https://api.instagram.com/oauth/authorize')
  url.searchParams.set('client_id', INSTAGRAM_APP_ID)
  url.searchParams.set('redirect_uri', REDIRECT)
  url.searchParams.set('scope', 'user_profile,user_media')
  url.searchParams.set('response_type', 'code')
  res.redirect(url.toString())
})

// Step 2 — Instagram redirects back here with ?code=
router.get('/callback', async (req, res) => {
  const { code } = req.query
  const { INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET } = process.env
  if (!code) return res.redirect(`${FRONTEND}/connections?error=instagram_denied`)

  try {
    const params = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT,
      code,
    })
    const { data } = await axios.post('https://api.instagram.com/oauth/access_token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    tokens.set('instagram', { access_token: data.access_token, user_id: data.user_id })
    res.redirect(`${FRONTEND}/connections?connected=instagram`)
  } catch (err) {
    console.error('Instagram callback error:', err.response?.data ?? err.message)
    res.redirect(`${FRONTEND}/connections?error=instagram`)
  }
})

// Fetch live stats
router.get('/stats', async (req, res) => {
  const t = tokens.get('instagram')
  if (!t) return res.status(401).json({ error: 'Instagram not connected' })

  try {
    const profile = await axios.get('https://graph.instagram.com/me', {
      params: { fields: 'id,username,followers_count,media_count', access_token: t.access_token },
    })
    const media = await axios.get('https://graph.instagram.com/me/media', {
      params: { fields: 'id,caption,media_type,timestamp,like_count,comments_count', access_token: t.access_token, limit: 12 },
    })
    res.json({
      username: profile.data.username,
      followers: profile.data.followers_count,
      mediaCount: profile.data.media_count,
      recentPosts: media.data.data ?? [],
    })
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message ?? err.message })
  }
})

router.delete('/disconnect', (req, res) => {
  tokens.remove('instagram')
  res.json({ ok: true })
})

module.exports = router
