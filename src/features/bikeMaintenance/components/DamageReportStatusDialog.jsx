// src/features/bikeMaintenance/components/DamageReportStatusDialog.jsx
// Dedicated dialog for changing damage report status.
// Uses PATCH /bike-damage-reports/:id/status — the ONLY way to change status.
// Mirrors BikeStatusDialog pattern exactly.
//
// Transitions: OPEN → IN_REPAIR → RESOLVED (backend does NOT enforce order;
// any→any is accepted. UI shows all 3 options always.)

import { useState, useEffect }        from 'react'
import { Loader2 }                    from 'lucide-react'
import Modal                          from '@/components/shared/Modal'
import DamageReportStatusBadge, {
  DAMAGE_REPORT_STATUS_OPTIONS,
}                                     from './DamageReportStatusBadge'
import { useUpdateDamageReportStatus } from '../hooks/useBikeMaintenance'
import useToast                       from '@/hooks/useToast'
import { cn }                         from '@/lib/utils'

const STATUS_DESCRIPTIONS = {
  OPEN:      'Damage has been reported and is awaiting repair.',
  IN_REPAIR: 'Bike is currently being repaired.',
  RESOLVED:  'Damage has been fully repaired and resolved.',
}

/**
 * @param {{
 *   open:    boolean,
 *   onClose: () => void,
 *   report:  Object | null,  // damage report object: { _id, status, bikeAssetCode, damageType }
 * }} props
 */
const DamageReportStatusDialog = ({ open, onClose, report }) => {
  const toast          = useToast()
  const statusMutation = useUpdateDamageReportStatus()
  const [selected, setSelected] = useState(report?.status ?? 'OPEN')

  useEffect(() => {
    if (open && report) setSelected(report.status ?? 'OPEN')
  }, [open, report])

  const handleClose = () => { onClose() }

  const handleConfirm = () => {
    if (!report || selected === report.status) { handleClose(); return }

    statusMutation.mutate(
      { damageReportId: report._id, status: selected },
      {
        onSuccess: () => {
          toast.success('Status updated', `Report is now ${selected.toLowerCase().replace('_', ' ')}.`)
          handleClose()
        },
        onError: (err) => {
          toast.error('Update failed', err?.response?.data?.message ?? 'Please try again.')
          handleClose()
        },
      }
    )
  }

  if (!report) return null

  const noChange = selected === report.status

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Update Report Status"
      description={
        report.bikeLabel
          ? `Change the status for damage report on ${report.bikeLabel}.`
          : 'Change the status of this damage report.'
      }
      size="sm"
    >
      <div className="space-y-4">
        {/* Current status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Current</span>
          <DamageReportStatusBadge status={report.status} />
        </div>

        {/* Options */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Select new status
          </p>
          {DAMAGE_REPORT_STATUS_OPTIONS.map((status) => {
            const isSelected = selected === status
            const isCurrent  = status === report.status
            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelected(status)}
                disabled={statusMutation.isPending}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  isSelected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                )}
              >
                <span className={cn(
                  'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                  isSelected ? 'border-brand-500' : 'border-muted-foreground/40'
                )}>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-brand-500" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <DamageReportStatusBadge status={status} showIcon={false} />
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

export default DamageReportStatusDialog