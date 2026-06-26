import { supabaseAdmin } from '../_lib/auth.js'
import { fetchStats } from '../_lib/platformFetch.js'

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: connections, error } = await supabaseAdmin
    .from('platform_connections')
    .select('user_id, platform, credentials')

  if (error) return res.status(500).json({ error: error.message })

  const snapshots = []
  for (const conn of connections ?? []) {
    try {
      const metrics = await fetchStats(conn.platform, conn.credentials)
      snapshots.push({ user_id: conn.user_id, platform: conn.platform, metrics })
    } catch (err) {
      console.error(`cron fetch failed user=${conn.user_id} platform=${conn.platform}: ${err.message}`)
    }
  }

  if (snapshots.length > 0) {
    const { error: insertErr } = await supabaseAdmin.from('platform_snapshots').insert(snapshots)
    if (insertErr) return res.status(500).json({ error: insertErr.message })
  }

  res.json({ fetched: snapshots.length, total: connections?.length ?? 0 })
}
