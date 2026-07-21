// src/components/shared/ErrorState.jsx
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Reusable error state — shown when a query fails.
 *
 * @param {{
 *   title?: string,
 *   message?: string,
 *   onRetry?: () => void,
 *   className?: string
 * }} props
 */
const ErrorState = ({
  title       = 'Terjadi kesalahan',
  message,
  onRetry,
  className,
}) => {
  const displayMessage = message
    ?? 'Gagal memuat data. Periksa koneksi Anda dan coba lagi.'

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      className
    )}>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="w-5 h-5 text-destructive" />
      </div>

      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{displayMessage}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'mt-4 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium',
            'border border-input hover:bg-muted transition-colors'
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Coba lagi
        </button>
      )}
    </div>
  )
}

export default ErrorState