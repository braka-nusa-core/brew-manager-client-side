// src/features/bikeMaintenance/components/RepairRecordFormModal.jsx
// Handles CREATE and EDIT for repair records.
//
// CREATE body: { damageReportId, repairDate, cost, notes? }
//   NEVER send: tenantId, repairStatus (defaults IN_PROGRESS)
//
// EDIT body: { repairStatus?, cost?, notes? } — at least one required
//   damageReportId is immutable on edit.
//
// Optional `damageReportId` prop:
//   Provided → field is pre-filled and locked (user came from Damage Reports table).
//   Not provided → user sees a <select> to pick a damage report.
//
// Optional `damageReportLabel` prop:
//   Display string for the locked field: "BK-001 — Ban Bocor (OPEN)"
//
// cost: uses RupiahInput (IDR currency, integer stored in RHF).
//
// Pattern: SalesFormModal (RupiahInput + create/edit schemas).

import { useEffect, useState }              from 'react'
import { useForm }                          from 'react-hook-form'
import { zodResolver }                      from '@hookform/resolvers/zod'
import { z }                                from 'zod'
import { Loader2 }                          from 'lucide-react'

import Modal                                from '@/components/shared/Modal'
import FormField, { Input }                 from '@/components/shared/FormField'
import RupiahInput                          from '@/components/shared/RupiahInput'
import {
  useCreateRepairRecord,
  useUpdateRepairRecord,
  useDamageReports,
}                                           from '../hooks/useBikeMaintenance'
import { useBikes }                         from '@/features/bike/hooks/useBikes'
import useToast                             from '@/hooks/useToast'
import { DAMAGE_TYPE_LABELS }               from './DamageReportFormModal'
import { REPAIR_STATUS_OPTIONS }            from './RepairStatusBadge'
import { cn }                               from '@/lib/utils'

// ── Zod schemas ────────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

const createSchema = z.object({
  damageReportId: z.string().regex(OBJECT_ID_RE, 'Select a damage report'),
  repairDate:     z.string().min(1, 'Repair date is required'),
  cost: z
    .number({ required_error: 'Cost is required', invalid_type_error: 'Enter a valid amount' })
    .min(0, 'Cost cannot be negative'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
})

const editSchema = z.object({
  repairStatus: z.enum(REPAIR_STATUS_OPTIONS).optional(),
  cost: z.union([
    z.number({ invalid_type_error: 'Enter a valid amount' }).min(0, 'Cost cannot be negative'),
    z.literal(''),
  ]).optional(),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
}).refine(
  (d) => d.repairStatus !== undefined || (d.cost !== undefined && d.cost !== '') || d.notes !== undefined,
  { message: 'Provide at least one field to update' }
)

// ── Helpers ────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const toDateValue = (iso) => {
  if (!iso) return ''
  try { return new Date(iso).toISOString().split('T')[0] } catch { return '' }
}

const getCreateDefaults = (prefillDamageReportId) => ({
  damageReportId: prefillDamageReportId ?? '',
  repairDate:     today(),
  cost:           '',
  notes:          '',
})

const getEditDefaults = (record) => ({
  repairStatus: record?.repairStatus ?? 'IN_PROGRESS',
  cost:         record?.cost         ?? '',
  notes:        record?.notes        ?? '',
})

// ── Component ──────────────────────────────────────────────────

/**
 * @param {{
 *   open:                boolean,
 *   onClose:             () => void,
 *   record:              Object|null,          // null = create, object = edit
 *   damageReportId:      string|undefined,     // pre-fill + lock when coming from damage table
 *   damageReportLabel:   string|undefined,     // display label for locked field
 * }} props
 */
