import { verifyUser, supabaseAdmin } from './_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const { data } = await supabaseAdmin
      .from('platform_connections')
      .select('platform')
      .eq('user_id', user.id)

    const connected = new Set((data ?? []).map(r => r.platform))
    res.json({
      youtube:   connected.has('youtube'),
      spotify:   connected.has('spotify'),
      instagram: connected.has('instagram'),
      tiktok:    connected.has('tiktok'),
      audiomack: connected.has('audiomack'),
    })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
