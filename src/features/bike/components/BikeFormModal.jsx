// src/features/bike/components/BikeFormModal.jsx
// Handles both CREATE and EDIT in one modal.
//
// Backend contract (bike.validation.js + bike.service.js):
//
// CREATE body: { outletId, assetCode, name, notes? }
//   - status FORBIDDEN — always defaults to ACTIVE. Backend 400s if sent.
//   - assetCode auto-uppercased server-side; unique per tenant → 409.
//   - Manager role can only create in their own outlet (backend enforces).
//
// EDIT body: { name?, assetCode?, notes?, outletId? } — at least one required.
//   - status, isActive, tenantId all FORBIDDEN — backend 400s.
//   - notes: null clears the field (backend: data.notes?.trim() ?? null).
//   - Backend technically allows outletId on update, but this form no
//     longer offers outlet reassignment — see Working Outlet note below.
//
// Working Outlet architecture:
//   There is no outlet selector in this form at all (create OR edit).
//   outletId always comes from useEffectiveOutletId() — the same single
//   source of truth the Navbar's Outlet Switcher writes to. Both create
//   and update always send outletId = the Working Outlet; for edit this
//   is never a reassignment — the Bikes list is already filtered by the
//   Working Outlet, so a bike opened for edit already belongs to it.
//   Transferring a bike to a different outlet is out of scope for this
//   form (a future dedicated feature would own that). If no Working
//   Outlet is selected ("All Outlets"), both create and edit are blocked.
//
// Pattern: EmployeeFormModal + CupRecordFormModal.

import { useEffect }                          from 'react'
import { useForm }                            from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2, TriangleAlert }             from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input }                   from '@/components/shared/FormField'
import { useCreateBike, useUpdateBike }       from '../hooks/useBikes'
import { useEffectiveOutletId }               from '@/store/activeOutletStore'
import useToast                               from '@/hooks/useToast'
import { cn }                                 from '@/lib/utils'

// ── Zod schemas ───────────────────────────────────────────────
//
// outletId is intentionally NOT a field here — see file header.

const createSchema = z.object({
  assetCode: z.string()
    .min(2,  'Asset code must be at least 2 characters')
    .max(20, 'Asset code must not exceed 20 characters'),
  name: z.string()
    .min(2,  'Name must be at least 2 characters')
    .max(100,'Name must not exceed 100 characters'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
})

const editSchema = z.object({
  assetCode: z.string().min(2).max(20).optional().or(z.literal('')),
  name:      z.string().min(2).max(100).optional().or(z.literal('')),
  notes:     z.string().max(500, 'Notes too long').optional().or(z.literal('')),
})

// ── Helpers ───────────────────────────────────────────────────

const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

const getCreateDefaults = () => ({
  assetCode: '',
  name:      '',
  notes:     '',
})

const getEditDefaults = (bike) => ({
  assetCode: bike?.assetCode ?? '',
  name:      bike?.name      ?? '',
  notes:     bike?.notes     ?? '',
})

// ── Component ─────────────────────────────────────────────────

const BikeFormModal = ({ open, onClose, bike = null }) => {
  const isEdit = Boolean(bike)
  const toast  = useToast()

  // The single source of truth for outlet — no local outlet state, no
  // form field, no AsyncSearchSelect. Same store the Navbar's Outlet
  // Switcher writes to. null = "All Outlets".
  const effectiveOutletId = useEffectiveOutletId()
  const hasWorkingOutlet  = !!effectiveOutletId

  const createMutation = useCreateBike()
  const updateMutation = useUpdateBike()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(bike) : getCreateDefaults(),
  })

  useEffect(() => {
    if (!open) return
    reset(isEdit ? getEditDefaults(bike) : getCreateDefaults())
  }, [open, isEdit, bike, reset])

  const onSubmit = (data) => {
    // No Working Outlet selected ("All Outlets") — not a valid context
    // for this form in either mode. Blocked in the UI below, but guard
    // here too in case of a stray submit.
    if (!hasWorkingOutlet) return

    if (isEdit) {
      // Build edit payload manually: cleanPayload for most fields,
      // but notes: null must be preserved to clear existing notes.
      const { notes, ...rest } = data
      const payload = cleanPayload(rest)
      payload.notes = notes || null // null clears; string updates; backend skips if not sent

      // outletId always comes from the Working Outlet — the ONLY outlet
      // source this form uses, in both create and edit. This is never a
      // reassignment: the Bikes list is already filtered by the Working
      // Outlet, so a bike opened for edit already belongs to it.
      payload.outletId = effectiveOutletId

      updateMutation.mutate(
        { bikeId: bike._id, payload },
        {
          onSuccess: () => { toast.success('Bike updated'); onClose() },
          onError: (err) => {
            const msg = err?.response?.data?.message ?? 'Please try again'
            toast.error(
              err?.response?.status === 409 ? 'Asset code already exists' : 'Update failed',
              msg
            )
          },
        }
      )
    } else {
      const payload = cleanPayload({ ...data, notes: data.notes || undefined })
      payload.outletId = effectiveOutletId
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Bike created'); onClose() },
        onError: (err) => {
          const msg = err?.response?.data?.message ?? 'Check your inputs'
          toast.error(
            err?.response?.status === 409 ? 'Asset code already exists' : 'Failed to create',
            msg
          )
        },
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Bike' : 'Add New Bike'}
      description={
        isEdit
          ? 'Update bike details. Use "Change Status" from the table to update operational status.'
          : 'Register a new bike to an outlet. Status is always set to Active on creation.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* No Working Outlet selected ("All Outlets") — not a valid
              context for this form in either mode. */}
          {!hasWorkingOutlet && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-400">
              <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Select a specific outlet from the switcher above to {isEdit ? 'edit this bike' : 'add a bike'}.</span>
            </div>
          )}

          {/* Asset Code */}
          <FormField
            label="Asset Code"
            error={errors.assetCode?.message}
            required={!isEdit}
          >
            <Input
              {...register('assetCode')}
              placeholder="e.g. BK-001"
              error={!!errors.assetCode?.message}
              disabled={isPending}
              style={{ textTransform: 'uppercase' }}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Stored in uppercase. Must be unique within your tenant.
            </p>
          </FormField>

          {/* Name */}
          <FormField
            label="Bike Name"
            error={errors.name?.message}
            required={!isEdit}
          >
            <Input
              {...register('name')}
              placeholder="e.g. Honda Beat 2022"
              error={!!errors.name?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              placeholder="Optional notes about this bike…"
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

        {/* Footer */}
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
            disabled={isPending || !hasWorkingOutlet}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending
              ? (isEdit ? 'Saving…' : 'Creating…')
              : (isEdit ? 'Save Changes' : 'Add Bike')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default BikeFormModal