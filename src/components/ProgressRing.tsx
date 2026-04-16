import type { CellStatus } from '../../shared/boardTypes'
import { cn } from '@/lib/utils'

const colorByStatus: Record<CellStatus, string> = {
  red: '#E07B86',
  yellow: '#E6C26E',
  green: '#74C7A5',
  black: '#1A1A1A',
}

export default function ProgressRing(props: {
  percent: 0 | 25 | 50 | 75 | 100
  status: CellStatus
  className?: string
}) {
  const size = 20
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (props.percent / 100) * c
  const color = colorByStatus[props.status]

  return (
    <div className={cn('relative grid place-items-center', props.className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(0,0,0,0.10)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 0 1px rgba(0,0,0,0.06), 0 8px 18px -14px ${color}` }}
      />
    </div>
  )
}
