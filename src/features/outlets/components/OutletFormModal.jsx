// src/features/outlet/components/OutletFormModal.jsx
// Handles both CREATE and EDIT in one modal.
//
// Backend contract:
//   CREATE: POST /outlets
//     Required: name
//     Optional: code (auto-generated if omitted), address, phone,
//               payrollType, commissionPercentage, mealAllowancePerDay,
//               weeklyAttendanceBonus, bonusRules
//     tenantId from JWT — never sent in body
//
//   UPDATE: PATCH /outlets/:id
//     All optional. tenantId immutable. At least 1 field required.
//     isActive changes go to /toggle-active — NOT this form.
//
// Payroll configuration (Phase 1 extension — mirrors outlet.validation.js):
//   payrollType           'fixed' | 'commission'   default 'fixed'
//   commissionPercentage  0-100                    only meaningful when payrollType='commission'
//   mealAllowancePerDay   >= 0
//   weeklyAttendanceBonus >= 0
//   bonusRules            [{ minCups: int >0, bonusAmount: int >0 }], minCups unique

import { useEffect }                          from 'react'
import { useForm, useFieldArray }             from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2, Building2, Plus, Trash2 }   from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input, Select }           from '@/components/shared/FormField'
import { useCreateOutlet, useUpdateOutlet }   from '../hooks/useOutlets'
import useToast                               from '@/hooks/useToast'
import { cn }                                 from '@/lib/utils'

// ── Payroll config (shared between create/edit — mirrors backend) ──

const PAYROLL_TYPES = ['fixed', 'commission']

const bonusRuleSchema = z.object({
  minCups:     z.coerce.number({ invalid_type_error: 'Required' })
                 .int('Must be a whole number')
                 .min(1, 'Must be at least 1'),
  bonusAmount: z.coerce.number({ invalid_type_error: 'Required' })
                 .int('Must be a whole number')
                 .min(1, 'Must be at least 1'),
})

// No-duplicate-minCups check — mirrors outlet.validation.js's seenMinCups logic
const bonusRulesSchema = z.array(bonusRuleSchema).superRefine((rules, ctx) => {
  const seen = new Set()
  rules.forEach((rule, i) => {
    if (seen.has(rule.minCups)) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: `Duplicate minCups (${rule.minCups})`,
        path:    [i, 'minCups'],
      })
    } else {
      seen.add(rule.minCups)
    }
  })
})

const payrollFields = {
  payrollType:           z.enum(PAYROLL_TYPES).default('fixed'),
  commissionPercentage:  z.coerce.number().min(0, 'Must be 0 or more').max(100, 'Must be 100 or less').default(0),
  mealAllowancePerDay:   z.coerce.number().min(0, 'Must be 0 or more').default(0),
  weeklyAttendanceBonus: z.coerce.number().min(0, 'Must be 0 or more').default(0),
  bonusRules:            bonusRulesSchema.default([]),
}

// ── Zod schemas ───────────────────────────────────────────────

const createSchema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters').max(100),
  code:    z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must not exceed 10 characters')
             .optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  phone:   z.string().max(20).optional().or(z.literal('')),
  ...payrollFields,
})

const editSchema = z.object({
  name:    z.string().min(2).max(100).optional().or(z.literal('')),
  code:    z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must not exceed 10 characters')
             .optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  phone:   z.string().max(20).optional().or(z.literal('')),
  ...payrollFields,
}).refine(
  (d) => Object.values(d).some((v) => v !== '' && v !== undefined),
  { message: 'Provide at least one field to update' }
)

// ── Helpers ───────────────────────────────────────────────────

// Payroll fields have backend defaults ('fixed', 0, []) — no need to
// transmit them when they're still at their default/meaningless state.
// Applied before the generic blank-value strip below.
const trimPayrollDefaults = (data) => {
  const trimmed = { ...data }

  // commissionPercentage only matters in 'commission' mode; if payrollType
  // is 'fixed' and the value is still 0 (unset), there's nothing to send.
  if (trimmed.payrollType === 'fixed' && !trimmed.commissionPercentage) {
    delete trimmed.commissionPercentage
  }
  if (!trimmed.mealAllowancePerDay)   delete trimmed.mealAllowancePerDay
  if (!trimmed.weeklyAttendanceBonus) delete trimmed.weeklyAttendanceBonus
  if (!trimmed.bonusRules || trimmed.bonusRules.length === 0) delete trimmed.bonusRules

  return trimmed
}

const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(trimPayrollDefaults(data)).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

const getCreateDefaults = () => ({
  name: '', code: '', address: '', phone: '',
  payrollType:           'fixed',
  commissionPercentage:  0,
  mealAllowancePerDay:   0,
  weeklyAttendanceBonus: 0,
  bonusRules:            [],
})

