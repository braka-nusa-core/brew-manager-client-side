// src/components/shared/Pagination.jsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Reusable pagination controls.
 * Used by all list pages. Stateless — parent controls page.
 *
 * @param {{
 *   page: number,
 *   totalPages: number,
 *   total: number,
 *   limit: number,
 *   onPageChange: (page: number) => void,
 *   isLoading?: boolean,
 *   className?: string
 * }} props
 */
const Pagination = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  isLoading = false,
  className,
}) => {
  if (totalPages <= 1 && total <= limit) return null

  const from  = Math.min((page - 1) * limit + 1, total)
  const to    = Math.min(page * limit, total)

  // Build visible page numbers — show max 5 around current page
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages = new Set([1, totalPages, page])
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.add(i)
    }

    return [...pages].sort((a, b) => a - b).reduce((acc, curr, idx, arr) => {
      if (idx > 0 && curr - arr[idx - 1] > 1) acc.push('...')
      acc.push(curr)
      return acc
    }, [])
  }

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 pt-4',
      className
    )}>
      {/* Count */}
      <p className="text-xs text-muted-foreground shrink-0">
        {total === 0
          ? 'Tidak ada hasil'
          : `Menampilkan ${from}–${to} dari ${total}`
        }
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-md border border-input',
            'text-sm transition-colors',
            'hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed'
          )}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={isLoading}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-md text-sm transition-colors',
                p === page
                  ? 'bg-brand-500 text-brand-950 font-semibold border border-brand-500'
                  : 'border border-input hover:bg-muted disabled:opacity-40'
              )}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-md border border-input',
            'text-sm transition-colors',
            'hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed'
          )}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default Pagination