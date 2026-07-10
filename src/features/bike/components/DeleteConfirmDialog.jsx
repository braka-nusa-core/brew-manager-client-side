// src/features/bike/components/DeleteConfirmDialog.jsx
// Soft-delete confirmation for bikes.
// Backend: DELETE /bikes/:bikeId → 204, sets isActive: false.
// The bike record is preserved for assignment and maintenance history.
// Mirrors employee/DeleteConfirmDialog pattern.

import { Loader2, AlertTriangle } from 'lucide-react'
import Modal                      from '@/components/shared/Modal'
import { useDeleteBike }          from '../hooks/useBikes'
import useToast                   from '@/hooks/useToast'
import { cn }                     from '@/lib/utils'

const DeleteConfirmDialog = ({ open, onClose, bike }) => {
  const toast         = useToast()
  const deleteMutation = useDeleteBike()

  const handleConfirm = () => {
    if (!bike) return
    deleteMutation.mutate(bike._id, {
      onSuccess: () => {
        toast.success(`${bike.name} has been removed`)
        onClose()
      },
      onError: (err) => {
        toast.error(
          'Failed to remove bike',
          err?.response?.data?.message ?? 'Please try again'
        )
      },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Remove Bike" size="sm">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Remove{' '}
              <span className="font-semibold">{bike?.name ?? 'this bike'}</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {bike?.assetCode && (
                <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded mr-1">
                  {bike.assetCode}
                </span>
              )}
              This will deactivate the bike record. Assignment and maintenance
              history will be preserved. This can be reversed by an admin.
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
            {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {deleteMutation.isPending ? 'Removing…' : 'Remove Bike'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteConfirmDialog