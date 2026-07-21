// src/features/employee/components/EmployeeKtpBadge.jsx
// Displays an employee's KTP submission tracking status as a badge.
// Matches backend enum: 'pending' | 'received' (Employee.model.js → KTP_STATUSES)
// Mirrors RepairStatusBadge / PayrollStatusBadge patterns — same
// config-map + cn() shape used throughout the app; no new badge
// implementation introduced.

import { Clock, CheckCircle2 } from 'lucide-react'
import { cn }                  from '@/lib/utils'

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon:  Clock,
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
  received: {
    label: 'Received',
    icon:  CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
}

const DEFAULT = { label: 'Unknown', icon: null, badge: 'bg-zinc-100 text-zinc-500' }

/**
 * @param {{ ktpStatus: 'pending'|'received', showIcon?: boolean, className?: string }} props
 */
const EmployeeKtpBadge = ({ ktpStatus, showIcon = true, className }) => {
  const config = STATUS_CONFIG[ktpStatus] ?? DEFAULT
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

export default EmployeeKtpBadge

export const KTP_STATUS_OPTIONS = Object.keys(STATUS_CONFIG)