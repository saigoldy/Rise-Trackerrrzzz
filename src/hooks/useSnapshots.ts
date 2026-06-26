import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export interface Metrics {
  subscribers?: number
  views?: number
  video_count?: number
  followers?: number
  popularity?: number
  monthly_listeners?: number
  media_count?: number
  likes?: number
  plays?: number
  songs?: number
}

export interface Snapshot {
  platform: string
  fetched_at: string
  metrics: Metrics
}

export interface SnapshotsResult {
  latest: Record<string, Snapshot>
  history: Record<string, Snapshot[]>
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
}

export function useSnapshots(): SnapshotsResult {
  const { user, session } = useAuth()
  const [latest, setLatest] = useState<Record<string, Snapshot>>({})
  const [history, setHistory] = useState<Record<string, Snapshot[]>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadSnapshots = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('platform_snapshots')
      .select('platform, fetched_at, metrics')
      .eq('user_id', user.id)
      .order('fetched_at', { ascending: false })
      .limit(150)

    const latestMap: Record<string, Snapshot> = {}
    const historyMap: Record<string, Snapshot[]> = {}

    for (const row of data ?? []) {
      if (!latestMap[row.platform]) latestMap[row.platform] = row
      if (!historyMap[row.platform]) historyMap[row.platform] = []
      if (historyMap[row.platform].length < 30) historyMap[row.platform].push(row)
    }

    setLatest(latestMap)
    setHistory(historyMap)
    setLoading(false)
  }, [user])

  useEffect(() => { loadSnapshots() }, [loadSnapshots])

  const refresh = useCallback(async () => {
    if (!session) return
    setRefreshing(true)
    try {
      await fetch('/api/stats/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      await loadSnapshots()
    } finally {
      setRefreshing(false)
    }
  }, [session, loadSnapshots])

  return { latest, history, loading, refreshing, refresh }
}
