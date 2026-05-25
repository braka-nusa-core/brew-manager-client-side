// src/features/sales/components/PaymentMethodBadge.jsx
// Displays payment method as a colored badge.
// Matches backend enum: 'cash' | 'transfer' | 'qris'
// Mirrors the AttendanceStatusBadge pattern — STATUS_CONFIG + exported constants.

import { Banknote, ArrowLeftRight, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

const METHOD_CONFIG = {
  cash: {
    label: 'Cash',
    icon:  Banknote,
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    dot:   'bg-emerald-500',
  },
  transfer: {
    label: 'Transfer',
    icon:  ArrowLeftRight,
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    dot:   'bg-blue-400',
  },
  qris: {
    label: 'QRIS',
    icon:  QrCode,
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
    dot:   'bg-violet-400',
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
 *   method: 'cash'|'transfer'|'qris',
 *   showIcon?: boolean,
 *   className?: string
 * }} props
 */
const PaymentMethodBadge = ({ method, showIcon = true, className }) => {
  const config = METHOD_CONFIG[method] ?? DEFAULT
  const Icon   = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        config.badge,
        className
      )}
    >
      {showIcon && Icon && <Icon className="w-3 h-3 shrink-0" />}
      {config.label}
    </span>
  )
}

export default PaymentMethodBadge

// Export constants so other components can use them (e.g. filter dropdowns)
export const PAYMENT_METHODS = Object.keys(METHOD_CONFIG)
export { METHOD_CONFIG }