// src/features/bike/components/BikeStatusBadge.jsx
// Displays the bike's operational STATUS — not the isActive soft-delete flag.
// Backend enum (confirmed from Bike.model.js): 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'
//
// Distinct from isActive (soft-delete). A RETIRED bike still has isActive: true.
// Mirrors CupRecordStatusBadge and PayrollStatusBadge patterns exactly.

import { CheckCircle2, Wrench, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Active',
    icon:  CheckCircle2,
    badge: 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    icon:  Wrench,
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
  RETIRED: {
    label: 'Retired',
    icon:  Archive,
    badge: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
}

const DEFAULT = { label: 'Unknown', icon: null, badge: 'bg-zinc-100 text-zinc-500' }

/**
 * @param {{ status: 'ACTIVE'|'MAINTENANCE'|'RETIRED', showIcon?: boolean, className?: string }} props
 */
const BikeStatusBadge = ({ status, showIcon = true, className }) => {
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

export default BikeStatusBadge

export const BIKE_STATUS_OPTIONS = Object.keys(STATUS_CONFIG)