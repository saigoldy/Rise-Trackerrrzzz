import { useState, useEffect } from 'react'
import { AlertTriangle, Zap, Info, Minus, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLivePlatformMetrics } from '../hooks/useLiveData'
import type { PlatformMetric } from '../hooks/useLiveData'

const trendRadar = [
  { name: 'Amapiano-Afro Fusion', momentum: 94, region: 'East Africa', type: 'Sound' },
  { name: 'Bongo Flava Remix Wave', momentum: 87, region: 'Tanzania/Kenya', type: 'Style' },
  { name: 'Afrobeats Drill Crossover', momentum: 79, region: 'Pan-African', type: 'Genre' },
  { name: '#KampalaSoundChallenge', momentum: 73, region: 'Uganda', type: 'Challenge' },
  { name: 'Acoustic Afro (stripped)', momentum: 68, region: 'Diaspora', type: 'Style' },
  { name: 'Street Gospel Vibes', momentum: 61, region: 'Uganda/Rwanda', type: 'Genre' },
]

const collabRadar = [
  { name: 'B2C', country: 'Uganda', genre: 'Urban Afrobeats', followers: '420K', compatibility: 88 },
  { name: 'Feffe Bussi', country: 'Uganda', genre: 'Hip-Hop/Afro', followers: '280K', compatibility: 82 },
  { name: 'Eddy Kenzo', country: 'Uganda', genre: 'Afropop', followers: '850K', compatibility: 79 },
  { name: 'Harmonize', country: 'Tanzania', genre: 'Bongo Flava', followers: '4.2M', compatibility: 65 },
  { name: 'Khaligraph Jones', country: 'Kenya', genre: 'Afro-Hip-Hop', followers: '1.8M', compatibility: 58 },
]

type Urgency = 'urgent' | 'high' | 'medium' | 'low'

interface Suggestion {
  id: string
  urgency: Urgency
  platform: string
  title: string
}

function buildSuggestions(
  daysSinceLastContent: number,
  platformCount: number,
  slateToday: { contentPosted: boolean },
  platformMetrics: PlatformMetric[],
): Suggestion[] {
  const suggestions: Suggestion[] = []

  if (daysSinceLastContent > 3) suggestions.push({
    id: 'no-content', urgency: 'urgent', platform: 'All',
    title: `No content posted in ${daysSinceLastContent} days — post today to maintain momentum`,
  })

  if (!slateToday.contentPosted) suggestions.push({
    id: 'content-today', urgency: 'high', platform: 'Any',
    title: 'Content not marked as posted today — log a post to keep your streak',
  })

  if (platformCount < 3) suggestions.push({
    id: 'connect-more', urgency: 'medium', platform: 'Connections',
    title: `Only ${platformCount} platform${platformCount === 1 ? '' : 's'} connected — connect more to track full reach`,
  })

  const tiktok = platformMetrics.find(p => p.name === 'TikTok')
  if (tiktok && tiktok.primary.change < 0) suggestions.push({
    id: 'tiktok-drop', urgency: 'high', platform: 'TikTok',
    title: 'TikTok followers dropped this week — increase posting frequency',
  })

  if (suggestions.length === 0) suggestions.push({
    id: 'keep-going', urgency: 'low', platform: 'General',
    title: 'All systems green — keep posting consistently to grow',
  })

  return suggestions
}

const urgencyConfig: Record<Urgency, { color: string; icon: typeof AlertTriangle; label: string }> = {
  urgent: { color: '#EF4444', icon: AlertTriangle, label: 'Urgent' },
  high: { color: '#F97316', icon: Zap, label: 'High' },
  medium: { color: '#F5A623', icon: Info, label: 'Medium' },
  low: { color: '#3B82F6', icon: Minus, label: 'Low' },
}

const platformColors: Record<string, string> = {
  TikTok: '#FF0050',
  YouTube: '#FF0000',
  Instagram: '#E1306C',
  Spotify: '#1DB954',
  Audiomack: '#FF6B00',
}

type UrgencyFilter = Urgency | 'all'

