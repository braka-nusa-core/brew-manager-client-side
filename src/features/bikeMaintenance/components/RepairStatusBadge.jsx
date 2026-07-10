// src/features/bikeMaintenance/components/RepairStatusBadge.jsx
// Repair record status: IN_PROGRESS | COMPLETED
// Changed via generic PATCH /bike-repair-records/:id (unlike damage report status).

import { Clock, CheckCircle2 } from 'lucide-react'
import { cn }                  from '@/lib/utils'

const STATUS_CONFIG = {
  IN_PROGRESS: {
    label: 'In Progress',
    icon:  Clock,
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
  COMPLETED: {
    label: 'Completed',
    icon:  CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
}

const DEFAULT = { label: 'Unknown', icon: null, badge: 'bg-zinc-100 text-zinc-500' }

const RepairStatusBadge = ({ status, showIcon = true, className }) => {
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

export default RepairStatusBadge

export const REPAIR_STATUS_OPTIONS = Object.keys(STATUS_CONFIG)