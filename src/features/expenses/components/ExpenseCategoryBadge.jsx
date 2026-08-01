import { cn } from '@/lib/utils'
import {
  ShoppingCart,
  Zap,
  Wrench,
  Users,
  Megaphone,
  Settings,
  HelpCircle,
} from 'lucide-react'

// ── Category config ───────────────────────────────────────────
// Update this if backend EXPENSE_CATEGORIES changes.

const CATEGORY_CONFIG = {
  ingredient: {
    label: 'Bahan Baku',
    icon:  ShoppingCart,
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
  utility: {
    label: 'Utilitas',
    icon:  Zap,
    badge: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400',
  },
  maintenance: {
    label: 'Pemeliharaan',
    icon:  Wrench,
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  },
  salary: {
    label: 'Gaji',
    icon:  Users,
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  },
  marketing: {
    label: 'Marketing',
    icon:  Megaphone,
    badge: 'bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400',
  },
  other: {
    label: 'Lainnya',
    icon:  HelpCircle,
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
}

const DEFAULT_CONFIG = {
  label: 'Tidak Diketahui',
  icon:  HelpCircle,
  badge: 'bg-zinc-100 text-zinc-500',
}


const ExpenseCategoryBadge = ({ category, showIcon = true, className }) => {
  const config = CATEGORY_CONFIG[category] ?? DEFAULT_CONFIG
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

export default ExpenseCategoryBadge

// Export for use in filter dropdowns and Zod schemas
export const EXPENSE_CATEGORIES = Object.keys(CATEGORY_CONFIG)
export { CATEGORY_CONFIG }