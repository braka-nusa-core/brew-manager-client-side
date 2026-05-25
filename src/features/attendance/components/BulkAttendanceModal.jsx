// src/features/attendance/components/BulkAttendanceModal.jsx
// Bulk attendance input for one date across multiple employees.
//
// Backend shape: POST /attendance/bulk
//   { date: "YYYY-MM-DD", attendances: [{ employeeId, status, notes? }] }
//
// Response: { successCount, failedCount, failedItems: [{ employeeId, reason }] }
//
// Change log:
//   • Per-row employeeId: raw ObjectId <Input> → <AsyncSearchSelect> backed by useEmployees().
//   • Each row maintains its own search state via a rowSearches[] array in useState.
//   • RHF field value (attendances[i].employeeId) remains a plain _id string — unchanged for Zod
//     and the backend payload.
//   • The "failed entries" summary still shows the _id (unchanged — backend returns _id in failedItems).

import { useState }                    from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver }                 from '@hookform/resolvers/zod'
import { z }                           from 'zod'
import { Loader2, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'

import Modal                           from '@/components/shared/Modal'
import FormField, { Input, Select }    from '@/components/shared/FormField'
import AsyncSearchSelect               from '@/components/shared/AsyncSearchSelect'
import { useBulkCreateAttendance }     from '../hooks/useAttendance'
import { ATTENDANCE_STATUSES }         from './AttendanceStatusBadge'
import { useEmployees }                from '@/features/employee/hooks/useEmployees'
import useDebounce                     from '@/hooks/useDebounce'
import useToast                        from '@/hooks/useToast'
import { cn }                          from '@/lib/utils'

// ── Zod schema ────────────────────────────────────────────────
// Unchanged — employeeId is still a 24-char ObjectId string.

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

const bulkSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  attendances: z.array(
    z.object({
      employeeId: z
        .string()
        .regex(OBJECT_ID_RE, 'Select an employee'),
      status: z.enum(['present', 'absent', 'late', 'leave', 'holiday'], {
        required_error: 'Status required',
      }),
      notes: z.string().max(200).optional().or(z.literal('')),
    })
  ).min(1, 'Add at least one employee entry'),
})

// ── Result Summary ────────────────────────────────────────────

