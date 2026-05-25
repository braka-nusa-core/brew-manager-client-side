// src/components/shared/Modal.jsx
import * as Dialog from '@radix-ui/react-dialog'
import { X }       from 'lucide-react'
import { cn }      from '@/lib/utils'

const Modal = ({ open, onClose, title, description, children, size = 'md', className }) => {
  const widthMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[calc(100%-2rem)] bg-card border border-border rounded-xl shadow-xl',
            'focus:outline-none',
            widthMap[size],
            className
          )}
          onInteractOutside={(e) => { e.preventDefault(); onClose() }}
        >
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
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
          <div className="px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default Modal