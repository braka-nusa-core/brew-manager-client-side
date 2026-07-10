// src/features/bike/components/BikeStatusDialog.jsx
// Dedicated dialog for changing a bike's operational STATUS.
//
// Status must NEVER be changed via the edit form — this dedicated
// endpoint (PATCH /:bikeId/status) is the only allowed path.
// Mirrors the backend's convention of separating status transitions
// from generic field updates (same as Employee /toggle-active, Cup /finalize).
//
// Business rule (enforced server-side, surfaced here):
//   A bike cannot be set to ACTIVE while it has any BikeDamageReport
//   with status OPEN or IN_REPAIR. Backend returns 400 with a clear
//   message including the unresolved count.
//   The UI surfaces this inline (not a transient toast) so the user
//   can read and act on it.
//
// Status options: ACTIVE | MAINTENANCE | RETIRED
//   ACTIVE      — bike is operational and can be assigned
//   MAINTENANCE — bike is being serviced (non-blocking for history)
//   RETIRED     — permanently taken out of service (isActive stays true)

import { useState, useEffect }         from 'react'
import { Loader2, Wrench }             from 'lucide-react'
import Modal                           from '@/components/shared/Modal'
import BikeStatusBadge, { BIKE_STATUS_OPTIONS } from './BikeStatusBadge'
import { useUpdateBikeStatus }         from '../hooks/useBikes'
import useToast                        from '@/hooks/useToast'
import { cn }                          from '@/lib/utils'

const STATUS_DESCRIPTIONS = {
  ACTIVE:      'Bike is operational and available for assignments.',
  MAINTENANCE: 'Bike is being serviced. Still visible in history.',
  RETIRED:     'Bike is permanently out of service. Record is preserved.',
}

const BikeStatusDialog = ({ open, onClose, bike }) => {
  const toast         = useToast()
  const statusMutation = useUpdateBikeStatus()
  const [selected, setSelected] = useState(bike?.status ?? 'ACTIVE')
  const [inlineError, setInlineError] = useState('')

  // Sync selected to bike's current status when dialog opens
  useEffect(() => {
    if (open && bike) {
      setSelected(bike.status ?? 'ACTIVE')
      setInlineError('')
    }
  }, [open, bike])

  const handleClose = () => {
    setInlineError('')
    onClose()
  }

  const handleConfirm = () => {
    if (!bike || selected === bike.status) {
      handleClose()
      return
    }

    setInlineError('')
    statusMutation.mutate(
      { bikeId: bike._id, status: selected },
      {
        onSuccess: () => {
          toast.success(
            'Status updated',
            `${bike.name} is now ${selected.toLowerCase()}.`
          )
          handleClose()
        },
        onError: (err) => {
          const msg = err?.response?.data?.message ?? 'Could not update status. Please try again.'
          // 400 = business rule (open damage reports blocking ACTIVE transition)
          // Surface inline so user can read and act on it.
          if (err?.response?.status === 400) {
            setInlineError(msg)
          } else {
            toast.error('Status update failed', msg)
            handleClose()
          }
        },
      }
    )
  }

  if (!bike) return null

  const noChange = selected === bike.status

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Change Bike Status"
      description={`Update the operational status of ${bike.name} (${bike.assetCode}).`}
      size="sm"
    >
      <div className="space-y-4">

        {/* Current status display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Current</span>
          <BikeStatusBadge status={bike.status} />
        </div>

        {/* Status options */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Select new status
          </p>
          {BIKE_STATUS_OPTIONS.map((status) => {
            const isSelected = selected === status
            const isCurrent  = status === bike.status
            return (
              <button
                key={status}
                type="button"
                onClick={() => { setSelected(status); setInlineError('') }}
                disabled={statusMutation.isPending}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  isSelected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                )}
              >
                {/* Radio dot */}
                <span className={cn(
                  'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                  isSelected ? 'border-brand-500' : 'border-muted-foreground/40'
                )}>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <BikeStatusBadge status={status} showIcon={false} />
                    {isCurrent && (
                      <span className="text-[10px] text-muted-foreground">(current)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {STATUS_DESCRIPTIONS[status]}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Inline error — shown for 400 (damage report blocker) */}
        {inlineError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Wrench className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">{inlineError}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={statusMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={statusMutation.isPending || noChange}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {statusMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {statusMutation.isPending ? 'Updating…' : noChange ? 'No Change' : 'Update Status'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default BikeStatusDialog