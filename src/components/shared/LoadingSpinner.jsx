import { cn } from '@/lib/utils'

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

/**
 * Reusable loading spinner.
 * Uses brand lime green for the active arc.
 *
 * @param {{ size?: 'sm'|'md'|'lg', className?: string }} props
 */
const LoadingSpinner = ({ size = 'md', className }) => (
  <div
    role="status"
    aria-label="Memuat"
    className={cn(
      'rounded-full border-muted border-t-brand-500 animate-spin',
      sizeMap[size],
      className
    )}
  />
)

export default LoadingSpinner