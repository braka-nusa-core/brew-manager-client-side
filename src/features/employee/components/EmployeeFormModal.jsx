// src/features/employee/components/EmployeeFormModal.jsx
// Handles both CREATE and EDIT in one modal.
//
// Backend contract:
//   CREATE POST /employees: outletId, name, position, joinDate. Optional: phone, employeeType, ktpStatus.
//   UPDATE PATCH /employees/:id: all optional. tenantId immutable. isActive → /toggle-active only.
//   salaryType enum: 'monthly' | 'daily'
//   baseSalary: must be a NUMBER sent to backend (not a string)
//   joinDate: ISO date string "YYYY-MM-DD"
//   ktpStatus enum: 'pending' | 'received', default 'pending'
//
// v4 — "Working Outlet" architecture:
//   The Outlet selector has been REMOVED from this form entirely (not
//   hidden, not disabled). The employee's outlet is no longer a form
//   field — it is derived SOLELY from the app-wide Working Outlet
//   (useEffectiveOutletId(), the same source the Navbar's Outlet
//   Switcher writes to). This is the ONLY outlet source this form ever
//   consults — employee.outletId is never read for any decision here.
//
//   CREATE and EDIT are identical with respect to outlet resolution —
//   there is no branching between them:
//     - Both always resolve payrollType from effectiveOutletId.
//     - Both always send outletId = effectiveOutletId in the payload.
//       For edit this is never a reassignment: the Employee List is
//       already filtered by the Working Outlet, so an employee opened
//       for edit is assumed to already belong to it. Outlet transfer is
//       explicitly out of scope for this form — a future "Transfer
//       Employee" feature will own that; no reconciliation logic exists
//       here for the case where they might differ.
//     - Both require a specific Working Outlet to be selected. "All
//       Outlets" is NOT a valid working context for this form — if
//       effectiveOutletId is null, the form is blocked entirely (no
//       fallback, no substitute value invented).
//
//   payrollType (which drives salary-field visibility) follows the
//   Working Outlet directly:
//     Working Outlet → Outlet.payrollType → salary fields shown/hidden
//
// v3 — Payroll-config-follows-outlet extension:
//   salaryType/baseSalary are NO LONGER always required — requiredness
//   depends on payrollType ('fixed' → required, 'commission' → ignored
//   entirely, hidden and never sent). Checked in onSubmit, not the
//   static zod schema, since requiredness depends on the live Working
//   Outlet, not on create-vs-edit mode.
//
// Bug fixes (v2):
//   • baseSalary schema: z.coerce.number() on '' → 0 → failed .positive().
//     Fixed: RHF now stores raw integer via <RupiahInput> (no coerce needed).
//     Zod schema changed to z.number() — receives actual number, not string.
//   • Rupiah UX: <RupiahInput> formats display as "3.000.000", stores 3000000.

import { useEffect }                          from 'react'
import { useForm }                            from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2, TriangleAlert }             from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input, Select }           from '@/components/shared/FormField'
import RupiahInput                            from '@/components/shared/RupiahInput'
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees'
import { useEffectiveOutletId }               from '@/store/activeOutletStore'
import useEntityMap                           from '@/hooks/useEntityMap'
import useToast                               from '@/hooks/useToast'
import { cn }                                 from '@/lib/utils'

// ── Zod schemas ───────────────────────────────────────────────
//
// outletId is intentionally NOT a field here at all — see file header.
//
// baseSalary is now z.number() (not z.coerce.number()) because
// RupiahInput stores an actual integer into RHF — no string coercion needed.
// The .or(z.literal('')) on editSchema handles the "field not touched" case.
//
// salaryType/baseSalary are optional at the schema level in BOTH create
// and edit — their real requiredness depends on the Working Outlet's
// payrollType, checked imperatively in onSubmit (see component below),
// since a static zod schema can't react to which outlet is active.

// ── employeeType — must mirror backend EMPLOYEE_TYPES exactly ──
// Backend: Employee.model.js → EMPLOYEE_TYPES = ['barista','cashier','supervisor','rider']
// isRider is derived server-side from this field — NEVER sent from the frontend.
export const EMPLOYEE_TYPES = ['barista', 'cashier', 'supervisor', 'rider']

