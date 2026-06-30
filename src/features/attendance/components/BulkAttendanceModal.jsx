// src/features/attendance/components/BulkAttendanceModal.jsx
// Bulk attendance input — redesigned for usability.
//
// v2 layout change:
//   Before: cramped single horizontal row (selector + status + notes + delete)
//   After:  card per employee entry — employee selector full width on top,
//           status + notes side by side below, delete button in card corner.
//   This gives the AsyncSearchSelect enough room to be usable.

import { useState }                          from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2, Trash2, AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input, Select }           from '@/components/shared/FormField'
import AsyncSearchSelect                      from '@/components/shared/AsyncSearchSelect'
import { useBulkCreateAttendance }            from '../hooks/useAttendance'
import { ATTENDANCE_STATUSES }                from './AttendanceStatusBadge'
import { useEmployees }                       from '@/features/employee/hooks/useEmployees'
import useDebounce                            from '@/hooks/useDebounce'
import useToast                               from '@/hooks/useToast'
import { cn }                                 from '@/lib/utils'

// ── Zod schema ─────────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

const bulkSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  attendances: z.array(
    z.object({
      employeeId: z.string().regex(OBJECT_ID_RE, 'Select an employee'),
      status:     z.enum(['present', 'absent', 'late', 'leave', 'holiday'], {
        required_error: 'Status required',
      }),
      notes: z.string().max(200).optional().or(z.literal('')),
    })
  ).min(1, 'Add at least one employee entry'),
})

// ── Status config ──────────────────────────────────────────────

const STATUS_CONFIG = {
  present: { label: 'Present',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  late:    { label: 'Late',     color: 'bg-amber-100   text-amber-700   border-amber-200'   },
  absent:  { label: 'Absent',   color: 'bg-red-100     text-red-700     border-red-200'     },
  leave:   { label: 'On Leave', color: 'bg-blue-100    text-blue-700    border-blue-200'    },
  holiday: { label: 'Holiday',  color: 'bg-violet-100  text-violet-700  border-violet-200'  },
}

// ── Result Summary ──────────────────────────────────────────────

const BulkResultSummary = ({ result, onClose }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        <div>
          <p className="text-2xl font-bold text-emerald-700">{result.successCount}</p>
          <p className="text-xs text-emerald-600">Records inserted</p>
        </div>
      </div>
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-xl border',
        result.failedCount > 0 ? 'bg-red-50 border-red-100' : 'bg-zinc-50 border-zinc-100'
      )}>
        <AlertTriangle className={cn('w-5 h-5 shrink-0', result.failedCount > 0 ? 'text-red-500' : 'text-zinc-400')} />
        <div>
          <p className={cn('text-2xl font-bold', result.failedCount > 0 ? 'text-red-700' : 'text-zinc-400')}>
            {result.failedCount}
          </p>
          <p className="text-xs text-muted-foreground">Failed / Skipped</p>
        </div>
      </div>
    </div>

    {result.failedItems?.length > 0 && (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Failed entries</p>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {result.failedItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted">
              <span className="font-mono text-muted-foreground break-all">{item.employeeId}</span>
              <span className="text-destructive shrink-0">— {item.reason}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="flex justify-end pt-2 border-t border-border">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors"
      >
        Done
      </button>
    </div>
  </div>
)

// ── Per-entry employee selector ────────────────────────────────
// Isolated so each row has its own search state

const EmployeeSelector = ({ control, index, error, disabled, open }) => {
  const [search, setSearch] = useState('')
  const debouncedSearch     = useDebounce(search, 300)

  const { data, isLoading } = useEmployees(
    { search: debouncedSearch, isActive: true, limit: 20 },
    { enabled: open }
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
          placeholder="Search and select employee…"
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

// ── Entry Card ─────────────────────────────────────────────────

const EntryCard = ({ field, index, control, register, errors, isPending, open, canRemove, onRemove, watchStatus }) => {
  const statusCfg = STATUS_CONFIG[watchStatus] ?? STATUS_CONFIG.present

  return (
    <div className={cn(
      'relative rounded-xl border bg-card p-4 space-y-3 transition-all',
      errors.attendances?.[index]?.employeeId ? 'border-destructive/50' : 'border-border',
    )}>
      {/* Card header: entry number + status chip + delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
            {index + 1}
          </span>
          {/* Live status chip */}
          <span className={cn(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
            statusCfg.color
          )}>
            {statusCfg.label}
          </span>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove || isPending}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            canRemove
              ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
              : 'text-muted-foreground/20 cursor-not-allowed'
          )}
          title={canRemove ? 'Remove entry' : 'At least one entry required'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Employee selector — full width */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Employee <span className="text-destructive">*</span>
        </label>
        <EmployeeSelector
          control={control}
          index={index}
          error={errors.attendances?.[index]?.employeeId}
          disabled={isPending}
          open={open}
        />
        {errors.attendances?.[index]?.employeeId && (
          <p className="text-[11px] text-destructive mt-1">
            {errors.attendances[index].employeeId.message}
          </p>
        )}
      </div>

      {/* Status + Notes side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Status <span className="text-destructive">*</span>
          </label>
          <Select
            {...register(`attendances.${index}.status`)}
            error={!!errors.attendances?.[index]?.status}
            disabled={isPending}
          >
            {ATTENDANCE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s]?.label ?? s}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Notes <span className="text-muted-foreground/50 font-normal">(optional)</span>
          </label>
          <Input
            {...register(`attendances.${index}.notes`)}
            placeholder="e.g. Sick leave"
            disabled={isPending}
          />
        </div>
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────

const BulkAttendanceModal = ({ open, onClose }) => {
  const toast        = useToast()
  const bulkMutation = useBulkCreateAttendance()
  const [result, setResult] = useState(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      date:        '',
      attendances: [{ employeeId: '', status: 'present', notes: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'attendances' })

  // Watch all statuses to show live chip in each card
  const watchedAttendances = watch('attendances')

  const handleClose = () => { reset(); setResult(null); onClose() }

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
        const d = res.data ?? res
        setResult({
          successCount: d.successCount ?? d.inserted ?? 0,
          failedCount:  d.failedCount  ?? d.duplicates?.length ?? 0,
          failedItems:  d.failedItems  ?? [],
        })
        if ((d.successCount ?? d.inserted ?? 0) > 0) {
          toast.success('Bulk attendance submitted', `${d.successCount ?? d.inserted} records inserted`)
        }
      },
      onError: (err) => {
        toast.error('Bulk submission failed', err?.response?.data?.message ?? 'Please check your inputs')
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

            {/* Date */}
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
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Employees</p>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {fields.length} {fields.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => append({ employeeId: '', status: 'present', notes: '' })}
                  disabled={bulkMutation.isPending}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg',
                    'bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Employee
                </button>
              </div>

              {/* Entry cards */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-0.5">
                {fields.map((field, index) => (
                  <EntryCard
                    key={field.id}
                    field={field}
                    index={index}
                    control={control}
                    register={register}
                    errors={errors}
                    isPending={bulkMutation.isPending}
                    open={open}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(index)}
                    watchStatus={watchedAttendances?.[index]?.status ?? 'present'}
                  />
                ))}
              </div>

              {errors.attendances?.message && (
                <p className="text-xs text-destructive mt-2">{errors.attendances.message}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {fields.length} employee{fields.length !== 1 ? 's' : ''} · 1 date
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={bulkMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-input hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bulkMutation.isPending}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg',
                  'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {bulkMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {bulkMutation.isPending
                  ? `Submitting…`
                  : `Submit ${fields.length} Record${fields.length !== 1 ? 's' : ''}`
                }
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default BulkAttendanceModal