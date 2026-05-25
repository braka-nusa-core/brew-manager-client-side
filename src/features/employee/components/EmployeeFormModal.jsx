// src/features/employee/components/EmployeeFormModal.jsx
// Handles both CREATE and EDIT in one modal.
//
// Backend contract:
//   CREATE POST /employees: outletId, name, position, salaryType, baseSalary (number), joinDate. Optional: phone.
//   UPDATE PATCH /employees/:id: all optional. tenantId immutable. isActive → /toggle-active only.
//   salaryType enum: 'monthly' | 'daily'
//   baseSalary: must be a NUMBER sent to backend (not a string)
//   joinDate: ISO date string "YYYY-MM-DD"
//
// Bug fixes (v2):
//   • baseSalary schema: z.coerce.number() on '' → 0 → failed .positive().
//     Fixed: RHF now stores raw integer via <RupiahInput> (no coerce needed).
//     Zod schema changed to z.number() — receives actual number, not string.
//   • outletId field: AsyncSearchSelect via useOutlets().
//   • Rupiah UX: <RupiahInput> formats display as "3.000.000", stores 3000000.

import { useEffect, useState }                from 'react'
import { useForm, Controller }                from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2 }                            from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input, Select }           from '@/components/shared/FormField'
import AsyncSearchSelect                      from '@/components/shared/AsyncSearchSelect'
import RupiahInput                            from '@/components/shared/RupiahInput'
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees'
import { useOutlets }                         from '@/features/outlets/hooks/useOutlets'
import useToast                               from '@/hooks/useToast'
import useDebounce                            from '@/hooks/useDebounce'
import { cn }                                 from '@/lib/utils'

// ── Zod schemas ───────────────────────────────────────────────
//
// baseSalary is now z.number() (not z.coerce.number()) because
// RupiahInput stores an actual integer into RHF — no string coercion needed.
// The .or(z.literal('')) on editSchema handles the "field not touched" case.

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

// ── preprocess helper: treat empty string as undefined for optional numbers ──
const optionalNumber = z
  .union([z.number().min(0, 'Cannot be negative'), z.literal('')])
  .optional()

const createSchema = z.object({
  outletId:   z.string().regex(OBJECT_ID_RE, 'Select a valid outlet'),
  name:       z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  phone:      z.string().max(20, 'Phone too long').optional().or(z.literal('')),
  position:   z.string().min(2, 'Position must be at least 2 characters').max(50, 'Position too long'),
  salaryType: z.enum(['monthly', 'daily'], { required_error: 'Select a salary type' }),
  // RupiahInput stores integer | '' — require it to be a positive number on create
  baseSalary: z
    .number({ required_error: 'Base salary is required', invalid_type_error: 'Enter a valid amount' })
    .min(1, 'Must be greater than 0'),
  joinDate:   z.string().min(1, 'Join date is required'),
})

const editSchema = z.object({
  name:       z.string().min(2, 'At least 2 characters').max(100).optional().or(z.literal('')),
  phone:      z.string().max(20).optional().or(z.literal('')),
  position:   z.string().min(2, 'At least 2 characters').max(50).optional().or(z.literal('')),
  salaryType: z.enum(['monthly', 'daily']).optional(),
  baseSalary: optionalNumber,
  joinDate:   z.string().optional().or(z.literal('')),
})

// ── Helpers ───────────────────────────────────────────────────

const toDateInputValue = (iso) => {
  if (!iso) return ''
  try { return new Date(iso).toISOString().split('T')[0] } catch { return '' }
}

// Strip '' / undefined / null — RupiahInput may return '' on empty
const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

// ── Default values ────────────────────────────────────────────

const getCreateDefaults = (defaultOutletId) => ({
  outletId:   defaultOutletId ?? '',
  name:       '',
  phone:      '',
  position:   '',
  salaryType: 'monthly',
  baseSalary: '',   // RupiahInput treats '' as empty/cleared display
  joinDate:   '',
})

const getEditDefaults = (employee) => ({
  name:       employee?.name       ?? '',
  phone:      employee?.phone      ?? '',
  position:   employee?.position   ?? '',
  salaryType: employee?.salaryType ?? 'monthly',
  // Pass raw number so RupiahInput can format the display on open
  baseSalary: employee?.baseSalary ?? '',
  joinDate:   toDateInputValue(employee?.joinDate),
})

// ── Component ─────────────────────────────────────────────────

const EmployeeFormModal = ({ open, onClose, employee = null, defaultOutletId }) => {
  const isEdit = Boolean(employee)
  const toast  = useToast()

  // Outlet search state
  const [outletSearch, setOutletSearch] = useState('')
  const debouncedOutletSearch = useDebounce(outletSearch, 300)

  const { data: outletsData, isLoading: outletsLoading } = useOutlets(
    { search: debouncedOutletSearch, isActive: true, limit: 20 },
    { enabled: open && !isEdit }
  )
  const outlets = outletsData?.data ?? []

  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(employee) : getCreateDefaults(defaultOutletId),
  })

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset(getEditDefaults(employee))
    } else {
      reset(getCreateDefaults(defaultOutletId))
      setOutletSearch('')
    }
  }, [open, isEdit, employee, defaultOutletId, reset])

  const onSubmit = (data) => {
    const payload = cleanPayload(data)
    if (isEdit) {
      updateMutation.mutate(
        { employeeId: employee._id, payload },
        {
          onSuccess: () => { toast.success('Employee updated', employee.name); onClose() },
          onError:   (err) => toast.error('Update failed', err?.response?.data?.message ?? 'Please try again'),
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Employee created successfully'); onClose() },
        onError:   (err) => toast.error('Failed to create employee', err?.response?.data?.message ?? 'Check your inputs'),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Employee' : 'Add New Employee'}
      description={
        isEdit
          ? 'Update employee details. Leave fields blank to keep current values.'
          : 'Fill in all required fields to add a new employee.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* Outlet selector — create only */}
          {!isEdit && (
            <FormField label="Outlet" error={errors.outletId?.message} required>
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
                    placeholder="Search outlets…"
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
          )}

          {/* Name */}
          <FormField label="Full Name" error={errors.name?.message} required={!isEdit}>
            <Input
              {...register('name')}
              placeholder="e.g. Sari Dewi"
              error={!!errors.name?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Phone */}
          <FormField label="Phone Number" error={errors.phone?.message}>
            <Input
              {...register('phone')}
              placeholder="e.g. 0812-3456-7890"
              error={!!errors.phone?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Position */}
          <FormField label="Position" error={errors.position?.message} required={!isEdit}>
            <Input
              {...register('position')}
              placeholder="e.g. Barista, Cashier, Supervisor"
              error={!!errors.position?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Salary Type + Base Salary side by side */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Salary Type" error={errors.salaryType?.message} required={!isEdit}>
              <Select
                {...register('salaryType')}
                error={!!errors.salaryType?.message}
                disabled={isPending}
              >
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </Select>
            </FormField>

            <FormField label="Base Salary (IDR)" error={errors.baseSalary?.message} required={!isEdit}>
              <RupiahInput
                control={control}
                name="baseSalary"
                placeholder="e.g. 3.000.000"
                error={!!errors.baseSalary?.message}
                disabled={isPending}
              />
            </FormField>
          </div>

          {/* Join Date */}
          <FormField label="Join Date" error={errors.joinDate?.message} required={!isEdit}>
            <Input
              {...register('joinDate')}
              type="date"
              error={!!errors.joinDate?.message}
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
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Employee')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default EmployeeFormModal