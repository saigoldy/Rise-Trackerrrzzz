require('dotenv').config()
const express = require('express')
const cors = require('cors')
const session = require('express-session')
const tokens = require('./lib/tokens')

const youtube   = require('./routes/youtube')
const spotify   = require('./routes/spotify')
const instagram = require('./routes/instagram')
const tiktok    = require('./routes/tiktok')
const audiomack = require('./routes/audiomack')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
  secret: process.env.SESSION_SECRET || 'risetrack-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false },
}))

// ── Platform routes ───────────────────────────────────────────────────────────
app.use('/api/youtube',   youtube)
app.use('/api/spotify',   spotify)
app.use('/api/instagram', instagram)
app.use('/api/tiktok',    tiktok)
app.use('/api/audiomack', audiomack)

// ── Connection status summary ─────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    youtube:   !!(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID),
    spotify:   !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.SPOTIFY_ARTIST_ID),
    instagram: !!tokens.get('instagram'),
    tiktok:    !!tokens.get('tiktok'),
    audiomack: !!(process.env.AUDIOMACK_CONSUMER_KEY && process.env.AUDIOMACK_SLUG),
  })
})

// ── Disconnect any platform ───────────────────────────────────────────────────
app.delete('/api/disconnect/:platform', (req, res) => {
  tokens.remove(req.params.platform)
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`\n  Risetrack server → http://localhost:${PORT}\n`)
})
