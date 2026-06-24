import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { DollarSign, TrendingUp } from 'lucide-react'
import { revenueByPlatform, monthlyRevenue, streamRates } from '../data/mockData'

const totalMonthly = revenueByPlatform.reduce((s, p) => s + p.monthly, 0)

const projections = [
  { streams: '10K streams/mo', spotify: '$40', audiomack: '$4', note: 'Early traction' },
  { streams: '50K streams/mo', spotify: '$200', audiomack: '$20', note: 'Regional presence' },
  { streams: '250K streams/mo', spotify: '$1,000', audiomack: '$100', note: 'Pan-African reach' },
  { streams: '1M streams/mo', spotify: '$4,000', audiomack: '$400', note: 'Mainstream tier' },
]

export default function Revenue() {
  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 1380 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Revenue</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>Streaming earnings & royalty tracker</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(29,185,84,0.1)', border: '1px solid rgba(29,185,84,0.25)',
          padding: '10px 18px', borderRadius: 10,
        }}>
          <DollarSign size={16} color="#1DB954" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1DB954' }}>${totalMonthly.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>This month</div>
          </div>
        </div>
      </div>

      {/* Platform cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {revenueByPlatform.map(p => (
          <div key={p.name} style={{
            background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: 16,
            borderTop: `2px solid ${p.color}`,
          }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: p.color, marginBottom: 10, letterSpacing: 0.3 }}>
              {p.name}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9' }}>
              ${p.monthly.toFixed(2)}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>This month</div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #22223A', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                {p.units.toLocaleString()} {p.unitLabel}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748B' }}>
                ${p.perUnit}/unit
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Pie row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 16 }}>

        {/* Monthly trend */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Monthly Revenue Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1DB954" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1DB954" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#22223A" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#111118', border: '1px solid #22223A', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#F1F5F9', fontWeight: 600 }}
                formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Total']}
              />
              <Area type="monotone" dataKey="total" name="Total" stroke="#1DB954" strokeWidth={2} fill="url(#revGrad)" dot={{ fill: '#1DB954', strokeWidth: 2, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: 'rgba(29,185,84,0.07)', borderRadius: 8 }}>
            <TrendingUp size={14} color="#1DB954" />
            <span style={{ fontSize: 12.5, color: '#94A3B8' }}>
              +$0.96 increase this month · <span style={{ color: '#1DB954' }}>+22.9% MoM</span>
            </span>
          </div>
        </div>

        {/* Pie chart */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Revenue Split</div>
          <PieChart width={220} height={180}>
            <Pie
              data={revenueByPlatform}
              cx={110} cy={85}
              innerRadius={50}
              outerRadius={80}
              dataKey="monthly"
              nameKey="name"
            >
              {revenueByPlatform.map(p => (
                <Cell key={p.name} fill={p.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#111118', border: '1px solid #22223A', borderRadius: 8, fontSize: 12 }}
              formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name]}
            />
          </PieChart>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
            {revenueByPlatform.map(p => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                  <span style={{ color: '#94A3B8' }}>{p.name}</span>
                </div>
                <span style={{ color: '#F1F5F9', fontWeight: 600 }}>${p.monthly.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rates + Projections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Per-stream rates */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Per-Stream Rates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '8px 0', borderBottom: '1px solid #22223A', fontSize: 11, color: '#475569', fontWeight: 600 }}>
              <span>Platform</span>
              <span style={{ textAlign: 'right' }}>Per Stream</span>
            </div>
            {streamRates.map(r => (
              <div key={r.platform} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '11px 0', borderBottom: '1px solid #1A1A27', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                  <span style={{ color: '#F1F5F9' }}>{r.platform}</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#1DB954' }}>
                  {r.rate}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(245,166,35,0.06)', borderRadius: 8, fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
            Focus on Spotify and Apple Music streams — they pay 10–17× more than Audiomack per play.
          </div>
        </div>

        {/* Royalty projections */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Royalty Projections</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '8px 0', borderBottom: '1px solid #22223A', fontSize: 11, color: '#475569', fontWeight: 600 }}>
              <span>Scenario</span>
              <span style={{ textAlign: 'center' }}>Spotify</span>
              <span style={{ textAlign: 'center' }}>Audiomack</span>
              <span style={{ textAlign: 'right' }}>Note</span>
            </div>
            {projections.map(row => (
              <div key={row.streams} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '11px 0', borderBottom: '1px solid #1A1A27', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: '#94A3B8' }}>{row.streams}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1DB954', textAlign: 'center' }}>{row.spotify}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FF6B00', textAlign: 'center' }}>{row.audiomack}</span>
                <span style={{ fontSize: 11, color: '#475569', textAlign: 'right' }}>{row.note}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 11.5, color: '#475569', lineHeight: 1.6 }}>
            Projections based on industry average per-stream rates. Actual earnings vary by country, subscription tier, and distribution deal.
          </div>
        </div>
      </div>
    </div>
  )
}
