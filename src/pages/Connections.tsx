import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { useConnectionStatus } from '../hooks/useLiveData'

const API = 'http://localhost:3001/api'

interface PlatformConfig {
  key: keyof ReturnType<typeof useConnectionStatus>['status']
  name: string
  color: string
  authType: 'apikey' | 'oauth'
  what: string[]
  note?: string
  setupSteps: string[]
  fields?: { env: string; label: string; placeholder: string; type?: string }[]
}

const platforms: PlatformConfig[] = [
  {
    key: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    authType: 'apikey',
    what: ['Subscriber count', 'Total & per-video views', 'Likes & comments per video'],
    setupSteps: [
      'Go to console.cloud.google.com',
      'Create a project → Enable "YouTube Data API v3"',
      'Credentials → Create API key → copy it',
      'Find your Channel ID: youtube.com/channel/CHANNEL_ID',
    ],
    fields: [
      { env: 'YOUTUBE_API_KEY', label: 'API Key', placeholder: 'AIzaSy...' },
      { env: 'YOUTUBE_CHANNEL_ID', label: 'Channel ID', placeholder: 'UCxxxxxx...' },
    ],
  },
  {
    key: 'spotify',
    name: 'Spotify',
    color: '#1DB954',
    authType: 'apikey',
    what: ['Artist follower count', 'Popularity score', 'Top tracks', 'Genre tags'],
    note: 'Monthly listener count & stream numbers are not available in the public API — Spotify keeps those locked in Spotify for Artists.',
    setupSteps: [
      'Go to developer.spotify.com → Log in → Create App',
      'Copy Client ID and Client Secret',
      'Find your Artist ID: open.spotify.com/artist/ARTIST_ID',
    ],
    fields: [
      { env: 'SPOTIFY_CLIENT_ID', label: 'Client ID', placeholder: 'a1b2c3...' },
      { env: 'SPOTIFY_CLIENT_SECRET', label: 'Client Secret', placeholder: 'x9y8z7...', type: 'password' },
      { env: 'SPOTIFY_ARTIST_ID', label: 'Artist ID', placeholder: '4Z8W4fT2...' },
    ],
  },
  {
    key: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    authType: 'oauth',
    what: ['Follower count', 'Post count', 'Recent media (likes & comments)'],
    note: 'Requires a Creator or Business Instagram account linked to a Facebook page.',
    setupSteps: [
      'Go to developers.facebook.com → My Apps → Create App',
      'Add "Instagram Basic Display" product',
      'Add your Instagram account as a test user',
      'Set redirect URI to: http://localhost:3001/api/instagram/callback',
      'Copy App ID and App Secret into server/.env',
    ],
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    color: '#FF0050',
    authType: 'oauth',
    what: ['Follower count', 'Total likes', 'Video count'],
    note: 'TikTok requires app review/approval before live data works. You can still connect a sandbox account for testing.',
    setupSteps: [
      'Go to developers.tiktok.com → Manage Apps → Create App',
      'Request access to "user.info.basic" and "video.list" scopes',
      'Set redirect URI to: http://localhost:3001/api/tiktok/callback',
      'Copy Client Key and Client Secret into server/.env',
    ],
  },
  {
    key: 'audiomack',
    name: 'Audiomack',
    color: '#FF6B00',
    authType: 'apikey',
    what: ['Plays count', 'Follower count', 'Song list with play counts'],
    setupSteps: [
      'Go to audiomack.com → Settings → Developer → OAuth Clients',
      'Create a new OAuth client to get Consumer Key & Secret',
      'Your Audiomack slug is the part after audiomack.com/ on your profile',
    ],
    fields: [
      { env: 'AUDIOMACK_CONSUMER_KEY', label: 'Consumer Key', placeholder: 'ak_...' },
      { env: 'AUDIOMACK_CONSUMER_SECRET', label: 'Consumer Secret', placeholder: 'as_...', type: 'password' },
      { env: 'AUDIOMACK_SLUG', label: 'Profile Slug', placeholder: 'jukatha' },
    ],
  },
]

