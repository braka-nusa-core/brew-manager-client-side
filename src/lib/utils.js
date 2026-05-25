import { clsx }        from 'clsx'
import { twMerge }     from 'tailwind-merge'

/**
 * Merges Tailwind class names safely.
 * Combines clsx (conditional classes) with tailwind-merge
 * (deduplication of conflicting Tailwind utilities).
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-brand', className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
