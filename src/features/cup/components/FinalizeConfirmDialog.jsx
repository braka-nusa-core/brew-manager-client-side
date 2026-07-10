// src/features/cup/components/FinalizeConfirmDialog.jsx
// Confirmation dialog before finalizing a cup record.
//
// Finalization is permanent — record becomes immutable (no edit, no delete).
// Backend enforces that ALL items must be balanced before it accepts finalize:
//   carried (distributed + refill) === accounted (sold + returned + reject)
//   for every item. If any item fails, the backend returns 400 with:
//   { message: string, errors: string[] }
//   where errors[] is a per-product breakdown like:
//   ["Product A: carried=5, accounted=3, difference=2", ...]
//
// We surface those error strings directly in the dialog (below the warning)
// so the user knows exactly which products need to be fixed before retrying.
// Record stays in draft on failure — the user must close and edit then retry.

import { useState }             from 'react'
import { Loader2, Lock, AlertTriangle } from 'lucide-react'
import Modal                    from '@/components/shared/Modal'
import { useFinalizeCupRecord } from '../hooks/useCupRecords'
import useToast                 from '@/hooks/useToast'
import { cn }                   from '@/lib/utils'

/**
 * @param {{
 *   open:    boolean,
 *   onClose: () => void,
 *   record:  Object | null,
 * }} props
 */
const FinalizeConfirmDialog = ({ open, onClose, record }) => {
  const toast           = useToast()
  const finalizeMutation = useFinalizeCupRecord()
  const [balanceErrors, setBalanceErrors] = useState([])

  const handleClose = () => {
    setBalanceErrors([])
    onClose()
  }

  const handleConfirm = () => {
    if (!record) return
    setBalanceErrors([])

    finalizeMutation.mutate(record._id, {
      onSuccess: () => {
        toast.success('Cup record finalized', 'This record is now locked and cannot be edited.')
        handleClose()
      },
      onError: (err) => {
        const status = err?.response?.status
        const data   = err?.response?.data

        if (status === 400 && Array.isArray(data?.errors)) {
          // Balance errors — show inline instead of a transient toast
          // so the user can read each line and know what to fix.
          setBalanceErrors(data.errors)
        } else {
          toast.error(
            'Finalization failed',
            data?.message ?? 'Please try again.'
          )
          handleClose()
        }
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Finalize Cup Record"
      size="sm"
    >
      <div className="space-y-4">

        {/* Warning block */}
        <div className="flex gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 shrink-0">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Finalize this record?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              This will permanently lock the record. It cannot be edited or deleted
              after finalization. All product quantities must be balanced first.
            </p>
          </div>
        </div>

        {/* Balance error breakdown — shown when the backend returns 400 */}
        {balanceErrors.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <p className="text-xs font-semibold">
                Unbalanced products — fix these before finalizing:
              </p>
            </div>
            <ul className="space-y-1">
              {balanceErrors.map((msg, i) => (
                <li key={i} className="text-xs text-destructive/90 pl-5 list-disc list-inside">
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={finalizeMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            {balanceErrors.length > 0 ? 'Close & Fix' : 'Cancel'}
          </button>

          <button
            onClick={handleConfirm}
            disabled={finalizeMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-amber-500 hover:bg-amber-600 text-white transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {finalizeMutation.isPending && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            {finalizeMutation.isPending ? 'Finalizing…' : 'Finalize'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default FinalizeConfirmDialog