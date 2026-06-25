import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Film, CheckSquare,
  DollarSign, Trophy, Lightbulb, Music, Disc3, Link2,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/analytics', label: 'Analytics', icon: TrendingUp, end: false },
  { to: '/content', label: 'Content', icon: Film, end: false },
  { to: '/releases', label: 'Releases', icon: Disc3, end: false },
  { to: '/accountability', label: 'Accountability', icon: CheckSquare, end: false },
  { to: '/revenue', label: 'Revenue', icon: DollarSign, end: false },
  { to: '/milestones', label: 'Milestones', icon: Trophy, end: false },
  { to: '/suggestions', label: 'Suggestions', icon: Lightbulb, end: false },
  { to: '/connections', label: 'Connections', icon: Link2, end: false },
]

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0F' }}>
      {/* Sidebar */}
      <aside style={{
        width: 228,
        background: '#0D0D14',
        borderRight: '1px solid #22223A',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #22223A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'linear-gradient(135deg, #F5A623 0%, #E8911A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Music size={16} color="#000" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#F1F5F9', letterSpacing: 0.3 }}>Risetrack</div>
              <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 0.5 }}>ARTIST DASHBOARD</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '10px 0', flex: 1, overflowY: 'auto' }}>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 20px',
                color: isActive ? '#F5A623' : '#64748B',
                background: isActive ? 'rgba(245, 166, 35, 0.08)' : 'transparent',
                borderRight: isActive ? '2px solid #F5A623' : '2px solid transparent',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 400,
                transition: 'color 0.12s, background 0.12s',
                letterSpacing: 0.1,
              })}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Artist footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #22223A' }}>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Artist</div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F1F5F9' }}>Artist</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Kampala, Uganda</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1DB954', boxShadow: '0 0 6px #1DB95488' }} />
            <span style={{ fontSize: 11.5, color: '#1DB954', fontWeight: 500 }}>Active</span>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main style={{ flex: 1, marginLeft: 228, minHeight: '100vh', overflowX: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  )
}
