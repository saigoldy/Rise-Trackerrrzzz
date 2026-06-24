import { useState } from 'react'
import { CheckCircle2, Circle, Flame, Calendar, Star, TrendingUp } from 'lucide-react'
import { dailySlate, streakData, calendarHeatData, weeklyReport } from '../data/mockData'

const heatColor = (v: number) => {
  if (v === 0) return '#1A1A27'
  if (v === 1) return '#2D1A4A'
  if (v === 2) return '#4A1E6E'
  if (v === 3) return '#7C3AED'
  if (v === 4) return '#A855F7'
  return '#C084FC'
}

export default function Accountability() {
  const [slate, setSlate] = useState({ ...dailySlate })

  const slateItems = [
    { key: 'gym' as const, label: 'Gym Session', emoji: '💪', description: 'Daily physical training' },
    { key: 'salonDuty' as const, label: 'Salon Duty', emoji: '✂️', description: 'Appearance & grooming maintenance' },
    { key: 'study' as const, label: 'Study Block', emoji: '📚', description: 'Music theory, business, or language' },
    { key: 'contentPosted' as const, label: 'Content Posted', emoji: '🎬', description: 'At least 1 post on any platform' },
    { key: 'verseWritten' as const, label: 'Verse Written', emoji: '✍️', description: 'Original lyrics or song section' },
  ]

  const doneCount = Object.values(slate).filter(Boolean).length

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 1380 }}>

      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Accountability</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>Daily discipline drives platform growth</p>
      </div>

      {/* Streak + Slate row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Streak stats */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Streak Tracker</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {[
              { icon: Flame, label: 'Current Streak', value: streakData.current, unit: 'days', color: '#F97316' },
              { icon: Star, label: 'Longest Streak', value: streakData.longest, unit: 'days', color: '#F5A623' },
              { icon: Calendar, label: 'This Month', value: streakData.thisMonth, unit: 'days', color: '#8B5CF6' },
              { icon: TrendingUp, label: 'Total Days', value: streakData.totalDays, unit: 'days', color: '#1DB954' },
            ].map(({ icon: Icon, label, value, unit, color }) => (
              <div key={label} style={{
                background: `${color}10`, border: `1px solid ${color}22`,
                borderRadius: 10, padding: '16px 14px', textAlign: 'center',
              }}>
                <Icon size={18} color={color} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{unit}</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Slate */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Today's Slate</div>
            <div style={{
              fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              background: doneCount >= 4 ? 'rgba(29,185,84,0.12)' : doneCount >= 2 ? 'rgba(245,166,35,0.12)' : 'rgba(239,68,68,0.12)',
              color: doneCount >= 4 ? '#1DB954' : doneCount >= 2 ? '#F5A623' : '#EF4444',
              border: `1px solid ${doneCount >= 4 ? 'rgba(29,185,84,0.25)' : doneCount >= 2 ? 'rgba(245,166,35,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
              {doneCount}/5 done
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {slateItems.map(item => {
              const done = slate[item.key]
              return (
                <button
                  key={item.key}
                  onClick={() => setSlate(s => ({ ...s, [item.key]: !s[item.key] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9,
                    background: done ? 'rgba(29,185,84,0.07)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${done ? 'rgba(29,185,84,0.22)' : '#22223A'}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  {done
                    ? <CheckCircle2 size={16} color="#1DB954" />
                    : <Circle size={16} color="#475569" />
                  }
                  <span style={{ fontSize: 14 }}>{item.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13.5, color: done ? '#F1F5F9' : '#94A3B8', fontWeight: done ? 600 : 400 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#475569' }}>{item.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Calendar heatmap */}
      <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>30-Day Accountability Heatmap</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748B' }}>
            <span>Less</span>
            {[0, 1, 2, 3, 4, 5].map(v => (
              <div key={v} style={{ width: 12, height: 12, borderRadius: 3, background: heatColor(v) }} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {calendarHeatData.map((d, i) => (
            <div key={i} title={`${d.date}: ${d.value}/5 tasks`} style={{
              aspectRatio: '1', borderRadius: 5, background: heatColor(d.value),
              cursor: 'default', position: 'relative',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', position: 'absolute', top: 3, left: 4 }}>
                {d.date.split('/')[1]}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 12, color: '#64748B' }}>
          <span>0 = no tasks · 1–2 = partial · 3–4 = good · 5 = perfect day</span>
        </div>
      </div>

      {/* Weekly Report Card */}
      <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Weekly Report Card</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{weeklyReport.week}</div>
          </div>
          <div style={{
            fontSize: 22, fontWeight: 800, color: '#F5A623',
            background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)',
            padding: '6px 16px', borderRadius: 9,
          }}>
            {weeklyReport.slateScore}%
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          {[
            { label: 'Posts Published', value: weeklyReport.postsPublished, color: '#8B5CF6' },
            { label: 'Total Reach', value: weeklyReport.totalReach.toLocaleString(), color: '#3B82F6' },
            { label: 'Avg Engagement', value: `${weeklyReport.avgEngagement}%`, color: '#1DB954' },
            { label: 'Top Platform', value: weeklyReport.topPlatform, color: '#FF0050' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#0D0D14', border: '1px solid #22223A', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 10 }}>Highlights</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {weeklyReport.highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F5A623', marginTop: 6, flexShrink: 0 }} />
              {h}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