function EnvInstructions({ fields }: { fields: NonNullable<PlatformConfig['fields']> }) {
  return (
    <div style={{ background: '#0A0A0F', border: '1px solid #22223A', borderRadius: 8, padding: '14px 16px', marginTop: 14 }}>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10, fontWeight: 600 }}>
        Add these to <code style={{ background: '#1A1A27', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>server/.env</code>
      </div>
      {fields.map(f => (
        <div key={f.env} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>{f.label}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#94A3B8', background: '#111118', padding: '6px 10px', borderRadius: 6, border: '1px solid #22223A' }}>
            <span style={{ color: '#8B5CF6' }}>{f.env}</span>=<span style={{ color: '#64748B' }}>{f.placeholder}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Connections() {
  const [searchParams] = useSearchParams()
  const { status, serverOnline, loading, refresh } = useConnectionStatus()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) { setToast({ msg: `${connected} connected successfully`, ok: true }); refresh() }
    if (error)     setToast({ msg: `Failed to connect ${error.replace(/_/g, ' ')}`, ok: false })
    if (connected || error) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [searchParams, refresh])

  const handleDisconnect = async (platform: string) => {
    await fetch(`${API}/disconnect/${platform}`, { method: 'DELETE', credentials: 'include' })
    refresh()
  }

  const connectedCount = Object.values(status).filter(Boolean).length

  return (
    <div style={{ padding: '28px 28px 56px', color: '#F1F5F9', maxWidth: 900 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 999,
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.ok ? 'rgba(29,185,84,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.ok ? 'rgba(29,185,84,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: toast.ok ? '#1DB954' : '#EF4444',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Connect Accounts</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>
            Link your social media platforms to pull live data
          </p>
        </div>
        <button onClick={refresh} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          borderRadius: 8, background: 'transparent', border: '1px solid #22223A',
          color: '#64748B', fontSize: 13, cursor: 'pointer',
        }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Server status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
        borderRadius: 10, marginBottom: 24,
        background: serverOnline ? 'rgba(29,185,84,0.07)' : 'rgba(239,68,68,0.07)',
        border: `1px solid ${serverOnline ? 'rgba(29,185,84,0.2)' : 'rgba(239,68,68,0.2)'}`,
      }}>
        {serverOnline
          ? <><Wifi size={15} color="#1DB954" /><span style={{ fontSize: 13, color: '#1DB954', fontWeight: 600 }}>Backend server is running</span><span style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>on port 3001 · {connectedCount}/5 platforms configured</span></>
          : <><WifiOff size={15} color="#EF4444" /><span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>Backend server is offline</span><span style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>{'— run '}<code style={{ background: '#1A1A27', padding: '1px 5px', borderRadius: 3 }}>npm run server</code>{' in a second terminal'}</span></>
        }
      </div>

      {/* Platform cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {platforms.map(p => {
          const connected = status[p.key]
          const open = expanded === p.key

          return (
            <div key={p.key} style={{
              background: '#1A1A27', border: `1px solid ${connected ? p.color + '30' : '#22223A'}`,
              borderRadius: 12, overflow: 'hidden',
              borderLeft: `3px solid ${connected ? p.color : '#22223A'}`,
            }}>
              {/* Summary row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: `${p.color}18`, border: `1px solid ${p.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: p.color }} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5,
                      padding: '2px 8px', borderRadius: 4,
                      background: connected ? 'rgba(29,185,84,0.1)' : 'rgba(100,116,139,0.1)',
                      color: connected ? '#1DB954' : '#64748B',
                      border: `1px solid ${connected ? 'rgba(29,185,84,0.25)' : '#22223A'}`,
                    }}>
                      {connected ? 'CONNECTED' : 'NOT CONNECTED'}
                    </span>
                    <span style={{ fontSize: 11, color: '#475569', background: '#0D0D14', padding: '2px 7px', borderRadius: 4, border: '1px solid #22223A' }}>
                      {p.authType === 'apikey' ? 'API Key' : 'OAuth'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                    {p.what.slice(0, 2).join(' · ')}
                    {p.what.length > 2 && ` · +${p.what.length - 2} more`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {connected && p.authType === 'oauth' && (
                    <button onClick={() => handleDisconnect(p.key)} style={{
                      padding: '7px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#EF4444', cursor: 'pointer',
                    }}>
                      Disconnect
                    </button>
                  )}
                  {p.authType === 'oauth' && !connected && (
                    <a href={`${API}/${p.key}/auth`} style={{
                      padding: '7px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                      background: `${p.color}14`, border: `1px solid ${p.color}30`,
                      color: p.color, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      Connect <ExternalLink size={11} />
                    </a>
                  )}
                  <button onClick={() => setExpanded(open ? null : p.key)} style={{
                    padding: '7px 14px', borderRadius: 7, fontSize: 12.5,
                    background: 'transparent', border: '1px solid #22223A',
                    color: '#64748B', cursor: 'pointer',
                  }}>
                    {open ? 'Hide' : 'Setup guide'}
                  </button>
                </div>
              </div>

              {/* Expanded setup guide */}
              {open && (
                <div style={{ borderTop: '1px solid #22223A', padding: '20px 22px', background: '#0D0D14' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                    {/* Steps */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' }}>
                        Setup Steps
                      </div>
                      <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {p.setupSteps.map((step, i) => (
                          <li key={i} style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>{step}</li>
                        ))}
                      </ol>
                      {p.note && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 14, padding: '10px 12px', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.18)', borderRadius: 8 }}>
                          <AlertTriangle size={13} color="#F5A623" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>{p.note}</span>
                        </div>
                      )}
                    </div>

                    {/* What you get + env vars */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' }}>
                        What you'll get
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                        {p.what.map(w => (
                          <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#94A3B8' }}>
                            <CheckCircle2 size={12} color={p.color} />
                            {w}
                          </div>
                        ))}
                      </div>

                      {p.fields && <EnvInstructions fields={p.fields} />}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 28, padding: '14px 18px', background: '#1A1A27', border: '1px solid #22223A', borderRadius: 10, fontSize: 12.5, color: '#64748B', lineHeight: 1.7 }}>
        <strong style={{ color: '#94A3B8' }}>How it works:</strong> API keys and OAuth tokens are stored in{' '}
        <code style={{ background: '#0D0D14', padding: '1px 5px', borderRadius: 3 }}>server/.env</code> and{' '}
        <code style={{ background: '#0D0D14', padding: '1px 5px', borderRadius: 3 }}>server/.tokens.json</code> on your machine only — nothing is sent anywhere else.
        The dashboard automatically syncs live data on load when the server is running.
      </div>
    </div>
  )
}
