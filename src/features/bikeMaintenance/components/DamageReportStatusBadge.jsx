// src/features/bikeMaintenance/components/DamageReportStatusBadge.jsx
// Damage report status: OPEN → IN_REPAIR → RESOLVED
// Changed only via the dedicated PATCH /bike-damage-reports/:id/status endpoint.

import { AlertCircle, Wrench, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    icon:  AlertCircle,
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  },
  IN_REPAIR: {
    label: 'In Repair',
    icon:  Wrench,
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
  RESOLVED: {
    label: 'Resolved',
    icon:  CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
}

const DEFAULT = { label: 'Unknown', icon: null, badge: 'bg-zinc-100 text-zinc-500' }

const DamageReportStatusBadge = ({ status, showIcon = true, className }) => {
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

export default DamageReportStatusBadge

export const DAMAGE_REPORT_STATUS_OPTIONS = Object.keys(STATUS_CONFIG)