const getEditDefaults = (outlet) => ({
  name:    outlet?.name    ?? '',
  code:    outlet?.code    ?? '',
  address: outlet?.address ?? '',
  phone:   outlet?.phone   ?? '',
  payrollType:           outlet?.payrollType           ?? 'fixed',
  commissionPercentage:  outlet?.commissionPercentage  ?? 0,
  mealAllowancePerDay:   outlet?.mealAllowancePerDay   ?? 0,
  weeklyAttendanceBonus: outlet?.weeklyAttendanceBonus ?? 0,
  bonusRules:            outlet?.bonusRules            ?? [],
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
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(outlet) : getCreateDefaults(),
  })

  const { fields: bonusFields, append: appendBonusRule, remove: removeBonusRule } =
    useFieldArray({ control, name: 'bonusRules' })

  const payrollType = watch('payrollType')

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
          onError:   (err) => {
            const status = err?.response?.status
            const msg    = err?.response?.data?.message ?? 'Please try again'
            const title  = status === 409 ? 'Outlet code already exists' : 'Update failed'
            toast.error(title, msg)
          },
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Outlet created successfully'); onClose() },
        onError:   (err) => {
          const status = err?.response?.status
          const msg    = err?.response?.data?.message ?? 'Check your inputs'
          // Backend returns 403 for both role-restriction and plan-limit
          // rejections — distinguish using the message text, same pattern
          // already used for the User module's create-error mapping.
          const isPlanLimit = status === 403 && /plan limit reached/i.test(msg)
          const title  = status === 409 ? 'Outlet code already exists'
                       : isPlanLimit     ? 'Outlet limit reached'
                       : status === 403  ? 'Permission denied'
                       : 'Failed to create outlet'
          toast.error(title, msg)
        },
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
      size="lg"
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

          {/* ── Payroll Configuration ─────────────────────────── */}
          <div className="pt-4 mt-2 border-t border-border">
            <p className="text-sm font-semibold text-foreground mb-3">Payroll Configuration</p>

            <div className="space-y-4">

              {/* Payroll Type */}
              <FormField label="Payroll Type" error={errors.payrollType?.message}>
                <Select
                  {...register('payrollType')}
                  error={!!errors.payrollType?.message}
                  disabled={isPending}
                >
                  <option value="fixed">Fixed</option>
                  <option value="commission">Commission</option>
                </Select>
              </FormField>

              {/* Commission Percentage — only when payrollType = commission */}
              {payrollType === 'commission' && (
                <FormField label="Commission Percentage" error={errors.commissionPercentage?.message}>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register('commissionPercentage')}
                      placeholder="e.g. 10"
                      error={!!errors.commissionPercentage?.message}
                      disabled={isPending}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Commission = revenue × (percentage / 100).
                  </p>
                </FormField>
              )}

              {/* Meal Allowance Per Day */}
              <FormField label="Meal Allowance / Day" error={errors.mealAllowancePerDay?.message}>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  {...register('mealAllowancePerDay')}
                  placeholder="e.g. 15000"
                  error={!!errors.mealAllowancePerDay?.message}
                  disabled={isPending}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  IDR per present day. Applies to both payroll types.
                </p>
              </FormField>

              {/* Weekly Attendance Bonus */}
              <FormField label="Weekly Attendance Bonus" error={errors.weeklyAttendanceBonus?.message}>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  {...register('weeklyAttendanceBonus')}
                  placeholder="e.g. 50000"
                  error={!!errors.weeklyAttendanceBonus?.message}
                  disabled={isPending}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  IDR per perfect-attendance week. Applies to both payroll types.
                </p>
              </FormField>

              {/* Bonus Rules — dynamic tiers */}
              <FormField label="Cup Bonus Tiers" error={errors.bonusRules?.root?.message ?? errors.bonusRules?.message}>
                <div className="space-y-2">
                  {bonusFields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Min cups"
                          {...register(`bonusRules.${index}.minCups`)}
                          error={!!errors.bonusRules?.[index]?.minCups?.message}
                          disabled={isPending}
                        />
                        {errors.bonusRules?.[index]?.minCups?.message && (
                          <p className="text-xs text-destructive leading-none pt-1">
                            {errors.bonusRules[index].minCups.message}
                          </p>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Bonus amount (IDR)"
                          {...register(`bonusRules.${index}.bonusAmount`)}
                          error={!!errors.bonusRules?.[index]?.bonusAmount?.message}
                          disabled={isPending}
                        />
                        {errors.bonusRules?.[index]?.bonusAmount?.message && (
                          <p className="text-xs text-destructive leading-none pt-1">
                            {errors.bonusRules[index].bonusAmount.message}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBonusRule(index)}
                        disabled={isPending}
                        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        aria-label="Remove tier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => appendBonusRule({ minCups: '', bonusAmount: '' })}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Tier
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  If cups sold in a day reach a tier's minimum, its bonus is added. Tiers are additive.
                </p>
              </FormField>

            </div>
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