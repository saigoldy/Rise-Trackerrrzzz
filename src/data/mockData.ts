// ─── Platform Metrics ────────────────────────────────────────────────────────

export interface PlatformMetric {
  name: string
  color: string
  primary: { label: string; value: number; change: number }
  secondary: { label: string; value: number; change: number; isPercent?: boolean }
}

export const platformMetrics: PlatformMetric[] = [
  {
    name: 'TikTok',
    color: '#FF0050',
    primary: { label: 'Followers', value: 850, change: 12 },
    secondary: { label: 'Views (7d)', value: 45200, change: -8 },
  },
  {
    name: 'YouTube',
    color: '#FF0000',
    primary: { label: 'Subscribers', value: 320, change: 5 },
    secondary: { label: 'Views (7d)', value: 12100, change: 3 },
  },
  {
    name: 'Spotify',
    color: '#1DB954',
    primary: { label: 'Monthly Listeners', value: 1200, change: 45 },
    secondary: { label: 'Streams (7d)', value: 8500, change: 6 },
  },
  {
    name: 'Audiomack',
    color: '#FF6B00',
    primary: { label: 'Plays', value: 2100, change: 15 },
    secondary: { label: 'Followers', value: 480, change: 22 },
  },
  {
    name: 'Instagram',
    color: '#E1306C',
    primary: { label: 'Followers', value: 1450, change: 28 },
    secondary: { label: 'Eng. Rate', value: 3.2, change: 0.3, isPercent: true },
  },
]

// ─── Weekly Growth (7 days) ───────────────────────────────────────────────────

export const weeklyData = [
  { day: 'Mon', tiktok: 820, youtube: 315, spotify: 1150, audiomack: 1980, instagram: 1420 },
  { day: 'Tue', tiktok: 825, youtube: 316, spotify: 1158, audiomack: 2000, instagram: 1428 },
  { day: 'Wed', tiktok: 830, youtube: 317, spotify: 1165, audiomack: 2020, instagram: 1433 },
  { day: 'Thu', tiktok: 827, youtube: 317, spotify: 1172, audiomack: 2045, instagram: 1439 },
  { day: 'Fri', tiktok: 835, youtube: 318, spotify: 1180, audiomack: 2060, instagram: 1443 },
  { day: 'Sat', tiktok: 844, youtube: 319, spotify: 1191, audiomack: 2082, instagram: 1447 },
  { day: 'Sun', tiktok: 850, youtube: 320, spotify: 1200, audiomack: 2100, instagram: 1450 },
]

// ─── 30-Day Analytics Data ────────────────────────────────────────────────────

const seed = [0, 8, 4, 12, 6, -3, 9, 5, 14, 3, 7, 11, -2, 6, 10, 4, 8, 13, 2, 9, 5, 7, 11, 3, 8, 6, 12, 4, 9, 7]

export const monthlyData = seed.map((delta, i) => {
  const d = new Date('2026-04-27')
  d.setDate(d.getDate() + i)
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    tiktok: Math.round(700 + i * 5 + delta * 3),
    youtube: Math.round(280 + i * 1.4 + delta),
    spotify: Math.round(900 + i * 10 + delta * 4),
    audiomack: Math.round(1600 + i * 17 + delta * 5),
    instagram: Math.round(1200 + i * 8.5 + delta * 3),
  }
})

// ─── Content Posts ────────────────────────────────────────────────────────────

export type ContentType = 'freestyle' | 'cover' | 'original' | 'bts' | 'vocal-clip' | 'collab'

export interface ContentPost {
  id: number
  title: string
  type: ContentType
  platform: string
  date: string
  views: number
  likes: number
  shares: number
  comments: number
}

