interface Props {
  score: number
  size?: number
}

export default function MomentumGauge({ score, size = 180 }: Props) {
  const radius = size * 0.4
  const strokeWidth = size * 0.075
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference

  const color = score >= 70 ? '#1DB954' : score >= 40 ? '#F5A623' : '#EF4444'
  const label = score >= 70 ? 'Strong' : score >= 40 ? 'Building' : 'Low'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="#22223A"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
        <text
          x={center} y={center - size * 0.04}
          textAnchor="middle"
          fill={color}
          fontSize={size * 0.2}
          fontWeight="700"
          fontFamily="system-ui"
        >
          {score}
        </text>
        <text
          x={center} y={center + size * 0.12}
          textAnchor="middle"
          fill="#64748B"
          fontSize={size * 0.068}
          fontFamily="system-ui"
          fontWeight="600"
          letterSpacing="1.5"
        >
          MOMENTUM
        </text>
        <text
          x={center} y={center + size * 0.22}
          textAnchor="middle"
          fill={color}
          fontSize={size * 0.065}
          fontFamily="system-ui"
          fontWeight="500"
        >
          {label}
        </text>
      </svg>
    </div>
  )
}
