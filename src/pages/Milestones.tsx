import { Lock, CheckCircle2, Trophy } from 'lucide-react'
import { milestonePhases, badges } from '../data/mockData'

const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)

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

export default function Milestones() {
  const weeklyGrowths = { tiktok: 12, youtube: 5, spotify: 45, instagram: 28 }

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 1380 }}>

      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Milestones</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>Track your growth journey phase by phase</p>
      </div>

      {/* Phase cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
        {milestonePhases.map(phase => {
          const overallPct = Math.round(
            phase.targets.reduce((sum, t) => sum + Math.min(t.current / t.target, 1), 0) / phase.targets.length * 100
          )

          return (
            <div key={phase.phase} style={{
              background: '#1A1A27',
              border: `1px solid ${phase.unlocked ? '#22223A' : '#22223A'}`,
              borderRadius: 14, padding: '24px',
              opacity: phase.unlocked ? 1 : 0.65,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: phase.unlocked ? 'linear-gradient(135deg, #F5A623, #E8911A)' : '#22223A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {phase.unlocked
                      ? <Trophy size={20} color="#000" />
                      : <Lock size={18} color="#475569" />
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: phase.unlocked ? '#F5A623' : '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
                      Phase {phase.phase}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9' }}>{phase.name}</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{phase.description}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: phase.unlocked ? '#F5A623' : '#475569' }}>
                    {overallPct}%
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>overall</div>
                </div>
              </div>

              {/* Overall progress bar */}
              <div style={{ marginBottom: 20, height: 8, background: '#22223A', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: phase.unlocked ? 'linear-gradient(90deg, #F5A623, #8B5CF6)' : '#22223A',
                  width: `${overallPct}%`,
                  boxShadow: phase.unlocked ? '0 0 10px rgba(245,166,35,0.4)' : 'none',
                }} />
              </div>

              {/* Individual platform targets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {phase.targets.map(t => (
                  <div key={t.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
                        <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{t.label}</span>
                      </div>
                      {t.current >= t.target && <CheckCircle2 size={13} color="#1DB954" />}
                    </div>
                    <ProgressBar current={t.current} target={t.target} color={t.color} />
                    {phase.unlocked && t.current < t.target && (
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
          {badges.map(badge => (
            <div key={badge.id} style={{
              background: badge.earned ? 'rgba(245,166,35,0.06)' : '#0D0D14',
              border: `1px solid ${badge.earned ? 'rgba(245,166,35,0.2)' : '#22223A'}`,
              borderRadius: 10, padding: '14px 16px',
              opacity: badge.earned ? 1 : 0.5,
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{badge.icon}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: badge.earned ? '#F1F5F9' : '#64748B', marginBottom: 4 }}>
                {badge.name}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.5 }}>{badge.description}</div>
              {badge.earned && badge.date && (
                <div style={{ fontSize: 11, color: '#F5A623', marginTop: 8, fontWeight: 500 }}>
                  ✓ Earned {badge.date}
                </div>
              )}
              {!badge.earned && (
                <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>Not yet earned</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