export const contentPosts: ContentPost[] = [
  { id: 1, title: 'Afrobeats Freestyle #3', type: 'freestyle', platform: 'TikTok', date: '2026-05-25', views: 12400, likes: 890, shares: 145, comments: 67 },
  { id: 2, title: 'Cover – "Essence" (Wizkid)', type: 'cover', platform: 'TikTok', date: '2026-05-22', views: 8900, likes: 670, shares: 98, comments: 44 },
  { id: 3, title: 'Studio BTS – Recording Session', type: 'bts', platform: 'Instagram', date: '2026-05-21', views: 4200, likes: 380, shares: 56, comments: 29 },
  { id: 4, title: '"Kamali" – Original Track', type: 'original', platform: 'YouTube', date: '2026-05-18', views: 2100, likes: 145, shares: 22, comments: 18 },
  { id: 5, title: 'Morning Vocal Warmup Clip', type: 'vocal-clip', platform: 'TikTok', date: '2026-05-17', views: 5600, likes: 420, shares: 67, comments: 31 },
  { id: 6, title: 'Afrobeats Freestyle #2', type: 'freestyle', platform: 'TikTok', date: '2026-05-14', views: 9800, likes: 740, shares: 112, comments: 52 },
  { id: 7, title: 'Paddyman Studio Diary', type: 'bts', platform: 'Instagram', date: '2026-05-12', views: 3100, likes: 290, shares: 43, comments: 21 },
  { id: 8, title: '"Nairobi Nights" – Collab', type: 'collab', platform: 'YouTube', date: '2026-05-10', views: 6700, likes: 510, shares: 89, comments: 47 },
  { id: 9, title: 'Cover – "Essence" Acapella', type: 'cover', platform: 'YouTube', date: '2026-05-08', views: 3400, likes: 265, shares: 38, comments: 19 },
  { id: 10, title: 'Freestyle Friday #1', type: 'freestyle', platform: 'TikTok', date: '2026-05-03', views: 7200, likes: 590, shares: 95, comments: 41 },
]

// ─── Fan Geography ────────────────────────────────────────────────────────────

export const fanGeography = [
  { country: 'Uganda', flag: '🇺🇬', listeners: 5400, percentage: 42 },
  { country: 'Kenya', flag: '🇰🇪', listeners: 2600, percentage: 20 },
  { country: 'Tanzania', flag: '🇹🇿', listeners: 1800, percentage: 14 },
  { country: 'Nigeria', flag: '🇳🇬', listeners: 1300, percentage: 10 },
  { country: 'Rwanda', flag: '🇷🇼', listeners: 650, percentage: 5 },
  { country: 'USA', flag: '🇺🇸', listeners: 520, percentage: 4 },
  { country: 'UK', flag: '🇬🇧', listeners: 390, percentage: 3 },
  { country: 'Others', flag: '🌍', listeners: 260, percentage: 2 },
]

// ─── Content Type Performance ─────────────────────────────────────────────────

export const contentTypePerformance = [
  { type: 'Freestyle', avgViews: 9800, engagement: 8.2, posts: 3 },
  { type: 'Cover', avgViews: 6150, engagement: 6.8, posts: 2 },
  { type: 'BTS', avgViews: 3650, engagement: 9.1, posts: 2 },
  { type: 'Original', avgViews: 4400, engagement: 7.4, posts: 1 },
  { type: 'Vocal Clip', avgViews: 5600, engagement: 7.8, posts: 1 },
  { type: 'Collab', avgViews: 6700, engagement: 8.5, posts: 1 },
]

// ─── Accountability ───────────────────────────────────────────────────────────

export const dailySlate = {
  gym: true,
  salonDuty: false,
  study: true,
  contentPosted: false,
  verseWritten: false,
}

export const streakData = {
  current: 4,
  longest: 12,
  thisMonth: 18,
  totalDays: 47,
}

const heatValues = [4,3,5,2,0,3,4,1,5,3,2,4,0,3,5,2,4,3,1,5,2,3,4,0,3,5,2,3,5,3]
export const calendarHeatData = heatValues.map((value, i) => {
  const d = new Date('2026-04-28')
  d.setDate(d.getDate() + i)
  return { date: `${d.getMonth() + 1}/${d.getDate()}`, value }
})

