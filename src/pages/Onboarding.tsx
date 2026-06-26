import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Link2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const PLATFORM_META: Record<string, {
  label: string; color: string; oAuth: boolean
  fields: Array<{ key: string; label: string; placeholder: string; secret?: boolean; tip: string }>
}> = {
  youtube: {
    label: 'YouTube', color: '#FF0000', oAuth: false,
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'AIzaSy…', secret: true, tip: 'console.cloud.google.com → APIs → YouTube Data API v3' },
      { key: 'channel_id', label: 'Channel ID', placeholder: 'UCxxxxxx', tip: 'youtube.com/channel/YOUR_ID' },
    ],
  },
  spotify: {
    label: 'Spotify', color: '#1DB954', oAuth: false,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'from Spotify dashboard', tip: 'developer.spotify.com' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '32-char hex', secret: true, tip: 'developer.spotify.com' },
      { key: 'artist_id', label: 'Artist ID', placeholder: 'from open.spotify.com/artist/…', tip: 'Open your Spotify artist page — the ID is in the URL' },
    ],
  },
  audiomack: {
    label: 'Audiomack', color: '#FF6B00', oAuth: false,
    fields: [
      { key: 'consumer_key', label: 'Consumer Key', placeholder: 'from audiomack.com/oauth-clients', tip: 'audiomack.com/oauth-clients' },
      { key: 'consumer_secret', label: 'Consumer Secret', placeholder: '…', secret: true, tip: 'audiomack.com/oauth-clients' },
      { key: 'slug', label: 'Profile Slug', placeholder: 'your-slug', tip: 'Your Audiomack URL slug' },
    ],
  },
  instagram: {
    label: 'Instagram', color: '#E1306C', oAuth: true,
    fields: [
      { key: 'app_id', label: 'App ID', placeholder: 'from developers.facebook.com', tip: 'developers.facebook.com → Instagram Basic Display' },
      { key: 'app_secret', label: 'App Secret', placeholder: '…', secret: true, tip: 'developers.facebook.com' },
    ],
  },
  tiktok: {
    label: 'TikTok', color: '#FF0050', oAuth: true,
    fields: [
      { key: 'client_key', label: 'Client Key', placeholder: 'from developers.tiktok.com', tip: 'developers.tiktok.com → Manage Apps' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '…', secret: true, tip: 'developers.tiktok.com' },
    ],
  },
}

const PLATFORMS = ['youtube', 'spotify', 'audiomack', 'instagram', 'tiktok']

