import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Link2, Unlink, AlertCircle, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Credentials { [key: string]: string }

const PLATFORM_META: Record<string, {
  label: string
  color: string
  oAuth: boolean
  portalLabel: string
  portalUrl: string
  fields: Array<{ key: string; label: string; placeholder: string; secret?: boolean }>
}> = {
  youtube: {
    label: 'YouTube', color: '#FF0000', oAuth: false,
    portalLabel: 'console.cloud.google.com → APIs → YouTube Data API v3',
    portalUrl: 'https://console.cloud.google.com',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'AIzaSy…', secret: true },
      { key: 'channel_id', label: 'Channel ID', placeholder: 'UCxxxxxx' },
    ],
  },
  spotify: {
    label: 'Spotify', color: '#1DB954', oAuth: false,
    portalLabel: 'developer.spotify.com → Create App',
    portalUrl: 'https://developer.spotify.com/dashboard',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'from Spotify dashboard' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '32-char hex', secret: true },
      { key: 'artist_id', label: 'Artist ID', placeholder: 'from open.spotify.com/artist/…' },
    ],
  },
  audiomack: {
    label: 'Audiomack', color: '#FF6B00', oAuth: false,
    portalLabel: 'audiomack.com/oauth-clients',
    portalUrl: 'https://audiomack.com/oauth-clients',
    fields: [
      { key: 'consumer_key', label: 'Consumer Key', placeholder: 'from Audiomack OAuth clients' },
      { key: 'consumer_secret', label: 'Consumer Secret', placeholder: '…', secret: true },
      { key: 'slug', label: 'Profile Slug', placeholder: 'your-audiomack-slug' },
    ],
  },
  instagram: {
    label: 'Instagram', color: '#E1306C', oAuth: true,
    portalLabel: 'developers.facebook.com → Instagram Basic Display',
    portalUrl: 'https://developers.facebook.com',
    fields: [
      { key: 'app_id', label: 'App ID', placeholder: 'from Meta for Developers' },
      { key: 'app_secret', label: 'App Secret', placeholder: '…', secret: true },
    ],
  },
  tiktok: {
    label: 'TikTok', color: '#FF0050', oAuth: true,
    portalLabel: 'developers.tiktok.com → Manage Apps',
    portalUrl: 'https://developers.tiktok.com',
    fields: [
      { key: 'client_key', label: 'Client Key', placeholder: 'from TikTok developers' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '…', secret: true },
    ],
  },
}

const PLATFORMS = ['youtube', 'spotify', 'audiomack', 'instagram', 'tiktok']

function isCredentialsComplete(platform: string, creds: Credentials): boolean {
  const meta = PLATFORM_META[platform]
  if (meta.oAuth) return !!creds.access_token
  return meta.fields.every(f => !!creds[f.key])
}

function hasOAuthPrereqs(platform: string, creds: Credentials): boolean {
  const meta = PLATFORM_META[platform]
  if (!meta.oAuth) return false
  return meta.fields.every(f => !!creds[f.key])
}

function identifierLabel(platform: string, creds: Credentials): string {
  if (platform === 'youtube') return creds.channel_id ?? ''
  if (platform === 'spotify') return creds.artist_id ?? ''
  if (platform === 'audiomack') return creds.slug ?? ''
  if (platform === 'instagram') return `user ${creds.user_id ?? ''}`
  if (platform === 'tiktok') return `open_id ${creds.open_id ?? ''}`
  return ''
}

