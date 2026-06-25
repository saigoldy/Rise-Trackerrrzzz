import { useState, useCallback, useEffect } from 'react'
import { CheckCircle2, Clock, XCircle, Music2, Copy, ChevronDown, ChevronUp, DollarSign, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const payoutHistory = [
  { id: 1, date: 'Feb 28, 2026', amount: 2.85, method: 'Bank Transfer', status: 'paid', period: 'Jan 2026' },
  { id: 2, date: 'Mar 31, 2026', amount: 3.40, method: 'Bank Transfer', status: 'paid', period: 'Feb 2026' },
  { id: 3, date: 'Apr 30, 2026', amount: 4.20, method: 'Bank Transfer', status: 'paid', period: 'Mar 2026' },
  { id: 4, date: 'May 31, 2026', amount: 5.16, method: 'Bank Transfer', status: 'pending', period: 'Apr 2026' },
]

const platformRates: Record<string, number> = {
  'Spotify': 0.004,
  'Apple Music': 0.007,
  'Audiomack': 0.0004,
  'YouTube Music': 0.001,
  'Boomplay': 0.0003,
  'Tidal': 0.0125,
  'Amazon Music': 0.004,
}
import { useAuth } from '../context/AuthContext'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Distribution {
  id: string
  track_id: string
  platform: string
  status: string
  streams: number
}

interface Track {
  id: string
  title: string
  type: string
  featuring: string | null
  release_date: string | null
  upc: string | null
  isrc: string | null
  genre: string | null
  track_distribution?: Distribution[]
}

type DistroStatus = 'live' | 'pending' | 'unavailable'

// ── Constants ──────────────────────────────────────────────────────────────────

const platformColors: Record<string, string> = {
  'Spotify':       '#1DB954',
  'Apple Music':   '#FC3C44',
  'Audiomack':     '#FF6B00',
  'YouTube Music': '#FF0000',
  'Boomplay':      '#E9326D',
  'Tidal':         '#00FFFF',
  'Amazon Music':  '#00A8E0',
}

const PLATFORMS = Object.keys(platformColors)

// ── helpers ──────────────────────────────────────────────────────────────────

function getDistributions(track: Track): Distribution[] {
  return track.track_distribution ?? []
}

function trackEarnings(track: Track) {
  return getDistributions(track).reduce((sum, d) => {
    const rate = platformRates[d.platform] ?? 0
    return sum + d.streams * rate
  }, 0)
}

function trackStreams(track: Track) {
  return getDistributions(track).reduce((s, d) => s + d.streams, 0)
}

function StatusDot({ status }: { status: DistroStatus }) {
  if (status === 'live')    return <CheckCircle2 size={14} color="#1DB954" />
  if (status === 'pending') return <Clock size={14} color="#F5A623" />
  return <XCircle size={14} color="#475569" />
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Releases() {
  const { user } = useAuth()
  const [tracks, setTracks] = useState<Track[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '',
    type: 'single',
    featuring: '',
    release_date: '',
    genre: '',
  })

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('tracks')
      .select('*, track_distribution(*)')
      .eq('user_id', user.id)
      .order('release_date', { ascending: false })
    setTracks((data ?? []) as Track[])
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Derived totals ──────────────────────────────────────────────────────────

  const totalStreams  = tracks.reduce((s, t) => s + trackStreams(t), 0)
  const totalEarnings = tracks.reduce((s, t) => s + trackEarnings(t), 0)
  const pendingPayout = payoutHistory.find(p => p.status === 'pending')?.amount ?? 0

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const handleAdd = async () => {
    if (!form.title) return
    const { data } = await supabase.from('tracks').insert({
      user_id: user!.id,
      title: form.title,
      type: form.type,
      featuring: form.featuring || null,
      release_date: form.release_date || null,
      genre: form.genre || null,
    }).select().single()
    if (data && selectedPlatforms.length > 0) {
      await supabase.from('track_distribution').insert(
        selectedPlatforms.map(p => ({ track_id: data.id, platform: p, status: 'pending', streams: 0 }))
      )
    }
    setShowForm(false)
    setForm({ title: '', type: 'single', featuring: '', release_date: '', genre: '' })
    setSelectedPlatforms([])
    await load()
  }

  return (
    <div style={{ padding: '28px 28px 56px', color: '#F1F5F9', maxWidth: 1380 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Releases</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>
            {tracks.length} track{tracks.length !== 1 ? 's' : ''} distributed across platforms
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: '#8B5CF6', border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus size={14} /> Add Track
        </button>
      </div>

      {/* ── Add Track Form ── */}
      {showForm && (
        <div style={{
          background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12,
          padding: '20px 22px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>New Track</span>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[
              { key: 'title', label: 'Title *', placeholder: 'Track title' },
              { key: 'featuring', label: 'Featuring', placeholder: 'Artist name' },
              { key: 'genre', label: 'Genre', placeholder: 'e.g. Afropop' },
              { key: 'release_date', label: 'Release Date', placeholder: 'YYYY-MM-DD' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{label}</div>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#0D0D14', border: '1px solid #22223A', borderRadius: 6,
                    padding: '7px 10px', color: '#F1F5F9', fontSize: 13,
                  }}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>Type</div>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{
                  width: '100%', background: '#0D0D14', border: '1px solid #22223A',
                  borderRadius: 6, padding: '7px 10px', color: '#F1F5F9', fontSize: 13,
                }}
              >
                <option value="single">Single</option>
                <option value="collab">Collab</option>
                <option value="ep">EP</option>
                <option value="album">Album</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Distribute to Platforms</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedPlatforms.includes(p) ? platformColors[p] : '#22223A',
                    background: selectedPlatforms.includes(p) ? `${platformColors[p]}22` : '#0D0D14',
                    color: selectedPlatforms.includes(p) ? platformColors[p] : '#64748B',
                    fontWeight: selectedPlatforms.includes(p) ? 600 : 400,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            style={{
              padding: '8px 20px', borderRadius: 7, background: '#8B5CF6',
              border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600,
            }}
          >
            Save Track
          </button>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Tracks Released', value: tracks.length.toString(), sub: `${tracks.length} total`, color: '#8B5CF6' },
          { label: 'Total Streams', value: totalStreams.toLocaleString(), sub: 'all platforms', color: '#3B82F6' },
          { label: 'Total Earned', value: `$${totalEarnings.toFixed(2)}`, sub: 'lifetime', color: '#1DB954' },
          { label: 'Pending Payout', value: `$${pendingPayout.toFixed(2)}`, sub: 'Apr 2026', color: '#F5A623' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{
            background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '18px 20px',
            borderTop: `2px solid ${color}`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Track list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {tracks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569', fontSize: 14 }}>
            No tracks yet. Click "Add Track" to get started.
          </div>
        )}
        {tracks.map(track => {
          const dists   = getDistributions(track)
          const streams = trackStreams(track)
          const earned  = trackEarnings(track)
          const live    = dists.filter(d => d.status === 'live').length
          const pending = dists.filter(d => d.status === 'pending').length
          const isOpen  = expanded === track.id

          return (
            <div key={track.id} style={{
              background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, overflow: 'hidden',
            }}>
              {/* Track summary row */}
              <button
                onClick={() => setExpanded(isOpen ? null : track.id)}
                style={{
                  width: '100%', padding: '18px 22px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', color: '#F1F5F9',
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 120px 110px 110px 32px',
                  alignItems: 'center', gap: 16,
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'linear-gradient(135deg, #1A1A40, #2A1A40)',
                  border: '1px solid #22223A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Music2 size={14} color="#8B5CF6" />
                </div>

                {/* Title + meta */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{track.title}</span>
                    {track.featuring && (
                      <span style={{ fontSize: 11.5, color: '#FF0050', background: 'rgba(255,0,80,0.1)', padding: '1px 7px', borderRadius: 4, fontWeight: 600 }}>
                        ft. {track.featuring}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#475569', background: '#0D0D14', padding: '1px 7px', borderRadius: 4, border: '1px solid #22223A' }}>
                      {track.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                    {track.release_date
                      ? new Date(track.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'
                    }
                    {track.genre ? ` · ${track.genre}` : ''}
                  </div>
                </div>

                {/* Platform status pills */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#1DB954', background: 'rgba(29,185,84,0.1)', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                    {live} live
                  </span>
                  {pending > 0 && (
                    <span style={{ fontSize: 11, color: '#F5A623', background: 'rgba(245,166,35,0.1)', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                      {pending} pending
                    </span>
                  )}
                </div>

                {/* Streams */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{streams.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>streams</div>
                </div>

                {/* Earnings */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1DB954' }}>
                    ${earned.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>earned</div>
                </div>

                {/* Chevron */}
                <div style={{ display: 'flex', justifyContent: 'center', color: '#475569' }}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* ── Expanded detail panel ── */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #22223A', padding: '20px 22px', background: '#0D0D14' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

                    {/* Platform breakdown table */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' }}>
                        Platform Distribution
                      </div>
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', padding: '6px 0', borderBottom: '1px solid #22223A', fontSize: 11, color: '#475569', fontWeight: 600 }}>
                          <span>Platform</span>
                          <span style={{ textAlign: 'center' }}>Status</span>
                          <span style={{ textAlign: 'right' }}>Streams</span>
                          <span style={{ textAlign: 'right' }}>Earned</span>
                        </div>
                        {dists.map(d => {
                          const e = d.streams * (platformRates[d.platform] ?? 0)
                          const dotColor = platformColors[d.platform] ?? '#64748B'
                          return (
                            <div key={d.id} style={{
                              display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
                              padding: '9px 0', borderBottom: '1px solid #1A1A27', alignItems: 'center',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                                <span style={{ color: '#F1F5F9' }}>{d.platform}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                                <StatusDot status={d.status as DistroStatus} />
                                <span style={{ fontSize: 11, color: d.status === 'live' ? '#1DB954' : d.status === 'pending' ? '#F5A623' : '#475569' }}>
                                  {d.status}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right', fontSize: 13, color: d.streams > 0 ? '#F1F5F9' : '#475569', fontWeight: d.streams > 0 ? 600 : 400 }}>
                                {d.streams > 0 ? d.streams.toLocaleString() : '—'}
                              </div>
                              <div style={{ textAlign: 'right', fontSize: 13, color: e > 0 ? '#1DB954' : '#475569', fontWeight: e > 0 ? 600 : 400 }}>
                                {e > 0 ? `$${e.toFixed(3)}` : '—'}
                              </div>
                            </div>
                          )
                        })}
                        {dists.length === 0 && (
                          <div style={{ padding: '14px 0', fontSize: 13, color: '#475569' }}>
                            No distribution records yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Track identifiers */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
                        Identifiers
                      </div>
                      {[
                        { label: 'UPC', value: track.upc },
                        { label: 'ISRC', value: track.isrc },
                      ].map(({ label, value }) => (
                        <div key={label} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '9px 12px', borderRadius: 7, background: '#1A1A27',
                          border: '1px solid #22223A', marginBottom: 8,
                        }}>
                          <div>
                            <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 13, color: value ? '#F1F5F9' : '#475569', fontFamily: 'monospace', letterSpacing: 0.5 }}>
                              {value ?? '—'}
                            </div>
                          </div>
                          {value && (
                            <button
                              onClick={() => handleCopy(value, `${track.id}-${label}`)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
                            >
                              {copiedId === `${track.id}-${label}` ? <CheckCircle2 size={14} color="#1DB954" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Payout history ── */}
      <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <DollarSign size={16} color="#1DB954" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Payout History</span>
        </div>
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 90px',
            padding: '8px 0', borderBottom: '1px solid #22223A',
            fontSize: 11, color: '#475569', fontWeight: 600,
          }}>
            <span>Period</span>
            <span>Date</span>
            <span>Method</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
            <span style={{ textAlign: 'right' }}>Status</span>
          </div>
          {payoutHistory.map(p => (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 90px',
              padding: '12px 0', borderBottom: '1px solid #111118', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>{p.period}</span>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>{p.date}</span>
              <span style={{ fontSize: 13, color: '#64748B' }}>{p.method}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>${p.amount.toFixed(2)}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                {p.status === 'paid' ? (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1DB954', background: 'rgba(29,185,84,0.1)', padding: '3px 9px', borderRadius: 5 }}>
                    Paid
                  </span>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#F5A623', background: 'rgba(245,166,35,0.1)', padding: '3px 9px', borderRadius: 5 }}>
                    Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #22223A' }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>Lifetime payouts</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1DB954' }}>
            ${payoutHistory.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