export const weeklyReport = {
  week: 'May 19–25, 2026',
  postsPublished: 3,
  totalReach: 28600,
  avgEngagement: 7.9,
  slateScore: 68,
  topPlatform: 'TikTok',
  highlights: [
    'Freestyle #3 crossed 12K views — best single post this month',
    'Spotify monthly listeners up 45 in one week',
    'Missed 2 of 5 daily slate tasks (Content + Verse)',
  ],
}

// ─── Revenue ──────────────────────────────────────────────────────────────────

export const revenueByPlatform = [
  { name: 'Spotify', monthly: 3.40, perUnit: 0.004, units: 8500, unitLabel: 'streams', color: '#1DB954' },
  { name: 'Audiomack', monthly: 0.85, perUnit: 0.0004, units: 2100, unitLabel: 'plays', color: '#FF6B00' },
  { name: 'Apple Music', monthly: 0.52, perUnit: 0.007, units: 74, unitLabel: 'streams', color: '#FC3C44' },
  { name: 'Boomplay', monthly: 0.21, perUnit: 0.0003, units: 700, unitLabel: 'plays', color: '#E9326D' },
  { name: 'YouTube Music', monthly: 0.18, perUnit: 0.001, units: 180, unitLabel: 'streams', color: '#FF0000' },
]

export const monthlyRevenue = [
  { month: "Dec '25", total: 1.20 },
  { month: "Jan '26", total: 2.10 },
  { month: "Feb '26", total: 2.85 },
  { month: "Mar '26", total: 3.40 },
  { month: "Apr '26", total: 4.20 },
  { month: "May '26", total: 5.16 },
]

export const streamRates = [
  { platform: 'Apple Music', rate: '$0.0070', color: '#FC3C44' },
  { platform: 'Spotify', rate: '$0.0040', color: '#1DB954' },
  { platform: 'YouTube Music', rate: '$0.0010', color: '#FF0000' },
  { platform: 'Boomplay', rate: '$0.0003', color: '#E9326D' },
  { platform: 'Audiomack', rate: '$0.0004', color: '#FF6B00' },
]

// ─── Milestones ───────────────────────────────────────────────────────────────

export interface MilestonePhase {
  phase: number
  name: string
  description: string
  targets: { label: string; target: number; current: number; color: string }[]
  unlocked: boolean
}

export const milestonePhases: MilestonePhase[] = [
  {
    phase: 1,
    name: 'East African Base',
    description: 'Build a solid local foundation — 5K on every major platform',
    targets: [
      { label: 'TikTok Followers', target: 5000, current: 850, color: '#FF0050' },
      { label: 'YouTube Subs', target: 5000, current: 320, color: '#FF0000' },
      { label: 'Spotify Listeners', target: 5000, current: 1200, color: '#1DB954' },
      { label: 'Instagram Followers', target: 5000, current: 1450, color: '#E1306C' },
    ],
    unlocked: true,
  },
  {
    phase: 2,
    name: 'Regional Recognition',
    description: 'Expand reach to Kenya, Tanzania, Nigeria and diaspora markets',
    targets: [
      { label: 'TikTok Followers', target: 50000, current: 850, color: '#FF0050' },
      { label: 'YouTube Subs', target: 25000, current: 320, color: '#FF0000' },
      { label: 'Spotify Listeners', target: 30000, current: 1200, color: '#1DB954' },
      { label: 'Instagram Followers', target: 30000, current: 1450, color: '#E1306C' },
    ],
    unlocked: false,
  },
  {
    phase: 3,
    name: 'Pan-African Rising',
    description: 'Establish a dominant Pan-African presence and break into global markets',
    targets: [
      { label: 'TikTok Followers', target: 500000, current: 850, color: '#FF0050' },
      { label: 'YouTube Subs', target: 100000, current: 320, color: '#FF0000' },
      { label: 'Spotify Listeners', target: 100000, current: 1200, color: '#1DB954' },
      { label: 'Instagram Followers', target: 100000, current: 1450, color: '#E1306C' },
    ],
    unlocked: false,
  },
]