export default function Onboarding() {
  const { user, session, refreshOnboardingStatus } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState({ artist_name: '', location: '', genre: '' })
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [platformInputs, setPlatformInputs] = useState<Record<string, Record<string, string>>>({})
  const [savingPlatform, setSavingPlatform] = useState<Record<string, boolean>>({})
  const [savedPlatforms, setSavedPlatforms] = useState<Record<string, boolean>>({})
  const [finishing, setFinishing] = useState(false)

  const card = {
    background: '#1A1A27', border: '1px solid #22223A', borderRadius: 16,
    padding: '40px 36px', width: '100%', maxWidth: 520,
  }
  const input = {
    width: '100%', padding: '11px 14px', borderRadius: 9, fontSize: 14,
    background: '#0D0D14', border: '1px solid #22223A', color: '#F1F5F9',
    marginBottom: 14, boxSizing: 'border-box' as const,
  }

  const saveProfile = async () => {
    if (!profile.artist_name.trim()) { setProfileError('Artist name is required'); return }
    if (!user) return
    setSavingProfile(true)
    try {
      const { error } = await supabase.from('profiles')
        .update({ artist_name: profile.artist_name, location: profile.location, genre: profile.genre })
        .eq('id', user.id)
      if (error) { setProfileError(error.message); return }
      setStep(2)
    } finally {
      setSavingProfile(false)
    }
  }

  const savePlatform = async (platform: string) => {
    const fields = PLATFORM_META[platform].fields
    const vals = platformInputs[platform] ?? {}
    if (fields.some(f => !vals[f.key]?.trim())) return
    if (!user) return
    setSavingPlatform(s => ({ ...s, [platform]: true }))
    try {
      const { error } = await supabase.from('platform_connections').upsert({
        user_id: user.id, platform, credentials: Object.fromEntries(fields.map(f => [f.key, vals[f.key].trim()])),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform' })
      if (!error) setSavedPlatforms(s => ({ ...s, [platform]: true }))
    } finally {
      setSavingPlatform(s => ({ ...s, [platform]: false }))
    }
  }

  const connectOAuth = (platform: string) => {
    if (!session) return
    window.location.href = `/api/${platform}/auth?token=${session.access_token}`
  }

  const finish = async () => {
    setFinishing(true)
    const { error } = await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user!.id)
    if (error) { setFinishing(false); return }
    await refreshOnboardingStatus()
    navigate('/', { replace: true })
  }

  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700,
            background: step >= n ? 'linear-gradient(135deg, #F5A623, #E8911A)' : '#22223A',
            color: step >= n ? '#000' : '#64748B',
          }}>{n}</div>
          {n < 3 && <div style={{ width: 32, height: 1, background: step > n ? '#F5A623' : '#22223A' }} />}
        </div>
      ))}
      <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>
        {step === 1 ? 'Profile' : step === 2 ? 'Connect Platforms' : 'Done'}
      </span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={card}>
        <StepIndicator />

        {/* Step 1 — Profile */}
        {step === 1 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Set up your profile</h2>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: '#64748B' }}>Tell us about yourself to get started.</p>
            <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Artist Name *</label>
            <input style={input} placeholder="e.g. Risetrack" value={profile.artist_name} onChange={e => setProfile({ ...profile, artist_name: e.target.value })} />
            <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Location</label>
            <input style={input} placeholder="e.g. Kampala, Uganda" value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} />
            <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Genre</label>
            <input style={input} placeholder="e.g. Afrobeats" value={profile.genre} onChange={e => setProfile({ ...profile, genre: e.target.value })} />
            {profileError && <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{profileError}</div>}
            <button onClick={saveProfile} disabled={savingProfile} style={{ width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, #F5A623, #E8911A)', color: '#000', border: 'none', cursor: 'pointer' }}>
              {savingProfile ? 'Saving…' : 'Continue →'}
            </button>
          </>
        )}

        {/* Step 2 — Connect Platforms */}
        {step === 2 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Connect your platforms</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748B' }}>Add your developer app credentials. You can skip and do this later.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PLATFORMS.map(platform => {
                const meta = PLATFORM_META[platform]
                const saved = savedPlatforms[platform]
                const vals = platformInputs[platform] ?? {}
                const hasAll = meta.fields.every(f => !!vals[f.key]?.trim())
                return (
                  <div key={platform} style={{ background: '#0D0D14', border: `1px solid ${saved ? meta.color + '44' : '#22223A'}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: saved ? 0 : 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                      {saved && <CheckCircle2 size={13} color="#1DB954" />}
                    </div>
                    {!saved && (
                      <>
                        {meta.fields.map(field => (
                          <div key={field.key} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <label style={{ fontSize: 11, color: '#64748B' }}>{field.label}</label>
                              <span style={{ fontSize: 10, color: '#475569' }}>{field.tip}</span>
                            </div>
                            <input
                              type={field.secret ? 'password' : 'text'}
                              placeholder={field.placeholder}
                              value={vals[field.key] ?? ''}
                              onChange={e => setPlatformInputs(i => ({ ...i, [platform]: { ...i[platform], [field.key]: e.target.value } }))}
                              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12, background: '#1A1A27', border: '1px solid #22223A', color: '#F1F5F9', boxSizing: 'border-box' as const }}
                            />
                          </div>
                        ))}
                        {!meta.oAuth && (
                          <button onClick={() => savePlatform(platform)} disabled={!hasAll || savingPlatform[platform]}
                            style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, cursor: hasAll ? 'pointer' : 'not-allowed', opacity: hasAll ? 1 : 0.5 }}>
                            {savingPlatform[platform] ? 'Saving…' : 'Save'}
                          </button>
                        )}
                        {meta.oAuth && hasAll && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => savePlatform(platform)} disabled={savingPlatform[platform]}
                              style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, background: '#22223A', border: '1px solid #22223A', color: '#94A3B8', cursor: 'pointer' }}>
                              {savingPlatform[platform] ? 'Saving…' : 'Save Credentials'}
                            </button>
                            <button onClick={() => connectOAuth(platform)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, cursor: 'pointer' }}>
                              <Link2 size={11} /> Connect Account
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button onClick={() => setStep(3)} style={{ fontSize: 13, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>Skip for now →</button>
              <button onClick={() => setStep(3)} style={{ padding: '10px 22px', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, #F5A623, #E8911A)', color: '#000', border: 'none', cursor: 'pointer' }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>You're all set!</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748B' }}>
              {Object.keys(savedPlatforms).length > 0
                ? `Connected: ${Object.keys(savedPlatforms).join(', ')}. You can add more any time from the Connections page.`
                : 'No platforms connected yet — go to Connections any time to add your accounts.'}
            </p>
            <button onClick={finish} disabled={finishing}
              style={{ width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, #F5A623, #E8911A)', color: '#000', border: 'none', cursor: 'pointer' }}>
              {finishing ? 'Loading…' : 'Go to Dashboard →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
