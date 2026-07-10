// src/features/bikeAssignment/components/AssignmentFormModal.jsx
// Create a new bike assignment — the ONLY mutation for this modal.
// There is no edit. History is append-only.
//
// Backend requirements (bikeAssignment.validation.js + service.js):
//   bikeId:     required, valid ObjectId, bike must be isActive:true AND status:'ACTIVE'
//   employeeId: required, valid ObjectId, employee must be isRider:true AND isActive:true
//   startDate:  required, valid date string (YYYY-MM-DD accepted)
//
// 409 errors surfaced as toasts:
//   "This bike already has an active assignment. End it before creating a new one."
//   "This rider already has an active bike assignment. End it before assigning a new bike."
//
// Bike selector: only ACTIVE-status, isActive:true bikes — per confirmed requirement.
// Rider selector: isRider:true, isActive:true — per confirmed requirement.

import { useEffect, useState }           from 'react'
import { useForm, Controller }           from 'react-hook-form'
import { zodResolver }                   from '@hookform/resolvers/zod'
import { z }                             from 'zod'
import { Loader2 }                       from 'lucide-react'

import Modal                             from '@/components/shared/Modal'
import FormField, { Input }              from '@/components/shared/FormField'
import AsyncSearchSelect                 from '@/components/shared/AsyncSearchSelect'
import { useCreateAssignment }           from '../hooks/useBikeAssignments'
import { useBikes }                      from '@/features/bike/hooks/useBikes'
import { useEmployees }                  from '@/features/employee/hooks/useEmployees'
import useToast                          from '@/hooks/useToast'
import useDebounce                       from '@/hooks/useDebounce'
import { cn }                            from '@/lib/utils'

// ── Zod schema ────────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

const schema = z.object({
  bikeId:     z.string().regex(OBJECT_ID_RE, 'Select a bike'),
  employeeId: z.string().regex(OBJECT_ID_RE, 'Select a rider'),
  startDate:  z.string().min(1, 'Start date is required'),
})

// ── Helpers ───────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const getDefaults = () => ({ bikeId: '', employeeId: '', startDate: today() })

// ── Component ─────────────────────────────────────────────────

const AssignmentFormModal = ({ open, onClose }) => {
  const toast  = useToast()

  // Bike search — only ACTIVE-status, isActive bikes
  const [bikeSearch, setBikeSearch]     = useState('')
  const debouncedBikeSearch             = useDebounce(bikeSearch, 300)

  const { data: bikesData, isLoading: bikesLoading } = useBikes(
    { search: debouncedBikeSearch, status: 'ACTIVE', isActive: 'true', limit: 20 },
  )
  const bikes = bikesData?.data ?? []

  // Rider search — isRider:true, isActive:true
  const [riderSearch, setRiderSearch]   = useState('')
  const debouncedRiderSearch            = useDebounce(riderSearch, 300)

  const { data: ridersData, isLoading: ridersLoading } = useEmployees(
    { search: debouncedRiderSearch, isRider: true, isActive: true, limit: 20 },
  )
  const riders = ridersData?.data ?? []

  const createMutation = useCreateAssignment()

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
    setRiderSearch('')
  }, [open, reset])

  const onSubmit = (data) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Bike assigned', 'The assignment has been recorded.')
        onClose()
      },
      onError: (err) => {
        const status = err?.response?.status
        const msg    = err?.response?.data?.message ?? 'Please try again.'
        // 409 = bike or rider already has an active assignment
        toast.error(
          status === 409 ? 'Assignment conflict' : 'Failed to create assignment',
          msg
        )
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign Bike to Rider"
      description="Record a new bike–rider assignment. Both must be available (no active assignment)."
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
                      ? `No available bikes matching "${debouncedBikeSearch}"`
                      : 'No available ACTIVE bikes found.'
                  }
                />
              )}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Only ACTIVE bikes without a current assignment are shown.
            </p>
          </FormField>

          {/* Rider selector */}
          <FormField label="Rider" error={errors.employeeId?.message} required>
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <AsyncSearchSelect
                  value={field.value}
                  onChange={field.onChange}
                  items={riders}
                  getLabel={(r) => r.name}
                  getValue={(r) => r._id}
                  onSearchChange={setRiderSearch}
                  isLoading={ridersLoading}
                  placeholder="Search riders…"
                  error={!!errors.employeeId?.message}
                  disabled={createMutation.isPending}
                  emptyMessage={
                    debouncedRiderSearch
                      ? `No riders matching "${debouncedRiderSearch}"`
                      : 'No active riders found.'
                  }
                />
              )}
            />
          </FormField>

          {/* Start date */}
          <FormField label="Start Date" error={errors.startDate?.message} required>
            <Input
              {...register('startDate')}
              type="date"
              error={!!errors.startDate?.message}
              disabled={createMutation.isPending}
            />
          </FormField>

        </div>

        {/* Footer */}
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
            {createMutation.isPending ? 'Assigning…' : 'Assign Bike'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AssignmentFormModal