export const badges = [
  { id: 1, name: 'First Post', icon: '🎤', description: 'Published your first piece of content', earned: true, date: 'Feb 10, 2026' },
  { id: 2, name: '100 Followers', icon: '👥', description: 'Reached 100 followers on any platform', earned: true, date: 'Feb 28, 2026' },
  { id: 3, name: 'Consistency King', icon: '🔥', description: 'Maintained a 7-day posting streak', earned: true, date: 'Mar 15, 2026' },
  { id: 4, name: 'Viral Spark', icon: '⚡', description: 'Single post exceeded 10K views', earned: true, date: 'May 25, 2026' },
  { id: 5, name: '500 Followers', icon: '🌟', description: 'Reached 500 followers on any platform', earned: true, date: 'Apr 12, 2026' },
  { id: 6, name: '1K Streams', icon: '🎵', description: 'Crossed 1K monthly streams on Spotify', earned: true, date: 'Apr 20, 2026' },
  { id: 7, name: 'East African Ready', icon: '🌍', description: 'Listeners in 4+ East African countries', earned: false, date: null },
  { id: 8, name: 'Studio Regular', icon: '🎙️', description: '5 original tracks released', earned: false, date: null },
  { id: 9, name: 'Collab King', icon: '🤝', description: 'Released 3 collaboration tracks', earned: false, date: null },
]

// ─── Suggestions ─────────────────────────────────────────────────────────────

export type Urgency = 'urgent' | 'high' | 'medium' | 'low'

export interface Suggestion {
  id: number
  urgency: Urgency
  title: string
  description: string
  action: string
  platform: string
}

export const suggestions: Suggestion[] = [
  {
    id: 1,
    urgency: 'urgent',
    platform: 'TikTok',
    title: 'No content posted in 2 days',
    description: "Posting consistency is your #1 growth driver right now. Film a 30-second vocal clip — phone audio is fine — and post it on TikTok today. Don't overthink it.",
    action: 'Log Content Posted',
  },
  {
    id: 2,
    urgency: 'high',
    platform: 'Audiomack',
    title: 'Audiomack profile not fully optimized',
    description: "Audiomack is the #1 music streaming platform in East Africa. Add a proper bio, profile photo, and link your DistroKid catalog to capture streams you're currently missing.",
    action: 'Open Audiomack',
  },
  {
    id: 3,
    urgency: 'high',
    platform: 'YouTube',
    title: 'YouTube avg. view duration too low (2:14)',
    description: 'Most viewers drop off in the first 30 seconds. Restructure your videos: strong hook → verse → chorus in the first 60 seconds. Also consider shorter clips (2–3 min max).',
    action: 'Review YouTube Strategy',
  },
  {
    id: 4,
    urgency: 'medium',
    platform: 'TikTok',
    title: 'TikTok views dropped 8% this week',
    description: "Try covering a trending East African sound this week. The Amapiano-Afro Fusion wave is gaining serious momentum. Check the Trend Radar for what's working right now.",
    action: 'Check Trend Radar',
  },
  {
    id: 5,
    urgency: 'medium',
    platform: 'Instagram',
    title: 'BTS content ratio too low (2 of 10 posts)',
    description: "Raw behind-the-scenes content gets 3x more shares than polished posts at your follower count. Aim for at least 2–3 BTS posts per week.",
    action: 'Add BTS Content',
  },
  {
    id: 6,
    urgency: 'low',
    platform: 'Spotify',
    title: 'Spotify Artist Pick not set',
    description: 'Add your best track as your Artist Pick to capture first-time profile visitors. This is free and takes 2 minutes in Spotify for Artists.',
    action: 'Update Spotify Profile',
  },
]