const RepairRecordFormModal = ({
  open,
  onClose,
  record          = null,
  damageReportId  = undefined,
  damageReportLabel = undefined,
}) => {
  const isEdit    = Boolean(record)
  const isLocked  = Boolean(damageReportId) && !isEdit
  const toast     = useToast()

  const createMutation = useCreateRepairRecord()
  const updateMutation = useUpdateRepairRecord()
  const isPending      = createMutation.isPending || updateMutation.isPending

  // Fetch damage reports for selector (only when NOT locked and NOT in edit mode)
  const { data: drData, isLoading: drLoading } = useDamageReports(
    { limit: 100 },
  )
  const damageReports = drData?.data ?? []

  // Fetch bikes to build a bikeId → assetCode map for damage report labels
  const { data: bikesData } = useBikes({ limit: 200 })
  const bikeMap = new Map((bikesData?.data ?? []).map((b) => [b._id.toString(), b]))

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(record) : getCreateDefaults(damageReportId),
  })

  useEffect(() => {
    if (!open) return
    reset(isEdit ? getEditDefaults(record) : getCreateDefaults(damageReportId))
  }, [open, isEdit, record, damageReportId, reset])

  const onSubmit = (data) => {
    if (isEdit) {
      // notes: null to clear; only send defined fields
      const payload = {}
      if (data.repairStatus !== undefined)    payload.repairStatus = data.repairStatus
      if (data.cost !== undefined && data.cost !== '') payload.cost = data.cost
      if (data.notes !== undefined)           payload.notes = data.notes || null

      updateMutation.mutate(
        { repairRecordId: record._id, payload },
        {
          onSuccess: () => { toast.success('Repair record updated'); onClose() },
          onError: (err) => {
            toast.error('Update failed', err?.response?.data?.message ?? 'Please try again.')
          },
        }
      )
    } else {
      const payload = {
        damageReportId: data.damageReportId,
        repairDate:     data.repairDate,
        cost:           data.cost,
        ...(data.notes ? { notes: data.notes } : {}),
      }

      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Repair record created'); onClose() },
        onError: (err) => {
          toast.error(
            'Failed to create record',
            err?.response?.data?.message ?? 'Please try again.'
          )
        },
      })
    }
  }

  // Build label for a damage report option in the selector
  const getDRLabel = (dr) => {
    const bikeIdStr = dr.bikeId?.toString?.() ?? dr.bikeId ?? ''
    const bike      = bikeMap.get(bikeIdStr)
    const code      = bike?.assetCode ?? bikeIdStr.slice(-6)
    const typeLabel = DAMAGE_TYPE_LABELS[dr.damageType] ?? dr.damageType
    return `${code} — ${typeLabel} (${dr.status})`
  }

  // Resolve label for locked edit-mode context
  const editDRLabel = isEdit && record?.damageReportId
    ? (() => {
        const drIdStr = record.damageReportId?.toString?.() ?? record.damageReportId ?? ''
        const dr      = damageReports.find((d) => d._id === drIdStr || d._id?.toString() === drIdStr)
        return dr ? getDRLabel(dr) : drIdStr.slice(-8)
      })()
    : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Repair Record' : 'Add Repair Record'}
      description={
        isEdit
          ? 'Update the repair status, cost, or notes.'
          : 'Log a repair attempt for a damage report.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* Damage Report selector / locked display / edit read-only */}
          {!isEdit && (
            <FormField label="Damage Report" error={errors.damageReportId?.message} required>
              {isLocked ? (
                // Pre-filled from damage reports table row
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-input text-sm">
                  <span className="font-medium text-foreground truncate">
                    {damageReportLabel ?? damageReportId?.slice(-8) ?? '—'}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-auto shrink-0">(locked)</span>
                </div>
              ) : (
                // Free selection from <select>
                <select
                  {...register('damageReportId')}
                  disabled={isPending || drLoading}
                  className={cn(
                    'w-full h-10 px-3 rounded-md border bg-background text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                    errors.damageReportId?.message ? 'border-destructive' : 'border-input'
                  )}
                >
                  <option value="">Select damage report…</option>
                  {damageReports.map((dr) => (
                    <option key={dr._id} value={dr._id}>
                      {getDRLabel(dr)}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          )}

          {/* Edit mode: show damage report context as read-only */}
          {isEdit && (
            <div className="p-3 rounded-lg bg-muted/40 text-sm">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
                Damage Report
              </p>
              <p className="font-medium text-foreground">
                {editDRLabel ?? record?.damageReportId?.toString?.()?.slice(-8) ?? '—'}
              </p>
            </div>
          )}

          {/* Repair Status (edit only — create defaults to IN_PROGRESS) */}
          {isEdit && (
            <FormField label="Repair Status" error={errors.repairStatus?.message}>
              <select
                {...register('repairStatus')}
                disabled={isPending}
                className={cn(
                  'w-full h-10 px-3 rounded-md border bg-background text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                  errors.repairStatus?.message ? 'border-destructive' : 'border-input'
                )}
              >
                {REPAIR_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {/* Repair Date (create only — immutable after creation) */}
          {!isEdit && (
            <FormField label="Repair Date" error={errors.repairDate?.message} required>
              <Input
                {...register('repairDate')}
                type="date"
                error={!!errors.repairDate?.message}
                disabled={isPending}
              />
            </FormField>
          )}

          {/* Cost (IDR) */}
          <FormField
            label="Repair Cost (IDR)"
            error={errors.cost?.message}
            required={!isEdit}
          >
            <RupiahInput
              control={control}
              name="cost"
              placeholder="e.g. 150.000"
              error={!!errors.cost?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              placeholder="Optional notes about this repair…"
              disabled={isPending}
              rows={2}
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-background text-sm',
                'placeholder:text-muted-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                errors.notes?.message ? 'border-destructive' : 'border-input'
              )}
            />
          </FormField>

        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending
              ? (isEdit ? 'Saving…' : 'Creating…')
              : (isEdit ? 'Save Changes' : 'Add Record')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default RepairRecordFormModal