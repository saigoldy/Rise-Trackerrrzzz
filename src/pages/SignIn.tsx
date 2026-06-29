import { useState } from 'react'
import { supabase } from '../lib/supabase'

const s = {
  wrap: {
    minHeight: '100vh', background: '#0D0D14', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  } as React.CSSProperties,
  card: {
    background: '#1A1A27', border: '1px solid #22223A', borderRadius: 16,
    padding: '40px 36px', width: '100%', maxWidth: 400,
  } as React.CSSProperties,
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 9, fontSize: 14,
    background: '#0D0D14', border: '1px solid #22223A',
    color: '#F1F5F9', marginBottom: 12, boxSizing: 'border-box' as const,
    outline: 'none',
  },
  btn: {
    width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
    background: 'linear-gradient(135deg, #F5A623, #E8911A)', color: '#000',
    border: 'none', cursor: 'pointer',
  } as React.CSSProperties,
  btnDisabled: {
    width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
    background: '#22223A', color: '#475569', border: 'none', cursor: 'not-allowed',
  } as React.CSSProperties,
  label: { fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 } as React.CSSProperties,
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendOtp = async () => {
    if (!email.trim()) return
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  const verifyOtp = async () => {
    if (!otp.trim()) return
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action()
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#F5A623' }}>Risetrack</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748B' }}>Artist Dashboard</p>
        </div>

        {step === 'email' ? (
          <>
            <label style={s.label}>Email Address</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => handleKeyDown(e, sendOtp)}
              style={s.input}
              autoFocus
            />
            <button
              onClick={sendOtp}
              disabled={loading || !email.trim()}
              style={loading || !email.trim() ? s.btnDisabled : s.btn}
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
                We sent a 6-digit code to
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>
                {email}
              </p>
            </div>
            <label style={s.label}>Enter OTP Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => handleKeyDown(e, verifyOtp)}
              style={{ ...s.input, letterSpacing: 6, fontSize: 22, textAlign: 'center' }}
              autoFocus
            />
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length < 6}
              style={loading || otp.length < 6 ? s.btnDisabled : s.btn}
            >
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
            <button
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              style={{
                width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 9,
                fontSize: 13, background: 'none', border: 'none',
                color: '#475569', cursor: 'pointer',
              }}
            >
              ← Change email
            </button>
          </>
        )}

        {error && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#EF4444', textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
