// src/components/shared/Modal.jsx
import * as Dialog from '@radix-ui/react-dialog'
import { X }       from 'lucide-react'
import { cn }      from '@/lib/utils'

const Modal = ({ open, onClose, title, description, children, footer, size = 'md', className }) => {
  const widthMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[calc(100%-2rem)] bg-card border border-border rounded-xl shadow-xl',
            // Constrain to viewport height and lay out as a column so the
            // header/footer can stay pinned while only the middle (body)
            // section scrolls — prevents tall content (e.g. a long form)
            // from overflowing past the viewport on desktop/laptop screens.
            'flex flex-col max-h-[85vh]',
            'focus:outline-none',
            widthMap[size],
            className
          )}
          onInteractOutside={(e) => { e.preventDefault(); onClose() }}
        >
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border shrink-0">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-foreground leading-tight">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-muted-foreground mt-0.5 leading-snug">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          {/* Body — the only scrollable region. min-h-0 is required inside
              a flex column for overflow-y-auto to actually take effect
              instead of the column growing to fit its content. */}
          <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">{children}</div>

          {/* Footer is optional — existing callers that don't pass it are
              unaffected (nothing renders, same as before this change). */}
          {footer && (
            <div className="px-6 py-4 border-t border-border shrink-0">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default Modal