// ─── Trend Radar ──────────────────────────────────────────────────────────────

export const trendRadar = [
  { name: 'Amapiano-Afro Fusion', momentum: 94, region: 'East Africa', type: 'Sound' },
  { name: 'Bongo Flava Remix Wave', momentum: 87, region: 'Tanzania/Kenya', type: 'Style' },
  { name: 'Afrobeats Drill Crossover', momentum: 79, region: 'Pan-African', type: 'Genre' },
  { name: '#KampalaSoundChallenge', momentum: 73, region: 'Uganda', type: 'Challenge' },
  { name: 'Acoustic Afro (stripped)', momentum: 68, region: 'Diaspora', type: 'Style' },
  { name: 'Street Gospel Vibes', momentum: 61, region: 'Uganda/Rwanda', type: 'Genre' },
]

// ─── Collab Radar ─────────────────────────────────────────────────────────────

export const collabRadar = [
  { name: 'B2C', country: 'Uganda', genre: 'Urban Afrobeats', followers: '420K', compatibility: 88 },
  { name: 'Feffe Bussi', country: 'Uganda', genre: 'Hip-Hop/Afro', followers: '280K', compatibility: 82 },
  { name: 'Eddy Kenzo', country: 'Uganda', genre: 'Afropop', followers: '850K', compatibility: 79 },
  { name: 'Harmonize', country: 'Tanzania', genre: 'Bongo Flava', followers: '4.2M', compatibility: 65 },
  { name: 'Khaligraph Jones', country: 'Kenya', genre: 'Afro-Hip-Hop', followers: '1.8M', compatibility: 58 },
]

// ─── Dashboard summary ────────────────────────────────────────────────────────

export const momentumScore = 42
export const topSuggestions = suggestions.slice(0, 3)

// ─── Releases / Distribution ──────────────────────────────────────────────────

export type DistroStatus = 'live' | 'pending' | 'unavailable'

export interface TrackDistribution {
  platform: string
  color: string
  status: DistroStatus
  streams: number
}

export interface Track {
  id: number
  title: string
  type: 'single' | 'collab'
  featuring?: string
  releaseDate: string
  upc: string
  isrc: string
  genre: string
  distribution: TrackDistribution[]
}

const distro = (platform: string, color: string, status: DistroStatus, streams: number): TrackDistribution =>
  ({ platform, color, status, streams })

