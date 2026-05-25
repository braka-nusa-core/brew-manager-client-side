// src/features/attendance/components/AttendanceStatusBadge.jsx
// Displays attendance status as a colored badge.
// Matches backend enum: 'present' | 'absent' | 'late' | 'leave' | 'holiday'

import { cn } from '@/lib/utils'

// Status → visual config
const STATUS_CONFIG = {
  present: {
    label:  'Present',
    dot:    'bg-brand-500',
    badge:  'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400',
  },
  late: {
    label:  'Late',
    dot:    'bg-amber-400',
    badge:  'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  },
  absent: {
    label:  'Absent',
    dot:    'bg-destructive',
    badge:  'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  },
  leave: {
    label:  'Leave',
    dot:    'bg-blue-400',
    badge:  'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  },
  holiday: {
    label:  'Holiday',
    dot:    'bg-zinc-400',
    badge:  'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
}

const DEFAULT = {
  label:  'Unknown',
  dot:    'bg-zinc-300',
  badge:  'bg-zinc-100 text-zinc-500',
}

/**
 * @param {{
 *   status: 'present'|'absent'|'late'|'leave'|'holiday',
 *   showDot?: boolean,
 *   className?: string
 * }} props
 */
const AttendanceStatusBadge = ({ status, showDot = true, className }) => {
  const config = STATUS_CONFIG[status] ?? DEFAULT

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        config.badge,
        className
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      )}
      {config.label}
    </span>
  )
}

export default AttendanceStatusBadge

// Export constants so other components can use them (e.g. filter dropdowns)
export const ATTENDANCE_STATUSES = Object.keys(STATUS_CONFIG)
export { STATUS_CONFIG }