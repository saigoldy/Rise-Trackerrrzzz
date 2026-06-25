import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Link2, Unlink, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface PlatformConnection {
  platform: string
  connected: boolean
  credentials: Record<string, string>
}

const PLATFORMS = ['youtube', 'spotify', 'audiomack', 'instagram', 'tiktok']

const PLATFORM_META: Record<string, { label: string; color: string; oAuth: boolean }> = {
  youtube:   { label: 'YouTube',   color: '#FF0000', oAuth: false },
  spotify:   { label: 'Spotify',   color: '#1DB954', oAuth: false },
  audiomack: { label: 'Audiomack', color: '#FF6B00', oAuth: false },
  instagram: { label: 'Instagram', color: '#E1306C', oAuth: true  },
  tiktok:    { label: 'TikTok',    color: '#FF0050', oAuth: true  },
}

const ID_FIELD: Record<string, { label: string; placeholder: string; key: string }> = {
  youtube:   { label: 'Channel ID',    placeholder: 'UCxxxxxx',   key: 'channel_id' },
  spotify:   { label: 'Artist ID',     placeholder: 'from open.spotify.com/artist/…', key: 'artist_id' },
  audiomack: { label: 'Profile Slug',  placeholder: 'your-slug',  key: 'slug' },
}

export default function Connections() {
  const { user, session } = useAuth()
  const [connections, setConnections] = useState<Record<string, PlatformConnection>>({})
  const [loading, setLoading] = useState(true)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('platform_connections')
      .select('platform, credentials')
      .eq('user_id', user.id)

    const map: Record<string, PlatformConnection> = {}
    PLATFORMS.forEach(p => {
      const row = (data ?? []).find(r => r.platform === p)
      map[p] = { platform: p, connected: !!row, credentials: row?.credentials ?? {} }
    })
    setConnections(map)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
    // Handle ?connected=platform redirect from OAuth callback
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    if (connected) {
      window.history.replaceState({}, '', '/connections')
      load()
    }
  }, [load])

  const saveSimple = async (platform: string) => {
    const field = ID_FIELD[platform]
    const value = inputs[platform]?.trim()
    if (!value) return
    setSaving(s => ({ ...s, [platform]: true }))
    setError(e => ({ ...e, [platform]: '' }))

    const { error: err } = await supabase.from('platform_connections').upsert({
      user_id: user!.id,
      platform,
      credentials: { [field.key]: value },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    if (err) setError(e => ({ ...e, [platform]: err.message }))
    else { setInputs(i => ({ ...i, [platform]: '' })); await load() }
    setSaving(s => ({ ...s, [platform]: false }))
  }

  const disconnect = async (platform: string) => {
    await supabase
      .from('platform_connections')
      .delete()
      .eq('user_id', user!.id)
      .eq('platform', platform)
    await load()
  }

  const connectOAuth = (platform: string) => {
    if (!session) return
    window.location.href = `/api/${platform}/auth?token=${session.access_token}`
  }

  if (loading) return <div style={{ padding: 40, color: '#F1F5F9' }}>Loading connections…</div>

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 800 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Connections</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>
          Connect your accounts to pull live stats into your dashboard.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PLATFORMS.map(platform => {
          const meta = PLATFORM_META[platform]
          const conn = connections[platform]
          const field = ID_FIELD[platform]

          return (
            <div key={platform} style={{
              background: '#1A1A27', border: `1px solid ${conn?.connected ? meta.color + '44' : '#22223A'}`,
              borderRadius: 12, padding: '20px 22px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: conn?.connected ? 0 : 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                  {conn?.connected && <CheckCircle2 size={14} color="#1DB954" />}
                </div>
                {conn?.connected && (
                  <button
                    onClick={() => disconnect(platform)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                      color: '#EF4444', background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7,
                      padding: '5px 12px', cursor: 'pointer',
                    }}
                  >
                    <Unlink size={12} /> Disconnect
                  </button>
                )}
              </div>

              {conn?.connected && (
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                  {field
                    ? `Connected: ${conn.credentials[field.key]}`
                    : 'Connected via OAuth'
                  }
                </div>
              )}

              {!conn?.connected && meta.oAuth && (
                <button
                  onClick={() => connectOAuth(platform)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
                    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: `${meta.color}18`, border: `1px solid ${meta.color}44`,
                    color: meta.color,
                  }}
                >
                  <Link2 size={13} /> Connect {meta.label}
                </button>
              )}

              {!conn?.connected && !meta.oAuth && field && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    placeholder={field.label + ' — ' + field.placeholder}
                    value={inputs[platform] ?? ''}
                    onChange={e => setInputs(i => ({ ...i, [platform]: e.target.value }))}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13,
                      background: '#0D0D14', border: '1px solid #22223A', color: '#F1F5F9',
                    }}
                  />
                  <button
                    onClick={() => saveSimple(platform)}
                    disabled={saving[platform]}
                    style={{
                      padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: `${meta.color}18`, border: `1px solid ${meta.color}44`,
                      color: meta.color, cursor: 'pointer',
                    }}
                  >
                    {saving[platform] ? 'Saving…' : 'Connect'}
                  </button>
                </div>
              )}

              {error[platform] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#EF4444' }}>
                  <AlertCircle size={12} /> {error[platform]}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={load}
        style={{
          marginTop: 20, display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <RefreshCw size={12} /> Refresh connections
      </button>
    </div>
  )
}