const BulkResultSummary = ({ result, onClose }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900">
        <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0" />
        <div>
          <p className="text-xl font-bold text-brand-700 dark:text-brand-400">
            {result.successCount}
          </p>
          <p className="text-xs text-brand-600 dark:text-brand-500">Inserted</p>
        </div>
      </div>

      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        result.failedCount > 0
          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
          : 'bg-muted border-border'
      )}>
        <AlertTriangle className={cn(
          'w-5 h-5 shrink-0',
          result.failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'
        )} />
        <div>
          <p className={cn(
            'text-xl font-bold',
            result.failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {result.failedCount}
          </p>
          <p className="text-xs text-muted-foreground">Failed / Skipped</p>
        </div>
      </div>
    </div>

    {result.failedItems?.length > 0 && (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Failed entries
        </p>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {result.failedItems.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs p-2 rounded bg-muted"
            >
              <span className="font-mono text-muted-foreground break-all">
                {item.employeeId}
              </span>
              <span className="text-destructive shrink-0">— {item.reason}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="flex justify-end pt-2 border-t border-border">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium rounded-md bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors"
      >
        Done
      </button>
    </div>
  </div>
)

// ── Per-row employee selector ──────────────────────────────────
// Isolated component so each row manages its own search string
// without causing the entire field array to re-render.

const EmployeeRowSelector = ({ control, index, error, disabled, open }) => {
  const [search, setSearch]   = useState('')
  const debouncedSearch       = useDebounce(search, 300)

  const { data, isLoading } = useEmployees(
    { search: debouncedSearch, isActive: true, limit: 15 },
    { enabled: open },
  )
  const employees = data?.data ?? []

  return (
    <Controller
      control={control}
      name={`attendances.${index}.employeeId`}
      render={({ field }) => (
        <AsyncSearchSelect
          value={field.value}
          onChange={field.onChange}
          items={employees}
          getLabel={(e) => e.position ? `${e.name} — ${e.position}` : e.name}
          getValue={(e) => e._id}
          onSearchChange={setSearch}
          isLoading={isLoading}
          placeholder="Search employee…"
          error={!!error}
          disabled={disabled}
          emptyMessage={
            debouncedSearch
              ? `No employees matching "${debouncedSearch}"`
              : 'Start typing to search employees.'
          }
        />
      )}
    />
  )
}

// ── Component ─────────────────────────────────────────────────

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
const BulkAttendanceModal = ({ open, onClose }) => {
  const toast        = useToast()
  const bulkMutation = useBulkCreateAttendance()
  const [result, setResult] = useState(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      date:        '',
      attendances: [{ employeeId: '', status: 'present', notes: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attendances',
  })

  const handleClose = () => {
    reset()
    setResult(null)
    onClose()
  }

  const onSubmit = (data) => {
    const payload = {
      date: data.date,
      attendances: data.attendances.map((a) => ({
        employeeId: a.employeeId.trim(),
        status:     a.status,
        ...(a.notes?.trim() ? { notes: a.notes.trim() } : {}),
      })),
    }

    bulkMutation.mutate(payload, {
      onSuccess: (res) => {
        const resData = res.data ?? res
        setResult({
          successCount: resData.successCount ?? resData.inserted ?? 0,
          failedCount:  resData.failedCount  ?? resData.duplicates?.length ?? 0,
          failedItems:  resData.failedItems  ?? [],
        })
        if ((resData.successCount ?? resData.inserted ?? 0) > 0) {
          toast.success(
            'Bulk attendance submitted',
            `${resData.successCount ?? resData.inserted} records inserted`
          )
        }
      },
      onError: (err) => {
        toast.error(
          'Bulk submission failed',
          err?.response?.data?.message ?? 'Please check your inputs'
        )
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Attendance Input"
      description="Record attendance for multiple employees on one date."
      size="lg"
    >
      {result ? (
        <BulkResultSummary result={result} onClose={handleClose} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">

            {/* Date picker */}
            <FormField label="Attendance Date" error={errors.date?.message} required>
              <Input
                {...register('date')}
                type="date"
                error={!!errors.date?.message}
                disabled={bulkMutation.isPending}
              />
            </FormField>

            {/* Employee entries */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">
                  Employees
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    ({fields.length} {fields.length === 1 ? 'entry' : 'entries'})
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => append({ employeeId: '', status: 'present', notes: '' })}
                  disabled={bulkMutation.isPending}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add row
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">

                    {/* Employee selector */}
                    <div className="flex-1 min-w-0">
                      <EmployeeRowSelector
                        open={open}
                        control={control}
                        index={index}
                        error={errors.attendances?.[index]?.employeeId}
                        disabled={bulkMutation.isPending}
                      />
                      {errors.attendances?.[index]?.employeeId && (
                        <p className="text-[10px] text-destructive mt-0.5">
                          {errors.attendances[index].employeeId.message}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-32 shrink-0">
                      <Select
                        {...register(`attendances.${index}.status`)}
                        error={!!errors.attendances?.[index]?.status}
                        disabled={bulkMutation.isPending}
                      >
                        {ATTENDANCE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Notes */}
                    <div className="w-36 shrink-0 hidden sm:block">
                      <Input
                        {...register(`attendances.${index}.notes`)}
                        placeholder="Notes (opt.)"
                        disabled={bulkMutation.isPending}
                        className="text-xs"
                      />
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1 || bulkMutation.isPending}
                      className="p-1.5 mt-0.5 rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>
                ))}
              </div>

              {errors.attendances?.root && (
                <p className="text-xs text-destructive mt-1">
                  {errors.attendances.root.message}
                </p>
              )}
              {typeof errors.attendances?.message === 'string' && (
                <p className="text-xs text-destructive mt-1">
                  {errors.attendances.message}
                </p>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={bulkMutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={bulkMutation.isPending}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {bulkMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {bulkMutation.isPending
                ? `Submitting ${fields.length} records…`
                : `Submit ${fields.length} Record${fields.length !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default BulkAttendanceModal