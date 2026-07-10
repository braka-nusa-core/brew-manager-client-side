// src/features/cup/components/CupRecordStatusBadge.jsx
// Displays cup record status as a colored badge.
// Matches backend enum: 'draft' | 'finalized'
// Mirrors PayrollStatusBadge and AttendanceStatusBadge patterns exactly.

import { FileText, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    icon:  FileText,
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
  finalized: {
    label: 'Finalized',
    icon:  Lock,
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
}

const DEFAULT = {
  label: 'Unknown',
  icon:  null,
  badge: 'bg-zinc-100 text-zinc-500',
}

/**
 * @param {{
 *   status: 'draft'|'finalized',
 *   showIcon?: boolean,
 *   className?: string
 * }} props
 */
const CupRecordStatusBadge = ({ status, showIcon = true, className }) => {
  const config = STATUS_CONFIG[status] ?? DEFAULT
  const Icon   = config.icon

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
      config.badge,
      className
    )}>
      {showIcon && Icon && <Icon className="w-3 h-3 shrink-0" />}
      {config.label}
    </span>
  )
}

export default CupRecordStatusBadge

export const CUP_RECORD_STATUSES = Object.keys(STATUS_CONFIG)