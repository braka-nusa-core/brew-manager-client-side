// src/components/shared/ToastContainer.jsx
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToastStore } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />,
  error:   <XCircle      className="w-4 h-4 text-destructive shrink-0 mt-0.5" />,
  info:    <Info         className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
}

const BORDER = {
  success: 'border-l-brand-500',
  error:   'border-l-destructive',
  info:    'border-l-blue-500',
}

const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 p-3.5 pr-3 rounded-lg border border-l-4 shadow-lg',
            'bg-card text-foreground animate-fade-in',
            BORDER[toast.type] ?? BORDER.info
          )}
        >
          {ICONS[toast.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default ToastContainer