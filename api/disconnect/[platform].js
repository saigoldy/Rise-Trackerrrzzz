export default function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })
  // On Vercel, tokens and API keys live in environment variables.
  // Remove the relevant env var from the Vercel dashboard to fully disconnect a platform.
  res.json({ ok: true })
}
