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
//   - outletId change is allowed (unlike Cup's riderId which is immutable).
//
// Pattern: EmployeeFormModal + CupRecordFormModal.

import { useEffect, useState }                from 'react'
import { useForm, Controller }                from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2 }                            from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input }                   from '@/components/shared/FormField'
import AsyncSearchSelect                      from '@/components/shared/AsyncSearchSelect'
import { useCreateBike, useUpdateBike }       from '../hooks/useBikes'
import { useOutlets }                         from '@/features/outlets/hooks/useOutlets'
import useToast                               from '@/hooks/useToast'
import useDebounce                            from '@/hooks/useDebounce'
import useEntityMap                           from '@/hooks/useEntityMap'
import { cn }                                 from '@/lib/utils'

// ── Zod schemas ───────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

const createSchema = z.object({
  outletId:  z.string().regex(OBJECT_ID_RE, 'Select an outlet'),
  assetCode: z.string()
    .min(2,  'Asset code must be at least 2 characters')
    .max(20, 'Asset code must not exceed 20 characters'),
  name: z.string()
    .min(2,  'Name must be at least 2 characters')
    .max(100,'Name must not exceed 100 characters'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
})

const editSchema = z.object({
  outletId:  z.string().regex(OBJECT_ID_RE, 'Select a valid outlet').optional().or(z.literal('')),
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
  outletId:  '',
  assetCode: '',
  name:      '',
  notes:     '',
})

const getEditDefaults = (bike) => ({
  outletId:  bike?.outletId?.toString?.() ?? bike?.outletId ?? '',
  assetCode: bike?.assetCode ?? '',
  name:      bike?.name      ?? '',
  notes:     bike?.notes     ?? '',
})

// ── Component ─────────────────────────────────────────────────

const BikeFormModal = ({ open, onClose, bike = null }) => {
  const isEdit = Boolean(bike)
  const toast  = useToast()

  // Outlet search
  const [outletSearch, setOutletSearch]   = useState('')
  const debouncedOutletSearch             = useDebounce(outletSearch, 300)
  const { outletMap }                     = useEntityMap()

  const { data: outletsData, isLoading: outletsLoading } = useOutlets(
    { search: debouncedOutletSearch, isActive: true, limit: 20 },
    { enabled: open }
  )
  const outlets = outletsData?.data ?? []

  const createMutation = useCreateBike()
  const updateMutation = useUpdateBike()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(bike) : getCreateDefaults(),
  })

  useEffect(() => {
    if (!open) return
    reset(isEdit ? getEditDefaults(bike) : getCreateDefaults())
    setOutletSearch('')
  }, [open, isEdit, bike, reset])

  const onSubmit = (data) => {
    if (isEdit) {
      // Build edit payload manually: cleanPayload for most fields,
      // but notes: null must be preserved to clear existing notes.
      const { notes, ...rest } = data
      const payload = cleanPayload(rest)
      payload.notes = notes || null // null clears; string updates; backend skips if not sent
      // If notes is '' and the bike had no notes, sending null is harmless.
      // If no meaningful fields changed, still send — validation error bubbles back.

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

  // Resolve current outlet name for edit panel
  const currentOutletName = isEdit && bike
    ? outletMap.get(bike.outletId?.toString?.() ?? bike.outletId)?.name ?? '—'
    : null

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

          {/* Outlet selector */}
          <FormField label="Outlet" error={errors.outletId?.message} required={!isEdit}>
            <Controller
              control={control}
              name="outletId"
              render={({ field }) => (
                <AsyncSearchSelect
                  value={field.value}
                  onChange={field.onChange}
                  items={outlets}
                  getLabel={(o) => o.name}
                  getValue={(o) => o._id}
                  onSearchChange={setOutletSearch}
                  isLoading={outletsLoading}
                  placeholder={
                    isEdit && currentOutletName
                      ? currentOutletName
                      : 'Search outlets…'
                  }
                  error={!!errors.outletId?.message}
                  disabled={isPending}
                  emptyMessage={
                    debouncedOutletSearch
                      ? `No outlets matching "${debouncedOutletSearch}"`
                      : 'No active outlets found.'
                  }
                />
              )}
            />
          </FormField>

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
              : (isEdit ? 'Save Changes' : 'Add Bike')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default BikeFormModal