export default function Connections() {
  const { user, session } = useAuth()
  const [connections, setConnections] = useState<Record<string, Credentials>>({})
  const [loading, setLoading] = useState(true)
  const [inputs, setInputs] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('platform_connections')
      .select('platform, credentials')
      .eq('user_id', user.id)
    const map: Record<string, Credentials> = {}
    PLATFORMS.forEach(p => {
      const row = (data ?? []).find(r => r.platform === p)
      map[p] = row?.credentials ?? {}
    })
    setConnections(map)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected')) { window.history.replaceState({}, '', '/connections'); load() }
  }, [load])

  const saveCredentials = async (platform: string) => {
    const fields = PLATFORM_META[platform].fields
    const newCreds = inputs[platform] ?? {}
    if (fields.some(f => !newCreds[f.key]?.trim())) {
      setErrors(e => ({ ...e, [platform]: 'All fields are required' }))
      return
    }
    setSaving(s => ({ ...s, [platform]: true }))
    setErrors(e => ({ ...e, [platform]: '' }))

    const merged = { ...connections[platform], ...Object.fromEntries(fields.map(f => [f.key, newCreds[f.key].trim()])) }
    const { error } = await supabase.from('platform_connections').upsert({
      user_id: user!.id, platform, credentials: merged, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    if (error) setErrors(e => ({ ...e, [platform]: error.message }))
    else { setInputs(i => ({ ...i, [platform]: {} })); setEditing(ed => ({ ...ed, [platform]: false })); await load() }
    setSaving(s => ({ ...s, [platform]: false }))
  }

  const disconnect = async (platform: string) => {
    await supabase.from('platform_connections').delete().eq('user_id', user!.id).eq('platform', platform)
    await load()
  }

  const connectOAuth = (platform: string) => {
    if (!session) return
    window.location.href = `/api/${platform}/auth?token=${session.access_token}`
  }

  if (loading) return <div style={{ padding: 40, color: '#F1F5F9' }}>Loading…</div>

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 800 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Connections</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>
          Connect your accounts. Each platform needs your own developer app credentials.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PLATFORMS.map(platform => {
          const meta = PLATFORM_META[platform]
          const creds = connections[platform] ?? {}
          const complete = isCredentialsComplete(platform, creds)
          const hasPrereqs = hasOAuthPrereqs(platform, creds)
          // OAuth platforms: show form until app_id/app_secret saved; then show OAuth button
          // Non-OAuth platforms: show form until all fields saved
          const showCredentialForm = editing[platform] || (meta.oAuth ? !hasPrereqs : !complete)
          const showOAuthButton = meta.oAuth && !complete && hasPrereqs && !editing[platform]

          return (
            <div key={platform} style={{
              background: '#1A1A27',
              border: `1px solid ${complete ? meta.color + '44' : '#22223A'}`,
              borderRadius: 12, padding: '20px 22px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                  {complete && <CheckCircle2 size={14} color="#1DB954" />}
                </div>
                {complete && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditing(ed => ({ ...ed, [platform]: !ed[platform] }))}
                      style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: '1px solid #22223A', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => disconnect(platform)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>
                      <Unlink size={12} /> Disconnect
                    </button>
                  </div>
                )}
              </div>

              {/* Connected summary */}
              {complete && !showCredentialForm && (
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Connected{identifierLabel(platform, creds) ? ` — ${identifierLabel(platform, creds)}` : ' via OAuth'}
                </div>
              )}

              {/* Credential form */}
              {showCredentialForm && (
                <div>
                  <a href={meta.portalUrl} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#64748B', marginBottom: 12, textDecoration: 'none' }}>
                    <ExternalLink size={11} /> {meta.portalLabel}
                  </a>
                  {meta.fields.map(field => (
                    <div key={field.key} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 4 }}>{field.label}</label>
                      <input
                        type={field.secret ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        value={inputs[platform]?.[field.key] ?? creds[field.key] ?? ''}
                        onChange={e => setInputs(i => ({ ...i, [platform]: { ...i[platform], [field.key]: e.target.value } }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: '#0D0D14', border: '1px solid #22223A', color: '#F1F5F9', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <button onClick={() => saveCredentials(platform)} disabled={saving[platform]}
                    style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, cursor: 'pointer', marginTop: 4 }}>
                    {saving[platform] ? 'Saving…' : 'Save Credentials'}
                  </button>
                </div>
              )}

              {/* OAuth button — shown after app credentials saved, before OAuth done */}
              {showOAuthButton && (
                <button onClick={() => connectOAuth(platform)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, marginTop: 8 }}>
                  <Link2 size={13} /> Connect {meta.label} Account
                </button>
              )}

              {errors[platform] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#EF4444' }}>
                  <AlertCircle size={12} /> {errors[platform]}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