export const tracks: Track[] = [
  {
    id: 1,
    title: 'Nkwagala',
    type: 'single',
    releaseDate: '2025-11-14',

    upc: '840123456780',
    isrc: 'UGA252500001',
    genre: 'Afropop',
    distribution: [
      distro('Spotify',       '#1DB954', 'live',        3200),
      distro('Apple Music',   '#FC3C44', 'live',         480),
      distro('Audiomack',     '#FF6B00', 'live',        1800),
      distro('YouTube Music', '#FF0000', 'live',         390),
      distro('Boomplay',      '#E9326D', 'live',         620),
      distro('Tidal',         '#00FFFF', 'live',          54),
      distro('Amazon Music',  '#00A8E0', 'live',         130),
    ],
  },
  {
    id: 2,
    title: 'East Side',
    type: 'single',
    releaseDate: '2026-01-22',

    upc: '840123456781',
    isrc: 'UGA252600002',
    genre: 'Urban Afrobeats',
    distribution: [
      distro('Spotify',       '#1DB954', 'live',        2100),
      distro('Apple Music',   '#FC3C44', 'live',         210),
      distro('Audiomack',     '#FF6B00', 'live',        1400),
      distro('YouTube Music', '#FF0000', 'live',         240),
      distro('Boomplay',      '#E9326D', 'live',         390),
      distro('Tidal',         '#00FFFF', 'pending',        0),
      distro('Amazon Music',  '#00A8E0', 'live',          88),
    ],
  },
  {
    id: 3,
    title: 'Kamali',
    type: 'single',
    releaseDate: '2026-02-08',

    upc: '840123456782',
    isrc: 'UGA252600003',
    genre: 'Afropop',
    distribution: [
      distro('Spotify',       '#1DB954', 'live',        1600),
      distro('Apple Music',   '#FC3C44', 'live',         140),
      distro('Audiomack',     '#FF6B00', 'live',         920),
      distro('YouTube Music', '#FF0000', 'live',         180),
      distro('Boomplay',      '#E9326D', 'pending',        0),
      distro('Tidal',         '#00FFFF', 'pending',        0),
      distro('Amazon Music',  '#00A8E0', 'live',          62),
    ],
  },
  {
    id: 4,
    title: 'Nairobi Nights',
    type: 'collab',
    featuring: 'B2C',
    releaseDate: '2026-03-15',

    upc: '840123456783',
    isrc: 'UGA252600004',
    genre: 'Urban Afrobeats',
    distribution: [
      distro('Spotify',       '#1DB954', 'live',        2800),
      distro('Apple Music',   '#FC3C44', 'live',         320),
      distro('Audiomack',     '#FF6B00', 'live',        2200),
      distro('YouTube Music', '#FF0000', 'live',         410),
      distro('Boomplay',      '#E9326D', 'live',         780),
      distro('Tidal',         '#00FFFF', 'live',          88),
      distro('Amazon Music',  '#00A8E0', 'live',         160),
    ],
  },
  {
    id: 5,
    title: 'Fire & Gold',
    type: 'single',
    releaseDate: '2026-04-19',

    upc: '840123456784',
    isrc: 'UGA252600005',
    genre: 'Afropop',
    distribution: [
      distro('Spotify',       '#1DB954', 'live',         980),
      distro('Apple Music',   '#FC3C44', 'live',          74),
      distro('Audiomack',     '#FF6B00', 'live',         560),
      distro('YouTube Music', '#FF0000', 'pending',        0),
      distro('Boomplay',      '#E9326D', 'pending',        0),
      distro('Tidal',         '#00FFFF', 'pending',        0),
      distro('Amazon Music',  '#00A8E0', 'pending',        0),
    ],
  },
  {
    id: 6,
    title: 'Omulangira',
    type: 'single',
    releaseDate: '2026-05-10',

    upc: '840123456785',
    isrc: 'UGA252600006',
    genre: 'Urban Afrobeats',
    distribution: [
      distro('Spotify',       '#1DB954', 'live',         420),
      distro('Apple Music',   '#FC3C44', 'pending',        0),
      distro('Audiomack',     '#FF6B00', 'live',         310),
      distro('YouTube Music', '#FF0000', 'pending',        0),
      distro('Boomplay',      '#E9326D', 'pending',        0),
      distro('Tidal',         '#00FFFF', 'pending',        0),
      distro('Amazon Music',  '#00A8E0', 'pending',        0),
    ],
  },
]


// Payout history
export const payoutHistory = [
  { id: 1, date: 'Feb 28, 2026', amount: 2.85, method: 'Bank Transfer', status: 'paid', period: 'Jan 2026' },
  { id: 2, date: 'Mar 31, 2026', amount: 3.40, method: 'Bank Transfer', status: 'paid', period: 'Feb 2026' },
  { id: 3, date: 'Apr 30, 2026', amount: 4.20, method: 'Bank Transfer', status: 'paid', period: 'Mar 2026' },
  { id: 4, date: 'May 31, 2026', amount: 5.16, method: 'Bank Transfer', status: 'pending', period: 'Apr 2026' },
]

// Per-stream rates by platform (USD)
export const platformRates: Record<string, number> = {
  'Spotify': 0.004,
  'Apple Music': 0.007,
  'Audiomack': 0.0004,
  'YouTube Music': 0.001,
  'Boomplay': 0.0003,
  'Tidal': 0.0125,
  'Amazon Music': 0.004,
}
