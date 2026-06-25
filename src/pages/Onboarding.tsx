import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ artist_name: '', location: '', genre: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.artist_name.trim()) { setError('Artist name is required'); return }
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ artist_name: form.artist_name, location: form.location, genre: form.genre })
      .eq('id', user!.id)
    if (error) { setError(error.message); setSaving(false); return }
    navigate('/', { replace: true })
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 9, fontSize: 14,
    background: '#0D0D14', border: '1px solid #22223A',
    color: '#F1F5F9', marginBottom: 14, boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0D0D14', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1A1A27', border: '1px solid #22223A', borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 440,
      }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>
          Set up your profile
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: '#64748B' }}>
          Tell us about yourself to get started.
        </p>

        <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Artist Name *</label>
        <input
          style={inputStyle}
          placeholder="e.g. JuKatha"
          value={form.artist_name}
          onChange={e => setForm({ ...form, artist_name: e.target.value })}
        />

        <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Location</label>
        <input
          style={inputStyle}
          placeholder="e.g. Lagos, Nigeria"
          value={form.location}
          onChange={e => setForm({ ...form, location: e.target.value })}
        />

        <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Genre</label>
        <input
          style={inputStyle}
          placeholder="e.g. Afrobeats"
          value={form.genre}
          onChange={e => setForm({ ...form, genre: e.target.value })}
        />

        {error && <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg, #F5A623, #E8911A)',
            color: '#000', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Get Started'}
        </button>
      </div>
    </div>
  )
}