const EMPLOYEE_TYPE_LABELS = {
  barista:    'Barista',
  cashier:    'Cashier',
  supervisor: 'Supervisor',
  rider:      'Rider',
}

// ── ktpStatus — must mirror backend KTP_STATUSES exactly ──
// Backend: Employee.model.js → KTP_STATUSES = ['pending', 'received']
export const KTP_STATUSES = ['pending', 'received']

const KTP_STATUS_LABELS = {
  pending:  'Pending',
  received: 'Received',
}

// ── preprocess helper: treat empty string as undefined for optional numbers ──
const optionalNumber = z
  .union([z.number().min(0, 'Cannot be negative'), z.literal('')])
  .optional()

const createSchema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  phone:        z.string().max(20, 'Phone too long').optional().or(z.literal('')),
  position:     z.string().min(2, 'Position must be at least 2 characters').max(50, 'Position too long'),
  employeeType: z.enum(EMPLOYEE_TYPES, { required_error: 'Select an employee type' }),
  // Requiredness depends on the Working Outlet's payrollType — enforced
  // in onSubmit, not here (see file header).
  salaryType:   z.enum(['monthly', 'daily']).optional().or(z.literal('')),
  baseSalary:   optionalNumber,
  joinDate:     z.string().min(1, 'Join date is required'),
  ktpStatus:    z.enum(KTP_STATUSES, { required_error: 'Select a KTP status' }),
})

