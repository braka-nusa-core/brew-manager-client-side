// src/features/cup/components/DeleteConfirmDialog.jsx
// Hard-delete confirmation for draft cup records.
// Backend: DELETE /cups/:id → 204 — draft only.
// Finalized records are rejected with 409 server-side.
// The edit/delete buttons are hidden for finalized records in the table,
// so this dialog should only ever be triggered from a draft record's row menu.
// Mirrors employee/DeleteConfirmDialog pattern exactly.

import { Loader2, AlertTriangle } from 'lucide-react'
import Modal                      from '@/components/shared/Modal'
import { useDeleteCupRecord }     from '../hooks/useCupRecords'
import useToast                   from '@/hooks/useToast'
import { cn }                     from '@/lib/utils'

const toDateValue = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

/**
 * @param {{
 *   open:    boolean,
 *   onClose: () => void,
 *   record:  Object | null,
 * }} props
 */
const DeleteConfirmDialog = ({ open, onClose, record }) => {
  const toast         = useToast()
  const deleteMutation = useDeleteCupRecord()

  const handleConfirm = () => {
    if (!record) return

    deleteMutation.mutate(record._id, {
      onSuccess: () => {
        toast.success('Cup record deleted')
        onClose()
      },
      onError: (err) => {
        toast.error(
          'Failed to delete record',
          err?.response?.data?.message ?? 'Please try again'
        )
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Cup Record"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Delete this cup record?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {record
                ? <>Record dated <span className="font-semibold">{toDateValue(record.date)}</span> will be permanently removed. This cannot be undone.</>
                : 'This record will be permanently removed. This cannot be undone.'
              }
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-destructive hover:bg-destructive/90 text-white transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {deleteMutation.isPending && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            {deleteMutation.isPending ? 'Deleting…' : 'Delete Record'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteConfirmDialog