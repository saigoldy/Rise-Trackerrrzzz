export default function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })
  // On Vercel, tokens live in env vars — remove TIKTOK_ACCESS_TOKEN from Vercel dashboard to disconnect
  res.json({ ok: true })
}
