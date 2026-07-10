// src/features/bikeAssignment/components/EndAssignmentDialog.jsx
// Confirm ending an active bike assignment.
// Backend: PATCH /bike-assignments/:assignmentId/end → no body → sets endDate = now.
// 409 if already ended (shouldn't happen via UI but handled defensively).
//
// Props include assignment metadata for user-facing confirmation text
// since the /active endpoint doesn't return _id — the page resolves
// the assignmentId separately and passes it here.

import { Loader2, LogOut } from 'lucide-react'
import Modal               from '@/components/shared/Modal'
import { useEndAssignment } from '../hooks/useBikeAssignments'
import useToast            from '@/hooks/useToast'
import { cn }              from '@/lib/utils'

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

/**
 * @param {{
 *   open:         boolean,
 *   onClose:      () => void,
 *   assignmentId: string | null,   // _id from GET / (not from /active)
 *   meta: {
 *     bikeName:   string,
 *     assetCode:  string,
 *     riderName:  string,
 *     startDate:  string,
 *   } | null,
 * }} props
 */
const EndAssignmentDialog = ({ open, onClose, assignmentId, meta }) => {
  const toast      = useToast()
  const endMutation = useEndAssignment()

  const handleConfirm = () => {
    if (!assignmentId) return
    endMutation.mutate(assignmentId, {
      onSuccess: () => {
        toast.success('Assignment ended', `${meta?.bikeName ?? 'Bike'} has been unassigned.`)
        onClose()
      },
      onError: (err) => {
        toast.error(
          'Failed to end assignment',
          err?.response?.data?.message ?? 'Please try again.'
        )
      },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="End Assignment" size="sm">
      <div className="space-y-4">

        {/* Icon + message */}
        <div className="flex gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 shrink-0">
            <LogOut className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              End this assignment?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              The bike will be unassigned from the rider. This action is recorded
              and the history is preserved.
            </p>
          </div>
        </div>

        {/* Assignment summary */}
        {meta && (
          <div className="rounded-lg bg-muted/40 divide-y divide-border text-sm">
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Bike</span>
              <span className="font-medium">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-1.5">
                  {meta.assetCode}
                </span>
                {meta.bikeName}
              </span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Rider</span>
              <span className="font-medium">{meta.riderName}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Since</span>
              <span className="font-medium">{formatDate(meta.startDate)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={endMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={endMutation.isPending || !assignmentId}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-amber-500 hover:bg-amber-600 text-white transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {endMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {endMutation.isPending ? 'Ending…' : 'End Assignment'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default EndAssignmentDialog