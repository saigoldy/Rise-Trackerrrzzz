import { verifyUser, supabaseAdmin } from '../_lib/auth.js'
import { fetchStats } from '../_lib/platformFetch.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)

    const { data: connections } = await supabaseAdmin
      .from('platform_connections')
      .select('platform, credentials')
      .eq('user_id', user.id)

    const snapshots = []
    for (const conn of connections ?? []) {
      try {
        const metrics = await fetchStats(conn.platform, conn.credentials)
        snapshots.push({ user_id: user.id, platform: conn.platform, metrics })
      } catch (err) {
        console.error(`refresh failed platform=${conn.platform}: ${err.message}`)
      }
    }

    if (snapshots.length > 0) {
      await supabaseAdmin.from('platform_snapshots').insert(snapshots)
    }

    res.json({ snapshots: snapshots.map(s => ({ platform: s.platform, metrics: s.metrics })) })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
