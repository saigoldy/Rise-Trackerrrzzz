import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, ChevronRight, CheckCircle2, Circle, AlertTriangle, Zap, Info } from 'lucide-react'
import MomentumGauge from '../components/MomentumGauge'
import { platformMetrics, weeklyData, topSuggestions, dailySlate, momentumScore } from '../data/mockData'

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

const urgencyColor: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F97316',
  medium: '#F5A623',
  low: '#3B82F6',
}

export default function Dashboard() {
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const slateItems = [
    { key: 'gym', label: 'Gym Session', done: dailySlate.gym },
    { key: 'salon', label: 'Salon Duty', done: dailySlate.salonDuty },
    { key: 'study', label: 'Study Block', done: dailySlate.study },
    { key: 'content', label: 'Content Posted', done: dailySlate.contentPosted },
    { key: 'verse', label: 'Verse Written', done: dailySlate.verseWritten },
  ]
  const doneCount = slateItems.filter(s => s.done).length

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 1380 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#F1F5F9' }}>Dashboard</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>{today}</p>
        </div>
        <div style={{
          background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)',
          borderRadius: 8, padding: '7px 14px', fontSize: 12.5, color: '#F5A623', fontWeight: 600,
        }}>
          Week 16 of Plan
        </div>
      </div>

      {/* ── Row 1: Momentum + Daily Slate ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 16 }}>

        {/* Momentum card */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: 1.2, marginBottom: 12, textTransform: 'uppercase' }}>
            Momentum Score
          </div>
          <MomentumGauge score={momentumScore} size={155} />
          <p style={{ fontSize: 12, color: '#64748B', textAlign: 'center', margin: '10px 0 0', lineHeight: 1.6 }}>
            Post content today to push this score higher.
          </p>
        </div>

        {/* Daily Slate */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Today's Slate</span>
            <span style={{ fontSize: 12.5, color: doneCount === 5 ? '#1DB954' : '#64748B' }}>
              {doneCount}/5 complete
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {slateItems.map(item => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
                background: item.done ? 'rgba(29,185,84,0.07)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${item.done ? 'rgba(29,185,84,0.2)' : '#22223A'}`,
              }}>
                {item.done
                  ? <CheckCircle2 size={15} color="#1DB954" />
                  : <Circle size={15} color="#475569" />
                }
                <span style={{ fontSize: 13.5, color: item.done ? '#F1F5F9' : '#94A3B8', fontWeight: item.done ? 500 : 400 }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/accountability')} style={{
            marginTop: 14, width: '100%', padding: 9, borderRadius: 8,
            background: 'transparent', border: '1px solid #22223A',
            color: '#64748B', fontSize: 12.5, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            Manage in Accountability <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ── Row 2: Platform cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {platformMetrics.map(p => (
          <div key={p.name} style={{
            background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: 16,
            borderTop: `2px solid ${p.color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: p.color, letterSpacing: 0.3 }}>{p.name}</span>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}88` }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', lineHeight: 1 }}>
              {fmt(p.primary.value)}{p.secondary.isPercent && p.name === 'Instagram' ? '' : ''}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', margin: '3px 0 8px' }}>{p.primary.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
              {p.primary.change >= 0
                ? <TrendingUp size={11} color="#1DB954" />
                : <TrendingDown size={11} color="#EF4444" />
              }
              <span style={{ color: p.primary.change >= 0 ? '#1DB954' : '#EF4444' }}>
                {p.primary.change >= 0 ? '+' : ''}{p.primary.change}
              </span>
              <span style={{ color: '#475569' }}>/ wk</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #22223A' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>
                {p.secondary.isPercent ? `${p.secondary.value}%` : fmt(p.secondary.value)}
              </div>
              <div style={{ fontSize: 10.5, color: '#475569' }}>{p.secondary.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 3: Chart + Suggestions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

        {/* Growth chart */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>7-Day Follower Growth</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={weeklyData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22223A" />
              <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{ background: '#111118', border: '1px solid #22223A', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#F1F5F9', fontWeight: 600 }}
              />
              <Line type="monotone" dataKey="tiktok" name="TikTok" stroke="#FF0050" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="youtube" name="YouTube" stroke="#FF0000" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spotify" name="Spotify" stroke="#1DB954" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="audiomack" name="Audiomack" stroke="#FF6B00" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="instagram" name="Instagram" stroke="#E1306C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 12 }}>
            {[
              { name: 'TikTok', color: '#FF0050' },
              { name: 'YouTube', color: '#FF0000' },
              { name: 'Spotify', color: '#1DB954' },
              { name: 'Audiomack', color: '#FF6B00' },
              { name: 'Instagram', color: '#E1306C' },
            ].map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 2, background: p.color, borderRadius: 1 }} />
                <span style={{ fontSize: 11, color: '#64748B' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Suggestions */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Top Actions</span>
            <button onClick={() => navigate('/suggestions')} style={{
              fontSize: 12, color: '#F5A623', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: 0,
            }}>
              All <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topSuggestions.map(s => {
              const color = urgencyColor[s.urgency]
              return (
                <div key={s.id} style={{
                  padding: '12px 13px', borderRadius: 8,
                  background: `${color}10`,
                  border: `1px solid ${color}28`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    {s.urgency === 'urgent'
                      ? <AlertTriangle size={11} color={color} />
                      : s.urgency === 'high'
                      ? <Zap size={11} color={color} />
                      : <Info size={11} color={color} />
                    }
                    <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {s.urgency}
                    </span>
                    <span style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>{s.platform}</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#F1F5F9', lineHeight: 1.4 }}>
                    {s.title}
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => navigate('/suggestions')} style={{
            marginTop: 12, width: '100%', padding: 9, borderRadius: 8,
            background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)',
            color: '#F5A623', fontSize: 12.5, cursor: 'pointer', fontWeight: 600,
          }}>
            View All Suggestions
          </button>
        </div>
      </div>
    </div>
  )
}
