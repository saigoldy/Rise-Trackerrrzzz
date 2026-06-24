import { useState, useEffect, useCallback } from 'react'
import { platformMetrics } from '../data/mockData'
import type { PlatformMetric } from '../data/mockData'

const API = 'http://localhost:3001/api'

export interface ConnectionStatus {
  youtube: boolean
  spotify: boolean
  instagram: boolean
  tiktok: boolean
  audiomack: boolean
}

// Fetch which platforms are configured on the server
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    youtube: false, spotify: false, instagram: false, tiktok: false, audiomack: false,
  })
  const [serverOnline, setServerOnline] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch(`${API}/status`, { credentials: 'include' })
      .then(r => { setServerOnline(r.ok); return r.json() })
      .then(setStatus)
      .catch(() => setServerOnline(false))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { status, serverOnline, loading, refresh }
}

// Merge live API data over the mock metrics baseline
export function useLivePlatformMetrics() {
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
      const r = await fetch(`${API}/youtube/channel`, { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        const i = updated.findIndex(p => p.name === 'YouTube')
        if (i >= 0) updated[i].primary = { ...updated[i].primary, value: d.subscribers }
      }
    } catch { errs.youtube = 'Unreachable' }

    // ── Spotify ───────────────────────────────────────────────────────────────
    try {
      const r = await fetch(`${API}/spotify/artist`, { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        const i = updated.findIndex(p => p.name === 'Spotify')
        if (i >= 0) updated[i].primary = { ...updated[i].primary, value: d.followers }
      }
    } catch { errs.spotify = 'Unreachable' }

    // ── Instagram ─────────────────────────────────────────────────────────────
    try {
      const r = await fetch(`${API}/instagram/stats`, { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        const i = updated.findIndex(p => p.name === 'Instagram')
        if (i >= 0) updated[i].primary = { ...updated[i].primary, value: d.followers }
      }
    } catch { errs.instagram = 'Unreachable' }

    // ── TikTok ────────────────────────────────────────────────────────────────
    try {
      const r = await fetch(`${API}/tiktok/stats`, { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        const i = updated.findIndex(p => p.name === 'TikTok')
        if (i >= 0) updated[i].primary = { ...updated[i].primary, value: d.followers }
      }
    } catch { errs.tiktok = 'Unreachable' }

    // ── Audiomack ─────────────────────────────────────────────────────────────
    try {
      const r = await fetch(`${API}/audiomack/artist`, { credentials: 'include' })
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
  }, [])

  return { metrics, syncing, lastSync, errors, sync }
}
