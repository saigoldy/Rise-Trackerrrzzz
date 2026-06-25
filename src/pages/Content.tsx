import { useState, useEffect, useCallback } from 'react'
import { Eye, Heart, Share2, MessageCircle, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type ContentType = 'freestyle' | 'cover' | 'original' | 'bts' | 'vocal-clip' | 'collab'

interface ContentPost {
  id: string
  title: string
  type: ContentType
  platform: string
  date: string
  views: number
  likes: number
  shares: number
  comments: number
}

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

const typeColors: Record<ContentType, string> = {
  freestyle: '#8B5CF6',
  cover: '#3B82F6',
  original: '#F5A623',
  bts: '#1DB954',
  'vocal-clip': '#FF6B00',
  collab: '#E1306C',
}

const typeLabels: Record<ContentType, string> = {
  freestyle: 'Freestyle',
  cover: 'Cover',
  original: 'Original',
  bts: 'BTS',
  'vocal-clip': 'Vocal Clip',
  collab: 'Collab',
}

const platformColors: Record<string, string> = {
  TikTok: '#FF0050',
  YouTube: '#FF0000',
  Instagram: '#E1306C',
  Spotify: '#1DB954',
  Audiomack: '#FF6B00',
}

type Filter = ContentType | 'all'

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'freestyle', label: 'Freestyle' },
  { key: 'cover', label: 'Cover' },
  { key: 'original', label: 'Original' },
  { key: 'bts', label: 'BTS' },
  { key: 'vocal-clip', label: 'Vocal Clip' },
  { key: 'collab', label: 'Collab' },
]

export default function Content() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<Filter>('all')
  const [showForm, setShowForm] = useState(false)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [form, setForm] = useState({ title: '', type: 'freestyle' as ContentType, platform: 'TikTok', date: '', views: '', likes: '', shares: '', comments: '' })

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('content_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    setPosts((data ?? []) as ContentPost[])
  }, [user])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? posts : posts.filter(p => p.type === filter)

  const handleAdd = async () => {
    if (!form.title || !form.date) return
    await supabase.from('content_posts').insert({
      user_id: user!.id,
      title: form.title,
      type: form.type,
      platform: form.platform,
      date: form.date,
      views: Number(form.views) || 0,
      likes: Number(form.likes) || 0,
      shares: Number(form.shares) || 0,
      comments: Number(form.comments) || 0,
    })
    setForm({ title: '', type: 'freestyle', platform: 'TikTok', date: '', views: '', likes: '', shares: '', comments: '' })
    setShowForm(false)
    await load()
  }

  const inputStyle = {
    background: '#0D0D14', border: '1px solid #22223A', borderRadius: 7,
    padding: '8px 11px', color: '#F1F5F9', fontSize: 13, width: '100%',
  } as React.CSSProperties

  const selectStyle = { ...inputStyle }

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 1380 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Content</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>{posts.length} posts tracked</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 18px', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
          background: 'linear-gradient(135deg, #F5A623, #E8911A)',
          color: '#000', border: 'none', cursor: 'pointer',
        }}>
          <Plus size={15} /> Add Content
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{
          background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12,
          padding: '22px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Log New Content</span>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Title</label>
              <input
                style={inputStyle}
                placeholder="e.g. Freestyle Friday #4"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Type</label>
              <select style={selectStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ContentType })}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Platform</label>
              <select style={selectStyle} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                {['TikTok', 'YouTube', 'Instagram', 'Audiomack', 'Spotify'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Date</label>
              <input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            {(['views', 'likes', 'shares', 'comments'] as const).map(field => (
              <div key={field}>
                <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  type="number"
                  style={inputStyle}
                  placeholder="0"
                  value={form[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button onClick={handleAdd} style={{
            marginTop: 14, padding: '9px 22px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
            background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)',
            color: '#F5A623', cursor: 'pointer',
          }}>
            Save Post
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: filter === f.key ? 600 : 400,
              cursor: 'pointer', border: `1px solid ${filter === f.key ? '#F5A623' : '#22223A'}`,
              background: filter === f.key ? 'rgba(245,166,35,0.12)' : 'transparent',
              color: filter === f.key ? '#F5A623' : '#64748B',
            }}
          >
            {f.label}
            {f.key !== 'all' && (
              <span style={{ marginLeft: 5, fontSize: 11, color: filter === f.key ? '#F5A623' : '#475569' }}>
                {posts.filter(p => p.type === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(post => {
          const typeColor = typeColors[post.type]
          const platformColor = platformColors[post.platform] || '#64748B'
          return (
            <div key={post.id} style={{
              background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12,
              padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
              borderLeft: `3px solid ${typeColor}`,
            }}>
              {/* Title row */}
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5,
                    color: typeColor, background: `${typeColor}16`,
                    padding: '2px 8px', borderRadius: 4,
                  }}>
                    {typeLabels[post.type]}
                  </span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600,
                    color: platformColor, background: `${platformColor}16`,
                    padding: '2px 8px', borderRadius: 4,
                  }}>
                    {post.platform}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', lineHeight: 1.35 }}>
                  {post.title}
                </div>
                <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
                  {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, paddingTop: 10, borderTop: '1px solid #22223A' }}>
                {[
                  { icon: Eye, value: post.views, label: 'Views', color: '#94A3B8' },
                  { icon: Heart, value: post.likes, label: 'Likes', color: '#E1306C' },
                  { icon: Share2, value: post.shares, label: 'Shares', color: '#3B82F6' },
                  { icon: MessageCircle, value: post.comments, label: 'Comments', color: '#1DB954' },
                ].map(({ icon: Icon, value, label, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <Icon size={12} color={color} style={{ marginBottom: 3 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{fmt(value)}</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569', fontSize: 14 }}>
          No posts found for this filter.
        </div>
      )}
    </div>
  )
}
