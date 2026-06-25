import { createHmac, randomBytes } from 'node:crypto'

// YouTube — creds: { api_key, channel_id }
export async function fetchYouTubeStats(creds) {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels')
  url.searchParams.set('part', 'statistics')
  url.searchParams.set('id', creds.channel_id)
  url.searchParams.set('key', creds.api_key)

  const r = await fetch(url.toString())
  if (!r.ok) throw new Error(`YouTube API error ${r.status}`)
  const d = await r.json()
  const ch = d.items?.[0]?.statistics
  if (!ch) throw new Error('Channel not found')
  return {
    subscribers: Number(ch.subscriberCount ?? 0),
    views: Number(ch.viewCount ?? 0),
    video_count: Number(ch.videoCount ?? 0),
  }
}

// Spotify — creds: { client_id, client_secret, artist_id }
export async function fetchSpotifyStats(creds) {
  const encoded = Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString('base64')
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Spotify token exchange failed')

  const r = await fetch(`https://api.spotify.com/v1/artists/${creds.artist_id}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  if (!r.ok) throw new Error(`Spotify API error ${r.status}`)
  const d = await r.json()
  return {
    followers: d.followers?.total ?? 0,
    popularity: d.popularity ?? 0,
    monthly_listeners: d.followers?.total ?? 0,
  }
}

// Instagram — creds: { app_id, app_secret, access_token, user_id }
export async function fetchInstagramStats(creds) {
  if (!creds.access_token) throw new Error('Instagram not connected via OAuth')
  const r = await fetch(
    `https://graph.instagram.com/me?fields=followers_count,media_count&access_token=${creds.access_token}`
  )
  if (!r.ok) throw new Error(`Instagram API error ${r.status}`)
  const d = await r.json()
  return {
    followers: d.followers_count ?? 0,
    media_count: d.media_count ?? 0,
  }
}

// TikTok — creds: { client_key, client_secret, access_token, open_id }
export async function fetchTikTokStats(creds) {
  if (!creds.access_token) throw new Error('TikTok not connected via OAuth')
  const r = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,video_count,like_count',
    { headers: { Authorization: `Bearer ${creds.access_token}`, 'Content-Type': 'application/json' } }
  )
  if (!r.ok) throw new Error(`TikTok API error ${r.status}`)
  const d = await r.json()
  const info = d.data?.user ?? {}
  return {
    followers: info.follower_count ?? 0,
    likes: info.like_count ?? 0,
    video_count: info.video_count ?? 0,
  }
}

// Audiomack — creds: { consumer_key, consumer_secret, slug }
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

export async function fetchAudiomackStats(creds) {
  const url = `https://api.audiomack.com/v1/artist/${creds.slug}`
  const auth = buildOAuth1Header('GET', url, creds.consumer_key, creds.consumer_secret)
  const r = await fetch(url, { headers: { Authorization: auth } })
  if (!r.ok) throw new Error(`Audiomack API error ${r.status}`)
  const d = await r.json()
  return {
    followers: d.results?.followers ?? 0,
    plays: d.results?.plays ?? 0,
    songs: d.results?.song_count ?? 0,
  }
}

// Dispatcher
export async function fetchStats(platform, creds) {
  switch (platform) {
    case 'youtube':   return fetchYouTubeStats(creds)
    case 'spotify':   return fetchSpotifyStats(creds)
    case 'instagram': return fetchInstagramStats(creds)
    case 'tiktok':    return fetchTikTokStats(creds)
    case 'audiomack': return fetchAudiomackStats(creds)
    default: throw new Error(`Unknown platform: ${platform}`)
  }
}
