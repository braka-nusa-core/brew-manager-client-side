// src/components/shared/EmptyState.jsx
import { cn } from '@/lib/utils'

/**
 * Reusable empty state — shown when a list has no results.
 *
 * @param {{
 *   icon?: React.ReactNode,
 *   title: string,
 *   description?: string,
 *   action?: React.ReactNode,
 *   className?: string
 * }} props
 */
const EmptyState = ({ icon, title, description, action, className }) => (
  <div className={cn(
    'flex flex-col items-center justify-center py-16 px-6 text-center',
    className
  )}>
    {icon && (
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
        {icon}
      </div>
    )}
    <p className="text-sm font-medium text-foreground">{title}</p>
    {description && (
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>
    )}
    {action && (
      <div className="mt-4">{action}</div>
    )}
  </div>
)

export default EmptyState