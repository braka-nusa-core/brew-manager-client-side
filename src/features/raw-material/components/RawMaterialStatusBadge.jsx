// src/features/raw-material/components/RawMaterialStatusBadge.jsx
// Duplicated per-feature, matching the established convention
// (EmployeeStatusBadge, OutletStatusBadge, ProductStatusBadge are
// all near-identical, intentionally not shared cross-feature).
import { cn } from '@/lib/utils'

/**
 * Displays raw material active/inactive status as a badge.
 *
 * @param {{ isActive: boolean, className?: string }} props
 */
const RawMaterialStatusBadge = ({ isActive, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
      isActive
        ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400'
        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
      className
    )}
  >
    <span className={cn(
      'w-1.5 h-1.5 rounded-full',
      isActive ? 'bg-brand-500' : 'bg-zinc-400'
    )} />
    {isActive ? 'Active' : 'Inactive'}
  </span>
)

export default RawMaterialStatusBadge