// src/features/employee/components/DeleteConfirmDialog.jsx
// Confirmation dialog before soft-deleting an employee.
// Backend: DELETE /employees/:id → 204, sets isActive = false.
// Employee record is preserved for payroll history.

import { Loader2, AlertTriangle } from 'lucide-react'
import Modal                      from '@/components/shared/Modal'
import { useDeleteEmployee }      from '../hooks/useEmployees'
import useToast                   from '@/hooks/useToast'
import { cn }                     from '@/lib/utils'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   employee: Object | null
 * }} props
 */
const DeleteConfirmDialog = ({ open, onClose, employee }) => {
  const toast          = useToast()
  const deleteMutation = useDeleteEmployee()

  const handleConfirm = () => {
    if (!employee) return

    deleteMutation.mutate(employee._id, {
      onSuccess: () => {
        toast.success(`${employee.name} has been removed`)
        onClose()
      },
      onError: (err) => {
        toast.error(
          'Failed to remove employee',
          err.response?.data?.message ?? 'Please try again'
        )
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remove Employee"
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
              <span className="font-semibold">{employee?.name ?? 'this employee'}</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              This will deactivate the employee record. Their payroll and
              attendance history will be preserved. This action can be
              reversed by an admin.
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
            {deleteMutation.isPending ? 'Removing…' : 'Remove Employee'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteConfirmDialog