import { useState, useEffect, useCallback } from 'react'
import { platformMetrics } from '../data/mockData'
import type { PlatformMetric } from '../data/mockData'
import { useAuth } from '../context/AuthContext'

const API = '/api'

export interface ConnectionStatus {
  youtube: boolean
  spotify: boolean
  instagram: boolean
  tiktok: boolean
  audiomack: boolean
}

// Fetch which platforms are configured on the server
export function useConnectionStatus() {
  const { session } = useAuth()
  const [status, setStatus] = useState<ConnectionStatus>({
    youtube: false, spotify: false, instagram: false, tiktok: false, audiomack: false,
  })
  const [serverOnline, setServerOnline] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch(`${API}/status`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then(r => { setServerOnline(r.ok); return r.json() })
      .then(setStatus)
      .catch(() => setServerOnline(false))
      .finally(() => setLoading(false))
  }, [session])

  useEffect(() => { refresh() }, [refresh])

  return { status, serverOnline, loading, refresh }
}

// Merge live API data over the mock metrics baseline
export function useLivePlatformMetrics() {
  const { session } = useAuth()
  const [metrics, setMetrics] = useState<PlatformMetric[]>(platformMetrics)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sync = useCallback(async () => {
    setSyncing(true)
    const updated = structuredClone(platformMetrics) as PlatformMetric[]
    const errs: Record<string, string> = {}

    // ── YouTube ──────────────────────────────────────────────────────────────
    try {
      const r = await fetch(`${API}/youtube/channel`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (r.ok) {
        const d = await r.json()
        const i = updated.findIndex(p => p.name === 'YouTube')
        if (i >= 0) updated[i].primary = { ...updated[i].primary, value: d.subscribers }
      }
    } catch { errs.youtube = 'Unreachable' }

    // ── Spotify ───────────────────────────────────────────────────────────────
    try {
      const r = await fetch(`${API}/spotify/artist`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (r.ok) {
        const d = await r.json()
        const i = updated.findIndex(p => p.name === 'Spotify')
        if (i >= 0) updated[i].primary = { ...updated[i].primary, value: d.followers }
      }
    } catch { errs.spotify = 'Unreachable' }

    // ── Instagram ─────────────────────────────────────────────────────────────
    try {
      const r = await fetch(`${API}/instagram/stats`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (r.ok) {
        const d = await r.json()
        const i = updated.findIndex(p => p.name === 'Instagram')
        if (i >= 0) updated[i].primary = { ...updated[i].primary, value: d.followers }
      }
    } catch { errs.instagram = 'Unreachable' }

    // ── TikTok ────────────────────────────────────────────────────────────────
    try {
      const r = await fetch(`${API}/tiktok/stats`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (r.ok) {
        const d = await r.json()
        const i = updated.findIndex(p => p.name === 'TikTok')
        if (i >= 0) updated[i].primary = { ...updated[i].primary, value: d.followers }
      }
    } catch { errs.tiktok = 'Unreachable' }

    // ── Audiomack ─────────────────────────────────────────────────────────────
    try {
      const r = await fetch(`${API}/audiomack/artist`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (r.ok) {
        const d = await r.json()
        const i = updated.findIndex(p => p.name === 'Audiomack')
        if (i >= 0) updated[i].primary = { ...updated[i].primary, value: d.plays }
      }
    } catch { errs.audiomack = 'Unreachable' }

    setMetrics(updated)
    setErrors(errs)
    setLastSync(new Date())
    setSyncing(false)
  }, [session])

  return { metrics, syncing, lastSync, errors, sync }
}
