// src/features/payroll/components/PayrollStatusBadge.jsx
// Displays payroll status as a colored badge.
// Matches backend enum: 'draft' | 'approved' | 'paid'
// Mirrors AttendanceStatusBadge and PaymentMethodBadge patterns.

import { FileText, CheckCircle2, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    icon:  FileText,
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    dot:   'bg-zinc-400',
  },
  approved: {
    label: 'Approved',
    icon:  CheckCircle2,
    badge: 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400',
    dot:   'bg-brand-500',
  },
  paid: {
    label: 'Paid',
    icon:  Banknote,
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    dot:   'bg-emerald-500',
  },
}

const DEFAULT = {
  label: 'Unknown',
  icon:  null,
  badge: 'bg-zinc-100 text-zinc-500',
  dot:   'bg-zinc-300',
}

/**
 * @param {{
 *   status: 'draft'|'approved'|'paid',
 *   showIcon?: boolean,
 *   className?: string
 * }} props
 */
const PayrollStatusBadge = ({ status, showIcon = true, className }) => {
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

export default PayrollStatusBadge

export const PAYROLL_STATUSES = Object.keys(STATUS_CONFIG)
export { STATUS_CONFIG as PAYROLL_STATUS_CONFIG }