const editSchema = z.object({
  name:         z.string().min(2, 'At least 2 characters').max(100).optional().or(z.literal('')),
  phone:        z.string().max(20).optional().or(z.literal('')),
  position:     z.string().min(2, 'At least 2 characters').max(50).optional().or(z.literal('')),
  employeeType: z.enum(EMPLOYEE_TYPES).optional(),
  salaryType:   z.enum(['monthly', 'daily']).optional().or(z.literal('')),
  baseSalary:   optionalNumber,
  joinDate:     z.string().optional().or(z.literal('')),
  ktpStatus:    z.enum(KTP_STATUSES).optional(),
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

const getCreateDefaults = () => ({
  name:         '',
  phone:        '',
  position:     '',
  employeeType: 'barista',
  salaryType:   'monthly',
  baseSalary:   '',   // RupiahInput treats '' as empty/cleared display
  joinDate:     '',
  ktpStatus:    'pending',
})

const getEditDefaults = (employee) => ({
  name:         employee?.name         ?? '',
  phone:        employee?.phone        ?? '',
  position:     employee?.position     ?? '',
  employeeType: employee?.employeeType ?? 'barista',
  salaryType:   employee?.salaryType   ?? 'monthly',
  // Pass raw number so RupiahInput can format the display on open
  baseSalary:   employee?.baseSalary   ?? '',
  joinDate:     toDateInputValue(employee?.joinDate),
  ktpStatus:    employee?.ktpStatus    ?? 'pending',
})

// ── Component ─────────────────────────────────────────────────

const EmployeeFormModal = ({ open, onClose, employee = null }) => {
  const isEdit = Boolean(employee)
  const toast  = useToast()

  // The "Working Outlet" — single source of truth for which outlet an
  // employee belongs to. Same store the Navbar's Outlet Switcher writes
  // to. null = "All Outlets" (only possible for super_admin/tenant_admin).
  const effectiveOutletId = useEffectiveOutletId()

  // Reused abstraction (already used elsewhere, e.g. UserTable) — resolves
  // outlet names/payrollType without a dedicated fetch of its own.
  const { outletMap } = useEntityMap()

  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(employee) : getCreateDefaults(),
  })

  // ── Salary fields follow the WORKING OUTLET's payrollType, reactively.
  // Working Outlet → Outlet.payrollType → salary fields shown/hidden.
  // This is the ONLY outlet source this form ever consults — no fallback
  // to employee.outletId. The Employee List is already filtered by the
  // Working Outlet, so by the time an employee is opened for edit, it
  // already belongs to the current Working Outlet; no reconciliation
  // between the two is needed or attempted here.
  const payrollOutlet    = outletMap.get(effectiveOutletId)
  const payrollType      = payrollOutlet?.payrollType ?? 'fixed'
  const showSalaryFields = payrollType === 'fixed'

  // "All Outlets" is not a valid working context for this form — create
  // AND edit both require a specific Working Outlet to be selected.
  // No distinction between the two modes here.
  const hasWorkingOutlet = !!effectiveOutletId

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset(getEditDefaults(employee))
    } else {
      reset(getCreateDefaults())
    }
  }, [open, isEdit, employee, reset])

  const onSubmit = (data) => {
    // No Working Outlet selected ("All Outlets") — not a valid context
    // for this form in either mode. Blocked in the UI below, but guard
    // here too in case of a stray submit.
    if (!hasWorkingOutlet) return

    // Salary requiredness follows the WORKING OUTLET's payrollType —
    // not a static create/edit rule — so it's checked here, not in zod.
    if (payrollType === 'fixed') {
      let hasError = false
      if (!data.salaryType) {
        setError('salaryType', { message: 'Salary type is required for a fixed-payroll outlet' })
        hasError = true
      }
      if (data.baseSalary === '' || data.baseSalary === undefined || data.baseSalary === null) {
        setError('baseSalary', { message: 'Base salary is required for a fixed-payroll outlet' })
        hasError = true
      }
      if (hasError) return
    }

    const payload = cleanPayload(data)

    // Commission-payroll outlet: salary fields are hidden and not
    // applicable — never send them, regardless of leftover form state
    // from before the Working Outlet changed.
    if (payrollType === 'commission') {
      delete payload.salaryType
      delete payload.baseSalary
    }

    // outletId always comes from the Working Outlet — the ONLY outlet
    // source this form uses, in both create and edit. This is never a
    // reassignment: the Employee List is already filtered by the Working
    // Outlet, so an employee opened for edit already belongs to it —
    // this just reflects the same single source of truth uniformly,
    // not outlet-transfer logic (that's a future, separate feature).
    const payloadWithOutlet = { ...payload, outletId: effectiveOutletId }

    if (isEdit) {
      updateMutation.mutate(
        { employeeId: employee._id, payload: payloadWithOutlet },
        {
          onSuccess: () => { toast.success('Employee updated', employee.name); onClose() },
          onError:   (err) => toast.error('Update failed', err?.response?.data?.message ?? 'Please try again'),
        }
      )
    } else {
      createMutation.mutate(payloadWithOutlet, {
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

          {/* No Working Outlet selected ("All Outlets") — not a valid
              context for this form in either mode. */}
          {!hasWorkingOutlet && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-400">
              <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Select a specific outlet from the switcher above to {isEdit ? 'edit this employee' : 'add an employee'}.</span>
            </div>
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

          {/* Position + Employee Type side by side */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Position" error={errors.position?.message} required={!isEdit}>
              <Input
                {...register('position')}
                placeholder="e.g. Barista, Cashier, Supervisor"
                error={!!errors.position?.message}
                disabled={isPending}
              />
            </FormField>

            <FormField label="Employee Type" error={errors.employeeType?.message} required={!isEdit}>
              <Select
                {...register('employeeType')}
                error={!!errors.employeeType?.message}
                disabled={isPending}
              >
                {EMPLOYEE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EMPLOYEE_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Salary Type + Base Salary — ONLY for fixed-payroll outlets.
              Not rendered at all (not disabled) for commission outlets,
              and reacts immediately when a different outlet is selected. */}
          {showSalaryFields && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Salary Type" error={errors.salaryType?.message} required>
                <Select
                  {...register('salaryType')}
                  error={!!errors.salaryType?.message}
                  disabled={isPending}
                >
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                </Select>
              </FormField>

              <FormField label="Base Salary (IDR)" error={errors.baseSalary?.message} required>
                <RupiahInput
                  control={control}
                  name="baseSalary"
                  placeholder="e.g. 3.000.000"
                  error={!!errors.baseSalary?.message}
                  disabled={isPending}
                />
              </FormField>
            </div>
          )}

          {/* Join Date + KTP Status side by side */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Join Date" error={errors.joinDate?.message} required={!isEdit}>
              <Input
                {...register('joinDate')}
                type="date"
                error={!!errors.joinDate?.message}
                disabled={isPending}
              />
            </FormField>

            <FormField label="KTP Status" error={errors.ktpStatus?.message} required>
              <Select
                {...register('ktpStatus')}
                error={!!errors.ktpStatus?.message}
                disabled={isPending}
              >
                {KTP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {KTP_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

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
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Employee')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default EmployeeFormModal