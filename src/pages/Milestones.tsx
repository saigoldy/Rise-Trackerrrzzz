import { useState, useEffect, useCallback } from 'react'
import { Lock, CheckCircle2, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ─── Static phase metadata ────────────────────────────────────────────────────
const PHASE_META = [
  {
    phase: 1,
    name: 'East African Base',
    description: 'Build a solid local foundation — 5K on every major platform',
    targets: [
      { label: 'TikTok Followers', target: 5000, current: 850, color: '#FF0050' },
      { label: 'YouTube Subs', target: 5000, current: 320, color: '#FF0000' },
      { label: 'Spotify Listeners', target: 5000, current: 1200, color: '#1DB954' },
      { label: 'Instagram Followers', target: 5000, current: 1450, color: '#E1306C' },
    ],
  },
  {
    phase: 2,
    name: 'Regional Recognition',
    description: 'Expand reach to Kenya, Tanzania, Nigeria and diaspora markets',
    targets: [
      { label: 'TikTok Followers', target: 50000, current: 850, color: '#FF0050' },
      { label: 'YouTube Subs', target: 25000, current: 320, color: '#FF0000' },
      { label: 'Spotify Listeners', target: 30000, current: 1200, color: '#1DB954' },
      { label: 'Instagram Followers', target: 30000, current: 1450, color: '#E1306C' },
    ],
  },
  {
    phase: 3,
    name: 'Pan-African Rising',
    description: 'Establish a dominant Pan-African presence and break into global markets',
    targets: [
      { label: 'TikTok Followers', target: 500000, current: 850, color: '#FF0050' },
      { label: 'YouTube Subs', target: 100000, current: 320, color: '#FF0000' },
      { label: 'Spotify Listeners', target: 100000, current: 1200, color: '#1DB954' },
      { label: 'Instagram Followers', target: 100000, current: 1450, color: '#E1306C' },
    ],
  },
]

// ─── Static badge definitions ─────────────────────────────────────────────────
const BADGE_DEFS: Record<string, { name: string; icon: string; description: string }> = {
  connected: { name: 'Connected', icon: '🔗', description: 'Connected your first platform' },
  'multi-platform': { name: 'Multi-Platform', icon: '🌐', description: 'Connected 3 or more platforms' },
  'fully-wired': { name: 'Fully Wired', icon: '⚡', description: 'Connected all 5 platforms' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = Math.min((current / target) * 100, 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748B', marginBottom: 4 }}>
        <span style={{ color: '#94A3B8' }}>{current.toLocaleString()}</span>
        <span>/ {fmt(target)}</span>
      </div>
      <div style={{ height: 6, background: '#22223A', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3, background: color,
          width: `${pct}%`, boxShadow: `0 0 8px ${color}66`,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

function daysToTarget(current: number, target: number, weeklyGrowth: number) {
  if (current >= target) return 'Reached!'
  const weeks = (target - current) / weeklyGrowth
  if (weeks > 520) return '10+ years'
  if (weeks > 104) return `~${Math.round(weeks / 52)} years`
  if (weeks > 8) return `~${Math.round(weeks / 4.3)} months`
  return `~${Math.round(weeks)} weeks`
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MilestoneRow {
  phase: number
  unlocked: boolean
  badge_ids: string[]
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Milestones() {
  const { user } = useAuth()
  const [milestones, setMilestones] = useState<MilestoneRow[]>([])
  const [platformCount, setPlatformCount] = useState(0)

  const weeklyGrowths = { tiktok: 12, youtube: 5, spotify: 45, instagram: 28 }

  const load = useCallback(async () => {
    if (!user) return

    const [{ count: pc }, { data: ms }] = await Promise.all([
      supabase.from('platform_connections').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('milestones').select('*').eq('user_id', user.id).order('phase'),
    ])

    setPlatformCount(pc ?? 0)

    // Compute which phases unlock based on platform count
    const phase1 = (pc ?? 0) >= 1
    const phase2 = (pc ?? 0) >= 3
    const phase3 = (pc ?? 0) >= 5

    // Upsert milestone rows so DB stays in sync
    await supabase.from('milestones').upsert([
      { user_id: user.id, phase: 1, unlocked: phase1, badge_ids: phase1 ? ['connected'] : [] },
      { user_id: user.id, phase: 2, unlocked: phase2, badge_ids: phase2 ? ['connected', 'multi-platform'] : [] },
      { user_id: user.id, phase: 3, unlocked: phase3, badge_ids: phase3 ? ['connected', 'multi-platform', 'fully-wired'] : [] },
    ], { onConflict: 'user_id,phase' })

    setMilestones(ms ?? [])
  }, [user])

  useEffect(() => { load() }, [load])

  // Build a lookup from phase number to milestone row
  const milestoneByPhase = Object.fromEntries(milestones.map(m => [m.phase, m]))

  // Collect all earned badge ids across all milestone rows
  const earnedBadgeIds = new Set(milestones.flatMap(m => (m.unlocked ? m.badge_ids : [])))

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 1380 }}>

      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Milestones</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>Track your growth journey phase by phase</p>
      </div>

      {/* Platform connection status */}
      <div style={{ marginBottom: 20, fontSize: 13, color: '#64748B' }}>
        {platformCount === 0 && user
          ? 'Connect a platform to start unlocking milestones.'
          : user
          ? `${platformCount} platform${platformCount === 1 ? '' : 's'} connected`
          : null}
      </div>

      {/* Phase cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
        {PHASE_META.map(meta => {
          const row = milestoneByPhase[meta.phase]
          const unlocked = row?.unlocked ?? false

          const overallPct = Math.round(
            meta.targets.reduce((sum, t) => sum + Math.min(t.current / t.target, 1), 0) / meta.targets.length * 100
          )

          return (
            <div key={meta.phase} style={{
              background: '#1A1A27',
              border: `1px solid ${unlocked ? '#22223A' : '#22223A'}`,
              borderRadius: 14, padding: '24px',
              opacity: unlocked ? 1 : 0.65,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: unlocked ? 'linear-gradient(135deg, #F5A623, #E8911A)' : '#22223A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {unlocked
                      ? <Trophy size={20} color="#000" />
                      : <Lock size={18} color="#475569" />
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: unlocked ? '#F5A623' : '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
                      Phase {meta.phase}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9' }}>{meta.name}</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{meta.description}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: unlocked ? '#F5A623' : '#475569' }}>
                    {overallPct}%
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>overall</div>
                </div>
              </div>

              {/* Overall progress bar */}
              <div style={{ marginBottom: 20, height: 8, background: '#22223A', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: unlocked ? 'linear-gradient(90deg, #F5A623, #8B5CF6)' : '#22223A',
                  width: `${overallPct}%`,
                  boxShadow: unlocked ? '0 0 10px rgba(245,166,35,0.4)' : 'none',
                }} />
              </div>

              {/* Individual platform targets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {meta.targets.map(t => (
                  <div key={t.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
                        <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{t.label}</span>
                      </div>
                      {t.current >= t.target && <CheckCircle2 size={13} color="#1DB954" />}
                    </div>
                    <ProgressBar current={t.current} target={t.target} color={t.color} />
                    {unlocked && t.current < t.target && (
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>
                        ETA: {daysToTarget(
                          t.current, t.target,
                          weeklyGrowths[t.label.toLowerCase().split(' ')[0] as keyof typeof weeklyGrowths] || 10
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Achievement Badges */}
      <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '24px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Achievement Badges</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {Object.entries(BADGE_DEFS).map(([id, def]) => {
            const earned = earnedBadgeIds.has(id)
            return (
              <div key={id} style={{
                background: earned ? 'rgba(245,166,35,0.06)' : '#0D0D14',
                border: `1px solid ${earned ? 'rgba(245,166,35,0.2)' : '#22223A'}`,
                borderRadius: 10, padding: '14px 16px',
                opacity: earned ? 1 : 0.5,
              }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{def.icon}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: earned ? '#F1F5F9' : '#64748B', marginBottom: 4 }}>
                  {def.name}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.5 }}>{def.description}</div>
                {earned
                  ? <div style={{ fontSize: 11, color: '#F5A623', marginTop: 8, fontWeight: 500 }}>Earned</div>
                  : <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>Not yet earned</div>
                }
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
