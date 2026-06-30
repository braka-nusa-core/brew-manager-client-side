// src/features/raw-material/components/RawMaterialDeleteConfirmDialog.jsx
// Confirmation dialog before soft-deleting a raw material.
// Backend: DELETE /raw-materials/:id → 204, sets isActive = false.
// Record preserved — may be referenced by existing ProductRecipe history.
// Mirrors src/features/product/components/ProductDeleteConfirmDialog.jsx exactly.

import { Loader2, AlertTriangle } from 'lucide-react'
import Modal                      from '@/components/shared/Modal'
import { useDeleteRawMaterial }   from '../hooks/useRawMaterials'
import useToast                   from '@/hooks/useToast'
import { cn }                     from '@/lib/utils'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   rawMaterial: Object | null
 * }} props
 */
const RawMaterialDeleteConfirmDialog = ({ open, onClose, rawMaterial }) => {
  const toast          = useToast()
  const deleteMutation = useDeleteRawMaterial()

  const handleConfirm = () => {
    if (!rawMaterial) return

    deleteMutation.mutate(rawMaterial._id, {
      onSuccess: () => {
        toast.success(`${rawMaterial.name} has been removed`)
        onClose()
      },
      onError: (err) => {
        toast.error(
          'Failed to remove raw material',
          err.response?.data?.message ?? 'Please try again'
        )
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remove Raw Material"
      size="sm"
    >
      <div className="space-y-4">
        {/* Warning icon + message */}
        <div className="flex gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Remove{' '}
              <span className="font-semibold">{rawMaterial?.name ?? 'this raw material'}</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              This will deactivate the raw material record. Existing product
              recipes referencing this material will be preserved. This
              action can be reversed by an admin.
            </p>
          </div>
        </div>

        {/* Actions */}
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
            {deleteMutation.isPending ? 'Removing…' : 'Remove Material'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default RawMaterialDeleteConfirmDialog