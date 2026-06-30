// src/features/product-recipe/components/DeleteRecipeConfirmDialog.jsx
// Confirmation dialog before deleting a product's recipe entirely.
// Backend: DELETE /products/:productId/recipe → 204, removes the
// ProductRecipe document and resets Product.cachedHPP to 0.
// Mirrors ProductDeleteConfirmDialog.jsx / RawMaterialDeleteConfirmDialog.jsx.

import { Loader2, AlertTriangle } from 'lucide-react'
import Modal                       from '@/components/shared/Modal'
import { useDeleteProductRecipe }  from '../hooks/useProductRecipe'
import useToast                    from '@/hooks/useToast'
import { cn }                      from '@/lib/utils'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   productId: string,
 *   productName?: string
 * }} props
 */
const DeleteRecipeConfirmDialog = ({ open, onClose, productId, productName }) => {
  const toast          = useToast()
  const deleteMutation = useDeleteProductRecipe()

  const handleConfirm = () => {
    if (!productId) return

    deleteMutation.mutate(productId, {
      onSuccess: () => {
        toast.success('Recipe removed', 'Cost (HPP) has been reset to Rp 0')
        onClose()
      },
      onError: (err) => {
        toast.error(
          'Failed to remove recipe',
          err.response?.data?.message ?? 'Please try again'
        )
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remove Recipe"
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
              Remove the recipe for{' '}
              <span className="font-semibold">{productName ?? 'this product'}</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              This will delete all recipe items and reset this product's
              Cost (HPP) to Rp 0. You can add a new recipe again at any time.
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
            {deleteMutation.isPending ? 'Removing…' : 'Remove Recipe'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteRecipeConfirmDialog