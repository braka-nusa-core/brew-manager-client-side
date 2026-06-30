// src/features/outlet/components/OutletStatusBadge.jsx
import { cn } from '@/lib/utils'

const OutletStatusBadge = ({ isActive, className }) => (
  <span className={cn(
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400'
      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
    className
  )}>
    <span className={cn(
      'w-1.5 h-1.5 rounded-full shrink-0',
      isActive ? 'bg-brand-500' : 'bg-zinc-400'
    )} />
    {isActive ? 'Active' : 'Inactive'}
  </span>
)

export default OutletStatusBadge