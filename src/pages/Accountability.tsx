import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Flame, Calendar, Star, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const heatColor = (v: number) => {
  if (v === 0) return '#1A1A27'
  if (v === 1) return '#2D1A4A'
  if (v === 2) return '#4A1E6E'
  if (v === 3) return '#7C3AED'
  if (v === 4) return '#A855F7'
  return '#C084FC'
}

interface Slate {
  gym: boolean
  salonDuty: boolean
  study: boolean
  contentPosted: boolean
  verseWritten: boolean
}

const DEFAULT_SLATE: Slate = {
  gym: false, salonDuty: false, study: false, contentPosted: false, verseWritten: false,
}

function toDb(s: Slate) {
  return {
    gym: s.gym,
    salon_duty: s.salonDuty,
    study: s.study,
    content_posted: s.contentPosted,
    verse_written: s.verseWritten,
  }
}

function fromDb(row: Record<string, boolean>): Slate {
  return {
    gym: row.gym ?? false,
    salonDuty: row.salon_duty ?? false,
    study: row.study ?? false,
    contentPosted: row.content_posted ?? false,
    verseWritten: row.verse_written ?? false,
  }
}

interface HeatDay { date: string; value: number }
interface StreakData { current: number; longest: number; thisMonth: number; totalDays: number }

export default function Accountability() {
  const { user } = useAuth()
  const [slate, setSlate] = useState<Slate>(DEFAULT_SLATE)
  const [heatData, setHeatData] = useState<HeatDay[]>([])
  const [streakData, setStreakData] = useState<StreakData>({ current: 0, longest: 0, thisMonth: 0, totalDays: 0 })

  const today = new Date().toISOString().split('T')[0]

  const loadSlate = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('daily_slate')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()
    if (data) setSlate(fromDb(data))
  }, [user, today])

  const loadHistory = useCallback(async () => {
    if (!user) return
    const since = new Date()
    since.setDate(since.getDate() - 29)
    const { data } = await supabase
      .from('daily_slate')
      .select('date, gym, salon_duty, study, content_posted, verse_written')
      .eq('user_id', user.id)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: true })

    const days: HeatDay[] = []
    let current = 0, longest = 0, thisMonth = 0, totalDays = 0, run = 0
    const month = new Date().getMonth()

    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const row = (data ?? []).find(r => r.date === dateStr)
      const val = row
        ? [row.gym, row.salon_duty, row.study, row.content_posted, row.verse_written].filter(Boolean).length
        : 0
      days.push({ date: dateStr, value: val })

      if (val > 0) {
        totalDays++
        run++
        if (run > longest) longest = run
        if (d.getMonth() === month) thisMonth++
      } else {
        if (i === 0) current = 0
        run = 0
      }
      if (i === 0) current = run
    }

    setHeatData(days)
    setStreakData({ current, longest, thisMonth, totalDays })
  }, [user])

  useEffect(() => {
    loadSlate()
    loadHistory()
  }, [loadSlate, loadHistory])

  const toggle = async (key: keyof Slate) => {
    const next = { ...slate, [key]: !slate[key] }
    setSlate(next)
    await supabase.from('daily_slate').upsert(
      { user_id: user!.id, date: today, ...toDb(next) },
      { onConflict: 'user_id,date' }
    )
    await loadHistory()
  }

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
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Accountability</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>Daily discipline drives platform growth</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Streak stats */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Streak Tracker</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {[
              { icon: Flame, label: 'Current Streak', value: streakData.current, color: '#F97316' },
              { icon: Star, label: 'Longest Streak', value: streakData.longest, color: '#F5A623' },
              { icon: Calendar, label: 'This Month', value: streakData.thisMonth, color: '#8B5CF6' },
              { icon: TrendingUp, label: 'Total Days', value: streakData.totalDays, color: '#1DB954' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{ background: `${color}10`, border: `1px solid ${color}22`, borderRadius: 10, padding: '16px 14px', textAlign: 'center' }}>
                <Icon size={18} color={color} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>days</div>
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
                  onClick={() => toggle(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9,
                    background: done ? 'rgba(29,185,84,0.07)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${done ? 'rgba(29,185,84,0.22)' : '#22223A'}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  {done ? <CheckCircle2 size={16} color="#1DB954" /> : <Circle size={16} color="#475569" />}
                  <span style={{ fontSize: 14 }}>{item.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13.5, color: done ? '#F1F5F9' : '#94A3B8', fontWeight: done ? 600 : 400 }}>{item.label}</div>
                    <div style={{ fontSize: 11.5, color: '#475569' }}>{item.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Heatmap */}
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
          {heatData.map((d, i) => (
            <div key={i} title={`${d.date}: ${d.value}/5 tasks`} style={{
              aspectRatio: '1', borderRadius: 5, background: heatColor(d.value),
              border: '1px solid rgba(255,255,255,0.04)', position: 'relative',
            }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', position: 'absolute', top: 3, left: 4 }}>
                {d.date.split('-')[2]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
