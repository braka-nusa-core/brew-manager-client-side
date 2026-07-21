// src/features/expenses/components/ExpenseFormModal.jsx
// Handles both CREATE and EDIT in one modal.
//
// Backend contract (from expense.validation.js + expense.service.js):
//   CREATE POST /expenses:
//     outletId    (required) ObjectId — now derived from the Working
//                 Outlet (useEffectiveOutletId()), never a form field
//     date        (required) YYYY-MM-DD — normalized to midnight UTC
//     category    (required) enum EXPENSE_CATEGORIES
//     description (required) string 2–255 chars
//     amount      (required) number >= 0
//
//   UPDATE PATCH /expenses/:id:
//     date, category, description, amount — all optional, at least one required
//     outletId + tenantId are IMMUTABLE — never send on update
//
// Working Outlet architecture:
//   There is no outlet selector in this form at all. outletId always
//   comes from useEffectiveOutletId() — the same single source of
//   truth the Navbar's Outlet Switcher writes to. If no specific
//   Working Outlet is selected ("All Outlets"), recording an expense
//   is blocked entirely (nothing to assign it to).
//
// UX:
//   amount     → <RupiahInput> (formatted display, raw integer to RHF)
//   category   → <Select> with EXPENSE_CATEGORIES options

import { useEffect }                                from 'react'
import { useForm }                                  from 'react-hook-form'
import { zodResolver }                              from '@hookform/resolvers/zod'
import { z }                                        from 'zod'
import { Loader2, TriangleAlert }                   from 'lucide-react'

import Modal                                        from '@/components/shared/Modal'
import FormField, { Input, Select }                 from '@/components/shared/FormField'
import RupiahInput                                  from '@/components/shared/RupiahInput'
import { useCreateExpense, useUpdateExpense }        from '../hooks/useExpenses'
import { EXPENSE_CATEGORIES }                       from './ExpenseCategoryBadge'
import { useEffectiveOutletId }                     from '@/store/activeOutletStore'
import useToast                                     from '@/hooks/useToast'
import { cn }                                       from '@/lib/utils'

// ── Zod schemas ───────────────────────────────────────────────
//
// outletId is intentionally NOT a field here — see file header.

const createSchema = z.object({
  date:     z.string().min(1, 'Date is required'),
  category: z.enum(EXPENSE_CATEGORIES, {
    required_error:  'Select a category',
    invalid_type_error: 'Select a valid category',
  }),
  description: z
    .string()
    .min(2, 'Description must be at least 2 characters')
    .max(255, 'Description too long'),
  // RupiahInput stores integer | '' — require actual number on create
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Enter a valid amount' })
    .min(0, 'Cannot be negative'),
})

// On edit: outletId + tenantId immutable (never sent), at least one field required
const editSchema = z
  .object({
    date:        z.string().optional().or(z.literal('')),
    category:    z.enum(EXPENSE_CATEGORIES).optional(),
    description: z.string().min(2, 'At least 2 characters').max(255).optional().or(z.literal('')),
    amount:      z.union([z.number().min(0, 'Cannot be negative'), z.literal('')]).optional(),
  })
  .refine(
    (d) => [d.date, d.category, d.description, d.amount].some((v) => v !== undefined && v !== ''),
    { message: 'Provide at least one field to update' }
  )

// ── Helpers ───────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const toDateValue = (iso) => {
  if (!iso) return ''
  try { return new Date(iso).toISOString().split('T')[0] } catch { return '' }
}

const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

// ── Default values ────────────────────────────────────────────

const getCreateDefaults = () => ({
  date:        today(),
  category:    '',
  description: '',
  amount:      '',
})

const getEditDefaults = (expense) => ({
  date:        toDateValue(expense?.date),
  category:    expense?.category    ?? '',
  description: expense?.description ?? '',
  amount:      expense?.amount      ?? '',
})

// ── Component ─────────────────────────────────────────────────

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   expense?: Object | null
 * }} props
 */
const ExpenseFormModal = ({ open, onClose, expense = null }) => {
  const isEdit = Boolean(expense)
  const toast  = useToast()

  // The single source of truth for outlet — no local outlet state, no
  // form field, no AsyncSearchSelect. Same store the Navbar's Outlet
  // Switcher writes to. null = "All Outlets".
  const effectiveOutletId = useEffectiveOutletId()
  const hasWorkingOutlet  = !!effectiveOutletId

  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(expense) : getCreateDefaults(),
  })

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset(getEditDefaults(expense))
    } else {
      reset(getCreateDefaults())
    }
  }, [open, isEdit, expense, reset])

  const onSubmit = (data) => {
    // No Working Outlet selected ("All Outlets") — only relevant to
    // CREATE, since outletId is immutable on update (never sent, per
    // backend contract) and edit doesn't depend on it at all.
    if (!isEdit && !hasWorkingOutlet) return

    const payload = cleanPayload(data)
    if (isEdit) {
      // outletId is immutable on update — never sent, matches backend contract.
      updateMutation.mutate(
        { expenseId: expense._id, payload },
        {
          onSuccess: () => { toast.success('Expense updated successfully'); onClose() },
          onError:   (err) => toast.error('Update failed', err?.response?.data?.message ?? 'Please try again'),
        }
      )
    } else {
      // outletId always comes from the Working Outlet, never a form field.
      createMutation.mutate({ ...payload, outletId: effectiveOutletId }, {
        onSuccess: () => { toast.success('Expense recorded successfully'); onClose() },
        onError:   (err) => toast.error('Failed to record expense', err?.response?.data?.message ?? 'Check your inputs'),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Expense' : 'Record Expense'}
      description={
        isEdit
          ? 'Update this expense record. Leave fields blank to keep current values.'
          : 'Fill in all required fields to record a new expense.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* No Working Outlet selected ("All Outlets") — only relevant
              to create; outletId is immutable on update. */}
          {!isEdit && !hasWorkingOutlet && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-400">
              <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Select a specific outlet from the switcher above to record an expense.</span>
            </div>
          )}

          {/* Date */}
          <FormField label="Expense Date" error={errors.date?.message} required={!isEdit}>
            <Input
              {...register('date')}
              type="date"
              error={!!errors.date?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Category */}
          <FormField label="Category" error={errors.category?.message} required={!isEdit}>
            <Select
              {...register('category')}
              error={!!errors.category?.message}
              disabled={isPending}
            >
              <option value="">Select a category…</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Description */}
          <FormField label="Description" error={errors.description?.message} required={!isEdit}>
            <Input
              {...register('description')}
              placeholder="e.g. Coffee beans restocking — 5kg"
              error={!!errors.description?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Amount */}
          <FormField label="Amount (IDR)" error={errors.amount?.message} required={!isEdit}>
            <RupiahInput
              control={control}
              name="amount"
              placeholder="e.g. 250.000"
              error={!!errors.amount?.message}
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
            disabled={isPending || (!isEdit && !hasWorkingOutlet)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending
              ? (isEdit ? 'Saving…' : 'Recording…')
              : (isEdit ? 'Save Changes' : 'Record Expense')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ExpenseFormModal