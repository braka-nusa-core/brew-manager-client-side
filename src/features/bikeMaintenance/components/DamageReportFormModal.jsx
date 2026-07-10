// src/features/bikeMaintenance/components/DamageReportFormModal.jsx
// CREATE only — no edit. Damage reports are immutable after creation.
// Status is managed exclusively via DamageReportStatusDialog.
//
// Backend contract (bikeMaintenance.validation.js):
//   bikeId:     required, valid ObjectId — bike must exist in tenant
//   damageType: required, one of DAMAGE_TYPES
//   severity:   required, one of DAMAGE_SEVERITIES
//   notes:      optional string
//   NEVER send: tenantId, reportedBy, reportedAt, status (all backend-owned)
//
// bikeId selector: isActive:true bikes regardless of operational status
// (backend only checks existence, not status — a MAINTENANCE bike can be reported)

import { useEffect, useState }           from 'react'
import { useForm, Controller }           from 'react-hook-form'
import { zodResolver }                   from '@hookform/resolvers/zod'
import { z }                             from 'zod'
import { Loader2 }                       from 'lucide-react'

import Modal                             from '@/components/shared/Modal'
import FormField, { Input }              from '@/components/shared/FormField'
import AsyncSearchSelect                 from '@/components/shared/AsyncSearchSelect'
import { useCreateDamageReport }         from '../hooks/useBikeMaintenance'
import { useBikes }                      from '@/features/bike/hooks/useBikes'
import useToast                          from '@/hooks/useToast'
import useDebounce                       from '@/hooks/useDebounce'
import { cn }                            from '@/lib/utils'

// ── Enums (mirror backend model constants) ─────────────────────

export const DAMAGE_TYPES      = ['BAN_BOCOR', 'REM', 'RANTAI', 'LAINNYA']
export const DAMAGE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH']

export const DAMAGE_TYPE_LABELS = {
  BAN_BOCOR: 'Ban Bocor (Flat Tire)',
  REM:       'Rem (Brakes)',
  RANTAI:    'Rantai (Chain)',
  LAINNYA:   'Lainnya (Other)',
}

export const DAMAGE_SEVERITY_LABELS = {
  LOW:    'Low',
  MEDIUM: 'Medium',
  HIGH:   'High',
}

// ── Zod schema ────────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

const schema = z.object({
  bikeId:     z.string().regex(OBJECT_ID_RE, 'Select a bike'),
  damageType: z.enum(DAMAGE_TYPES, { errorMap: () => ({ message: 'Select a damage type' }) }),
  severity:   z.enum(DAMAGE_SEVERITIES, { errorMap: () => ({ message: 'Select a severity' }) }),
  notes:      z.string().max(500, 'Notes too long').optional().or(z.literal('')),
})

const getDefaults = () => ({ bikeId: '', damageType: '', severity: '', notes: '' })

// ── Component ─────────────────────────────────────────────────

const DamageReportFormModal = ({ open, onClose }) => {
  const toast  = useToast()

  const [bikeSearch, setBikeSearch]   = useState('')
  const debouncedBikeSearch           = useDebounce(bikeSearch, 300)

  // Bikes: any isActive:true (no status restriction — backend only checks existence)
  const { data: bikesData, isLoading: bikesLoading } = useBikes(
    { search: debouncedBikeSearch, isActive: 'true', limit: 20 }
  )
  const bikes = bikesData?.data ?? []

  const createMutation = useCreateDamageReport()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(schema),
    defaultValues: getDefaults(),
  })

  useEffect(() => {
    if (!open) return
    reset(getDefaults())
    setBikeSearch('')
  }, [open, reset])

  const onSubmit = (data) => {
    const payload = {
      bikeId:     data.bikeId,
      damageType: data.damageType,
      severity:   data.severity,
      ...(data.notes ? { notes: data.notes } : {}),
    }

    createMutation.mutate(payload, {
      onSuccess: () => { toast.success('Damage report created'); onClose() },
      onError: (err) => {
        toast.error(
          'Failed to create report',
          err?.response?.data?.message ?? 'Please try again.'
        )
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report Damage"
      description="Log a new damage report for a bike. Status is always set to Open on creation."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* Bike selector */}
          <FormField label="Bike" error={errors.bikeId?.message} required>
            <Controller
              control={control}
              name="bikeId"
              render={({ field }) => (
                <AsyncSearchSelect
                  value={field.value}
                  onChange={field.onChange}
                  items={bikes}
                  getLabel={(b) => `${b.assetCode} — ${b.name}`}
                  getValue={(b) => b._id}
                  onSearchChange={setBikeSearch}
                  isLoading={bikesLoading}
                  placeholder="Search bikes…"
                  error={!!errors.bikeId?.message}
                  disabled={createMutation.isPending}
                  emptyMessage={
                    debouncedBikeSearch
                      ? `No bikes matching "${debouncedBikeSearch}"`
                      : 'No active bikes found.'
                  }
                />
              )}
            />
          </FormField>

          {/* Damage Type */}
          <FormField label="Damage Type" error={errors.damageType?.message} required>
            <select
              {...register('damageType')}
              disabled={createMutation.isPending}
              className={cn(
                'w-full h-10 px-3 rounded-md border bg-background text-sm',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                errors.damageType?.message ? 'border-destructive' : 'border-input'
              )}
            >
              <option value="">Select damage type…</option>
              {DAMAGE_TYPES.map((t) => (
                <option key={t} value={t}>{DAMAGE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </FormField>

          {/* Severity */}
          <FormField label="Severity" error={errors.severity?.message} required>
            <select
              {...register('severity')}
              disabled={createMutation.isPending}
              className={cn(
                'w-full h-10 px-3 rounded-md border bg-background text-sm',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                errors.severity?.message ? 'border-destructive' : 'border-input'
              )}
            >
              <option value="">Select severity…</option>
              {DAMAGE_SEVERITIES.map((s) => (
                <option key={s} value={s}>{DAMAGE_SEVERITY_LABELS[s]}</option>
              ))}
            </select>
          </FormField>

          {/* Notes */}
          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              placeholder="Optional notes about the damage…"
              disabled={createMutation.isPending}
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
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {createMutation.isPending ? 'Submitting…' : 'Report Damage'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default DamageReportFormModal