export default function Suggestions() {
  const { user } = useAuth()
  const { metrics: platformMetrics, sync } = useLivePlatformMetrics()
  const [filter, setFilter] = useState<UrgencyFilter>('all')
  const [dismissed, setDismissed] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  useEffect(() => { sync() }, [sync])

  useEffect(() => {
    if (!user) return
    async function compute() {
      const [{ count: pc }, { data: posts }, slateRes] = await Promise.all([
        supabase.from('platform_connections').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('content_posts').select('date').eq('user_id', user!.id).order('date', { ascending: false }).limit(1),
        supabase.from('daily_slate').select('content_posted').eq('user_id', user!.id).eq('date', new Date().toISOString().split('T')[0]).maybeSingle(),
      ])

      const lastPost = posts?.[0]?.date
      const daysSince = lastPost
        ? Math.floor((Date.now() - new Date(lastPost).getTime()) / 86400000)
        : 999

      const slateToday = { contentPosted: slateRes.data?.content_posted ?? false }
      setSuggestions(buildSuggestions(daysSince, pc ?? 0, slateToday, platformMetrics))
    }
    compute()
  }, [user, platformMetrics])

  const visible = suggestions.filter(s =>
    (filter === 'all' || s.urgency === filter) && !dismissed.includes(s.id)
  )

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 1380 }}>

      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Suggestions</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>Smart recommendations based on your current metrics</p>
      </div>

      {/* Urgency filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'urgent', 'high', 'medium', 'low'] as UrgencyFilter[]).map(f => {
          const count = f === 'all' ? suggestions.filter(s => !dismissed.includes(s.id)).length
            : suggestions.filter(s => s.urgency === f && !dismissed.includes(s.id)).length
          const color = f === 'all' ? '#64748B' : urgencyConfig[f as Urgency].color
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: filter === f ? 600 : 400,
                cursor: 'pointer', border: `1px solid ${filter === f ? color : '#22223A'}`,
                background: filter === f ? `${color}18` : 'transparent',
                color: filter === f ? color : '#64748B',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{
                fontSize: 11, background: `${color}22`, color,
                padding: '1px 6px', borderRadius: 10, fontWeight: 700,
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Suggestion cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569', fontSize: 14 }}>
            No suggestions in this category. Keep it up!
          </div>
        )}
        {visible.map(s => {
          const { color, icon: Icon, label } = urgencyConfig[s.urgency]
          const platformColor = platformColors[s.platform] || '#64748B'
          return (
            <div key={s.id} style={{
              background: '#1A1A27', border: `1px solid ${color}28`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 12, padding: '20px 22px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 5,
                      background: `${color}15`, border: `1px solid ${color}30`,
                    }}>
                      <Icon size={11} color={color} />
                      <span style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                        {label}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: platformColor,
                      background: `${platformColor}14`, padding: '3px 9px', borderRadius: 5,
                      border: `1px solid ${platformColor}28`,
                    }}>
                      {s.platform}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>
                    {s.title}
                  </div>
                </div>
                <button
                  onClick={() => setDismissed(d => [...d, s.id])}
                  style={{
                    padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 400,
                    background: 'transparent', border: '1px solid #22223A',
                    color: '#475569', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trend Radar + Collab Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Trend Radar */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <TrendingUp size={16} color="#8B5CF6" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>East African Trend Radar</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trendRadar.map((t, i) => (
              <div key={t.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: '#F1F5F9' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                      {t.type} · {t.region}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 800,
                    color: t.momentum >= 80 ? '#EF4444' : t.momentum >= 65 ? '#F5A623' : '#8B5CF6',
                  }}>
                    {t.momentum}
                  </div>
                </div>
                <div style={{ height: 4, background: '#22223A', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', borderRadius: 2, width: `${t.momentum}%`,
                    background: t.momentum >= 80 ? '#EF4444' : t.momentum >= 65 ? '#F5A623' : '#8B5CF6',
                    opacity: 0.8,
                  }} />
                </div>
                {i < trendRadar.length - 1 && <div style={{ height: 1, background: '#22223A', marginTop: 10 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Collab Radar */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Users size={16} color="#1DB954" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Collaboration Radar</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {collabRadar.map(c => (
              <div key={c.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', borderRadius: 9,
                background: '#0D0D14', border: '1px solid #22223A',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {c.country} · {c.genre} · {c.followers} followers
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 800,
                    color: c.compatibility >= 80 ? '#1DB954' : c.compatibility >= 65 ? '#F5A623' : '#94A3B8',
                  }}>
                    {c.compatibility}%
                  </div>
                  <div style={{ fontSize: 10.5, color: '#475569' }}>match</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            Compatibility is based on genre overlap, audience demographics, and follower tier proximity.
          </div>
        </div>
      </div>
    </div>
  )
}
