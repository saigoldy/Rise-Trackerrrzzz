import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) setError(error.message)
  }

  const handleMagicLink = async () => {
    if (!email.trim()) return
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0D0D14', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1A1A27', border: '1px solid #22223A', borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 400,
      }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#F5A623' }}>JuKatha</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748B' }}>Artist Dashboard</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', color: '#1DB954', fontSize: 14, lineHeight: 1.6 }}>
            Check your email for a magic link to sign in.
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogle}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
                background: '#fff', color: '#000', border: 'none', cursor: 'pointer', marginBottom: 16,
              }}
            >
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#22223A' }} />
              <span style={{ fontSize: 12, color: '#475569' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#22223A' }} />
            </div>

            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 9, fontSize: 14,
                background: '#0D0D14', border: '1px solid #22223A',
                color: '#F1F5F9', marginBottom: 12, boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleMagicLink}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
                background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)',
                color: '#F5A623', cursor: 'pointer',
              }}
            >
              Send Magic Link
            </button>

            {error && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#EF4444', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
