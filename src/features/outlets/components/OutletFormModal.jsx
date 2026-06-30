// src/features/outlet/components/OutletFormModal.jsx
// Handles both CREATE and EDIT in one modal.
//
// Backend contract:
//   CREATE: POST /outlets
//     Required: name
//     Optional: code (auto-generated if omitted), address, phone
//     tenantId from JWT — never sent in body
//
//   UPDATE: PATCH /outlets/:id
//     All optional. tenantId immutable. At least 1 field required.
//     isActive changes go to /toggle-active — NOT this form.

import { useEffect }                          from 'react'
import { useForm }                            from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2, Building2 }                 from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input }                   from '@/components/shared/FormField'
import { useCreateOutlet, useUpdateOutlet }   from '../hooks/useOutlets'
import useToast                               from '@/hooks/useToast'
import { cn }                                 from '@/lib/utils'

// ── Zod schemas ───────────────────────────────────────────────

const createSchema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters').max(100),
  code:    z.string().min(2, 'Code must be at least 2 characters').max(10)
             .regex(/^[A-Za-z0-9-]+$/, 'Code: letters, numbers, hyphens only')
             .optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  phone:   z.string().max(20).optional().or(z.literal('')),
})

const editSchema = z.object({
  name:    z.string().min(2).max(100).optional().or(z.literal('')),
  code:    z.string().min(2).max(10)
             .regex(/^[A-Za-z0-9-]+$/, 'Code: letters, numbers, hyphens only')
             .optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  phone:   z.string().max(20).optional().or(z.literal('')),
}).refine(
  (d) => Object.values(d).some((v) => v !== '' && v !== undefined),
  { message: 'Provide at least one field to update' }
)

// ── Helpers ───────────────────────────────────────────────────

const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

const getCreateDefaults = () => ({ name: '', code: '', address: '', phone: '' })

const getEditDefaults = (outlet) => ({
  name:    outlet?.name    ?? '',
  code:    outlet?.code    ?? '',
  address: outlet?.address ?? '',
  phone:   outlet?.phone   ?? '',
})

// ── Component ─────────────────────────────────────────────────

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   outlet?: Object | null   — if provided → edit mode
 * }} props
 */
const OutletFormModal = ({ open, onClose, outlet = null }) => {
  const isEdit = Boolean(outlet)
  const toast  = useToast()

  const createMutation = useCreateOutlet()
  const updateMutation = useUpdateOutlet()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(outlet) : getCreateDefaults(),
  })

  useEffect(() => {
    if (!open) return
    reset(isEdit ? getEditDefaults(outlet) : getCreateDefaults())
  }, [open, isEdit, outlet, reset])

  const onSubmit = (data) => {
    const payload = cleanPayload(data)
    // Uppercase code if provided
    if (payload.code) payload.code = payload.code.toUpperCase()

    if (isEdit) {
      updateMutation.mutate(
        { outletId: outlet._id, payload },
        {
          onSuccess: () => { toast.success('Outlet updated successfully'); onClose() },
          onError:   (err) => toast.error('Update failed', err?.response?.data?.message ?? 'Please try again'),
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Outlet created successfully'); onClose() },
        onError:   (err) => toast.error('Failed to create outlet', err?.response?.data?.message ?? 'Check your inputs'),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Outlet' : 'Add New Outlet'}
      description={
        isEdit
          ? 'Update outlet details. Leave fields blank to keep current values.'
          : 'Add a new outlet location to your tenant.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* Name */}
          <FormField label="Outlet Name" error={errors.name?.message} required={!isEdit}>
            <Input
              {...register('name')}
              placeholder="e.g. Outlet Sudirman"
              error={!!errors.name?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Code */}
          <FormField label="Outlet Code" error={errors.code?.message}>
            <Input
              {...register('code')}
              placeholder="e.g. SDR1 (auto-generated if blank)"
              error={!!errors.code?.message}
              disabled={isPending}
              className="uppercase"
              style={{ textTransform: 'uppercase' }}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Short unique code for this outlet (2–10 chars). Auto-generated from name if left blank.
            </p>
          </FormField>

          {/* Address */}
          <FormField label="Address" error={errors.address?.message}>
            <textarea
              {...register('address')}
              placeholder="e.g. Jl. Sudirman No. 1, Jakarta Selatan"
              disabled={isPending}
              rows={2}
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-background text-sm',
                'placeholder:text-muted-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                errors.address?.message ? 'border-destructive' : 'border-input'
              )}
            />
          </FormField>

          {/* Phone */}
          <FormField label="Phone Number" error={errors.phone?.message}>
            <Input
              {...register('phone')}
              placeholder="e.g. 021-5551234"
              error={!!errors.phone?.message}
              disabled={isPending}
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
              ? isEdit ? 'Saving…' : 'Creating…'
              : isEdit ? 'Save Changes' : 'Create Outlet'
            }
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default OutletFormModal