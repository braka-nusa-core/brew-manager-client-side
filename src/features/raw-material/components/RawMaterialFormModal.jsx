// src/features/raw-material/components/RawMaterialFormModal.jsx
// Handles both CREATE and EDIT in one modal.
// Mirrors src/features/product/components/ProductFormModal.jsx, adapted
// for RawMaterial's field set (name, unit, costPerUnit, isActive).
//
// Backend contract:
//   CREATE POST /raw-materials: { name, unit, costPerUnit } — all three required,
//     unlike Product where sellingPrice is optional with a server-side default.
//   UPDATE PATCH /raw-materials/:id: { name?, unit?, costPerUnit?, isActive? } —
//     at least one required.
//   tenantId is immutable — NEVER included in any schema, default, or payload here.

import { useEffect }                                  from 'react'
import { useForm }                                    from 'react-hook-form'
import { zodResolver }                                from '@hookform/resolvers/zod'
import { z }                                          from 'zod'
import { Loader2 }                                    from 'lucide-react'

import Modal                                           from '@/components/shared/Modal'
import FormField, { Input, Select }                    from '@/components/shared/FormField'
import RupiahInput                                     from '@/components/shared/RupiahInput'
import { useCreateRawMaterial, useUpdateRawMaterial }  from '../hooks/useRawMaterials'
import useToast                                        from '@/hooks/useToast'
import { cn }                                          from '@/lib/utils'

// ── Unit options — must mirror backend RAW_MATERIAL_UNITS exactly ──
// Backend: RawMaterial.model.js → RAW_MATERIAL_UNITS = ['g', 'kg', 'ml', 'l', 'pcs']

const RAW_MATERIAL_UNITS = ['g', 'kg', 'ml', 'l', 'pcs']

const UNIT_LABELS = {
  g:   'Grams (g)',
  kg:  'Kilograms (kg)',
  ml:  'Milliliters (ml)',
  l:   'Liters (l)',
  pcs: 'Pieces (pcs)',
}

// ── Zod schemas ───────────────────────────────────────────────

const createSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  unit:        z.enum(RAW_MATERIAL_UNITS, { required_error: 'Select a unit' }),
  costPerUnit: z
    .number({ required_error: 'Cost per unit is required', invalid_type_error: 'Enter a valid amount' })
    .min(0, 'Cannot be negative'),
})

const editSchema = z.object({
  name:        z.string().min(2, 'At least 2 characters').max(100).optional().or(z.literal('')),
  unit:        z.enum(RAW_MATERIAL_UNITS).optional(),
  costPerUnit: z.union([z.number().min(0, 'Cannot be negative'), z.literal('')]).optional(),
  isActive:    z.boolean().optional(),
}).refine(
  (d) => d.name !== '' && d.name !== undefined
      || d.unit !== undefined
      || d.costPerUnit !== '' && d.costPerUnit !== undefined
      || d.isActive !== undefined,
  { message: 'At least one field must be changed' }
)

// ── Helpers ───────────────────────────────────────────────────

// tenantId is never a key on `data` in the first place, so this filter
// never needs to special-case it — it cannot leak.
const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

// ── Default values ────────────────────────────────────────────

const getCreateDefaults = () => ({
  name:        '',
  unit:        'g',
  costPerUnit: '',
})

const getEditDefaults = (rawMaterial) => ({
  name:        rawMaterial?.name        ?? '',
  unit:        rawMaterial?.unit        ?? 'g',
  costPerUnit: rawMaterial?.costPerUnit ?? '',
  isActive:    rawMaterial?.isActive    ?? true,
})

// ── Component ─────────────────────────────────────────────────

const RawMaterialFormModal = ({ open, onClose, rawMaterial = null }) => {
  const isEdit = Boolean(rawMaterial)
  const toast  = useToast()

  const createMutation = useCreateRawMaterial()
  const updateMutation = useUpdateRawMaterial()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(rawMaterial) : getCreateDefaults(),
  })

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset(getEditDefaults(rawMaterial))
    } else {
      reset(getCreateDefaults())
    }
  }, [open, isEdit, rawMaterial, reset])

  const onSubmit = (data) => {
    const payload = cleanPayload(data)
    if (isEdit) {
      updateMutation.mutate(
        { rawMaterialId: rawMaterial._id, payload },
        {
          onSuccess: () => { toast.success('Raw material updated', rawMaterial.name); onClose() },
          onError:   (err) => toast.error('Update failed', err?.response?.data?.message ?? 'Please try again'),
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Raw material created successfully'); onClose() },
        onError:   (err) => toast.error('Failed to create raw material', err?.response?.data?.message ?? 'Check your inputs'),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Raw Material' : 'Add Raw Material'}
      description={
        isEdit
          ? 'Update raw material details. Leave fields blank to keep current values.'
          : 'Fill in the raw material details below.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* Name */}
          <FormField label="Material Name" error={errors.name?.message} required={!isEdit}>
            <Input
              {...register('name')}
              placeholder="e.g. Fresh Milk"
              error={!!errors.name?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Unit + Cost Per Unit side by side */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Unit" error={errors.unit?.message} required={!isEdit}>
              <Select
                {...register('unit')}
                error={!!errors.unit?.message}
                disabled={isPending}
              >
                {RAW_MATERIAL_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {UNIT_LABELS[unit]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Cost / Unit (IDR)" error={errors.costPerUnit?.message} required={!isEdit}>
              <RupiahInput
                control={control}
                name="costPerUnit"
                placeholder="e.g. 18.000"
                error={!!errors.costPerUnit?.message}
                disabled={isPending}
              />
            </FormField>
          </div>

          {/* Active status — edit only. Sent via PATCH body; no dedicated
              toggle-active endpoint exists for RawMaterial on the backend. */}
          {isEdit && (
            <FormField label="Status" error={errors.isActive?.message}>
              <label className="flex items-center gap-2 text-sm text-foreground select-none">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  disabled={isPending}
                  className="w-4 h-4 rounded border-input accent-brand-500 disabled:opacity-50"
                />
                Active
              </label>
            </FormField>
          )}

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
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Material')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default RawMaterialFormModal