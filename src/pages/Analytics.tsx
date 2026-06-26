import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useSnapshots } from '../hooks/useSnapshots'


const fanGeography = [
  { country: 'Uganda', flag: '🇺🇬', listeners: 5400, percentage: 42 },
  { country: 'Kenya', flag: '🇰🇪', listeners: 2600, percentage: 20 },
  { country: 'Tanzania', flag: '🇹🇿', listeners: 1800, percentage: 14 },
  { country: 'Nigeria', flag: '🇳🇬', listeners: 1300, percentage: 10 },
  { country: 'Rwanda', flag: '🇷🇼', listeners: 650, percentage: 5 },
  { country: 'USA', flag: '🇺🇸', listeners: 520, percentage: 4 },
  { country: 'UK', flag: '🇬🇧', listeners: 390, percentage: 3 },
  { country: 'Others', flag: '🌍', listeners: 260, percentage: 2 },
]

const contentTypePerformance = [
  { type: 'Freestyle', avgViews: 9800, engagement: 8.2, posts: 3 },
  { type: 'Cover', avgViews: 6150, engagement: 6.8, posts: 2 },
  { type: 'BTS', avgViews: 3650, engagement: 9.1, posts: 2 },
  { type: 'Original', avgViews: 4400, engagement: 7.4, posts: 1 },
  { type: 'Vocal Clip', avgViews: 5600, engagement: 7.8, posts: 1 },
  { type: 'Collab', avgViews: 6700, engagement: 8.5, posts: 1 },
]

type PlatformKey = 'tiktok' | 'youtube' | 'spotify' | 'audiomack' | 'instagram'

const platforms: { key: PlatformKey; label: string; color: string }[] = [
  { key: 'tiktok', label: 'TikTok', color: '#FF0050' },
  { key: 'youtube', label: 'YouTube', color: '#FF0000' },
  { key: 'spotify', label: 'Spotify', color: '#1DB954' },
  { key: 'audiomack', label: 'Audiomack', color: '#FF6B00' },
  { key: 'instagram', label: 'Instagram', color: '#E1306C' },
]

const metricLabels: Record<PlatformKey, string> = {
  tiktok: 'Followers',
  youtube: 'Subscribers',
  spotify: 'Monthly Listeners',
  audiomack: 'Plays',
  instagram: 'Followers',
}

export default function Analytics() {
  const { history } = useSnapshots()
  const [activePlatform, setActivePlatform] = useState<PlatformKey>('tiktok')
  const platform = platforms.find(p => p.key === activePlatform)!

  const trendData = (history[activePlatform] ?? [])
    .slice()
    .reverse()
    .map(snap => ({
      date: new Date(snap.fetched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: snap.metrics.followers ?? snap.metrics.subscribers ?? snap.metrics.plays ?? 0,
    }))

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 1380 }}>

      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Analytics</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>30-day performance overview</p>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {platforms.map(p => (
          <button
            key={p.key}
            onClick={() => setActivePlatform(p.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: `1px solid ${activePlatform === p.key ? p.color : '#22223A'}`,
              background: activePlatform === p.key ? `${p.color}18` : 'transparent',
              color: activePlatform === p.key ? p.color : '#64748B',
              transition: 'all 0.12s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 30-day chart */}
      <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {platform.label} — {metricLabels[activePlatform]} (30 days)
            </div>
            {trendData.length > 0 && (
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                Latest: <span style={{ color: platform.color, fontWeight: 600 }}>
                  {trendData[trendData.length - 1].value.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${activePlatform}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={platform.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={platform.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#22223A" />
            <XAxis
              dataKey="date"
              stroke="#475569"
              tick={{ fontSize: 10, fill: '#64748B' }}
              interval={4}
            />
            <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#64748B' }} />
            <Tooltip
              contentStyle={{ background: '#111118', border: '1px solid #22223A', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#F1F5F9', fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name={metricLabels[activePlatform]}
              stroke={platform.color}
              strokeWidth={2}
              fill={`url(#grad-${activePlatform})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: Geography + Content Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Fan Geography */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Fan Geography</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {fanGeography.map(g => (
              <div key={g.country}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span>{g.flag}</span>
                    <span style={{ color: '#F1F5F9' }}>{g.country}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {g.listeners.toLocaleString()} &nbsp;
                    <span style={{ color: '#94A3B8' }}>{g.percentage}%</span>
                  </div>
                </div>
                <div style={{ height: 5, background: '#22223A', borderRadius: 3 }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: `linear-gradient(90deg, #F5A623, #8B5CF6)`,
                    width: `${g.percentage}%`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Type Performance */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>
            Content Type Performance (Avg. Views)
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={contentTypePerformance} margin={{ top: 0, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22223A" />
              <XAxis dataKey="type" stroke="#475569" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{ background: '#111118', border: '1px solid #22223A', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#F1F5F9', fontWeight: 600 }}
                formatter={(v) => [Number(v).toLocaleString(), 'Avg Views']}
              />
              <Bar dataKey="avgViews" name="Avg Views" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {contentTypePerformance.map(c => (
              <div key={c.type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>{c.type}</span>
                <span style={{ color: '#94A3B8' }}>{c.engagement}% engagement · {c.posts} post{c.posts !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
