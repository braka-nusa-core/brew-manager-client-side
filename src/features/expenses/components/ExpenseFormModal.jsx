// src/features/expenses/components/ExpenseFormModal.jsx
// Handles both CREATE and EDIT in one modal.
//
// Backend contract (from expense.validation.js + expense.service.js):
//   CREATE POST /expenses:
//     outletId    (required) ObjectId — user picks from outlet selector
//     date        (required) YYYY-MM-DD — normalized to midnight UTC
//     category    (required) enum EXPENSE_CATEGORIES
//     description (required) string 2–255 chars
//     amount      (required) number >= 0
//
//   UPDATE PATCH /expenses/:id:
//     date, category, description, amount — all optional, at least one required
//     outletId + tenantId are IMMUTABLE — never send on update
//
// UX:
//   amount     → <RupiahInput> (formatted display, raw integer to RHF)
//   outletId   → <AsyncSearchSelect> backed by useOutlets()
//   category   → <Select> with EXPENSE_CATEGORIES options

import { useEffect, useState }                      from 'react'
import { useForm, Controller }                      from 'react-hook-form'
import { zodResolver }                              from '@hookform/resolvers/zod'
import { z }                                        from 'zod'
import { Loader2 }                                  from 'lucide-react'

import Modal                                        from '@/components/shared/Modal'
import FormField, { Input, Select }                 from '@/components/shared/FormField'
import AsyncSearchSelect                            from '@/components/shared/AsyncSearchSelect'
import RupiahInput                                  from '@/components/shared/RupiahInput'
import { useCreateExpense, useUpdateExpense }        from '../hooks/useExpenses'
import { EXPENSE_CATEGORIES }                       from './ExpenseCategoryBadge'
import { useOutlets }                               from '@/features/outlets/hooks/useOutlets'
import useToast                                     from '@/hooks/useToast'
import useDebounce                                  from '@/hooks/useDebounce'
import { cn }                                       from '@/lib/utils'

// ── Zod schemas ───────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

const createSchema = z.object({
  outletId: z.string().regex(OBJECT_ID_RE, 'Select a valid outlet'),
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
  outletId:    '',
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

  // Outlet search state — create mode only
  const [outletSearch, setOutletSearch] = useState('')
  const debouncedOutletSearch = useDebounce(outletSearch, 300)

  const { data: outletsData, isLoading: outletsLoading } = useOutlets(
    { search: debouncedOutletSearch, isActive: true, limit: 20 },
    { enabled: open && !isEdit }
  )
  const outlets = outletsData?.data ?? []

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
      setOutletSearch('')
    }
  }, [open, isEdit, expense, reset])

  const onSubmit = (data) => {
    console.log(data)
    const payload = cleanPayload(data)
    if (isEdit) {
      updateMutation.mutate(
        { expenseId: expense._id, payload },
        {
          onSuccess: () => { toast.success('Expense updated successfully'); onClose() },
          onError:   (err) => toast.error('Update failed', err?.response?.data?.message ?? 'Please try again'),
        }
      )
    } else {
      createMutation.mutate(payload, {
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

          {/* Outlet selector — create only (immutable on edit) */}
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
            disabled={isPending}
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