// src/features/payroll/components/GeneratePayrollModal.jsx

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

import Modal from '@/components/shared/Modal'
import FormField, {
  Input,
  Select,
} from '@/components/shared/FormField'
import AsyncSearchSelect from '@/components/shared/AsyncSearchSelect'

import { useGeneratePayroll } from '../hooks/usePayroll'
import { useOutlets } from '@/features/outlets/hooks/useOutlets'

import useToast from '@/hooks/useToast'
import useDebounce from '@/hooks/useDebounce'

import { cn } from '@/lib/utils'

// ── Zod schema ────────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

const schema = z.object({
  outletId: z.string().regex(OBJECT_ID_RE, 'Select a valid outlet'),

  month: z.coerce
    .number()
    .min(1)
    .max(12),

  year: z.coerce
    .number()
    .min(2000)
    .max(2100),

  workingDays: z.coerce
    .number()
    .min(1, 'Must be at least 1')
    .max(31),
})

// ── Month names helper ────────────────────────────────────────

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// ── Result summary ────────────────────────────────────────────

const GenerateResult = ({ result, onClose }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900">
        <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0" />

        <div>
          <p className="text-2xl font-bold text-brand-700 dark:text-brand-400">
            {result.generated}
          </p>

          <p className="text-xs text-brand-600 dark:text-brand-500">
            Generated
          </p>
        </div>
      </div>

      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border',
          result.skipped > 0
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
            : 'bg-muted border-border'
        )}
      >
        <AlertTriangle
          className={cn(
            'w-5 h-5 shrink-0',
            result.skipped > 0
              ? 'text-amber-500'
              : 'text-muted-foreground'
          )}
        />

        <div>
          <p
            className={cn(
              'text-2xl font-bold',
              result.skipped > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-muted-foreground'
            )}
          >
            {result.skipped}
          </p>

          <p className="text-xs text-muted-foreground">
            Skipped
          </p>
        </div>
      </div>
    </div>

    {result.skippedItems?.length > 0 && (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Skipped employees
        </p>

        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {result.skippedItems.map((item, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-2 text-xs p-2 rounded bg-muted"
            >
              <span className="font-medium text-foreground truncate">
                {item.employeeName ?? item.employeeId}
              </span>

              <span className="text-muted-foreground shrink-0 text-right">
                {item.reason}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="flex justify-end pt-2 border-t border-border">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-semibold rounded-md bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors"
      >
        Done
      </button>
    </div>
  </div>
)

// ── Component ─────────────────────────────────────────────────

const GeneratePayrollModal = ({ open, onClose }) => {
  const toast = useToast()

  const generateMutation = useGeneratePayroll()

  const [result, setResult] = useState(null)

  // ── Outlet search ──────────────────────────────────────────

  const [outletSearch, setOutletSearch] = useState('')

  const debouncedOutletSearch = useDebounce(
    outletSearch,
    300
  )

  const {
    data: outletsData,
    isLoading: outletsLoading,
  } = useOutlets(
    {
      search: debouncedOutletSearch,
      isActive: true,
      limit: 20,
    },
    {
      enabled: open,
    }
  )

  const outlets = outletsData?.data ?? []

  // ── Form ───────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),

    defaultValues: {
      outletId: '',
      month: currentMonth,
      year: currentYear,
      workingDays: 26,
    },
  })

  // ── Reset on open ──────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    reset({
      outletId: '',
      month: currentMonth,
      year: currentYear,
      workingDays: 26,
    })

    setResult(null)
    setOutletSearch('')
  }, [open, reset])

  // ── Close handler ──────────────────────────────────────────

  const handleClose = () => {
    reset()

    setResult(null)
    setOutletSearch('')

    onClose()
  }

  // ── Submit ────────────────────────────────────────────────

  const onSubmit = (data) => {
    generateMutation.mutate(
      {
        outletId: data.outletId,
        month: Number(data.month),
        year: Number(data.year),
        workingDays: Number(data.workingDays),
      },
      {
        onSuccess: (res) => {
          const resData = res.data ?? {}

          setResult({
            generated: resData.generated ?? 0,
            skipped: resData.skipped ?? 0,
            skippedItems: resData.skippedItems ?? [],
          })

          if ((resData.generated ?? 0) > 0) {
            toast.success(
              'Payroll generated',
              `${resData.generated} record${
                resData.generated !== 1 ? 's' : ''
              } created`
            )
          }
        },

        onError: (err) => {
          toast.error(
            'Generation failed',
            err?.response?.data?.message ??
              'Please check your inputs'
          )
        },
      }
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generate Payroll"
      description="Generate payroll records for all active employees in an outlet."
      size="md"
    >
      {result ? (
        <GenerateResult
          result={result}
          onClose={handleClose}
        />
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-4">

            {/* Outlet selector */}
            <FormField
              label="Outlet"
              error={errors.outletId?.message}
              required
            >
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
                    disabled={generateMutation.isPending}
                    emptyMessage={
                      debouncedOutletSearch
                        ? `No outlets matching "${debouncedOutletSearch}"`
                        : 'No active outlets found.'
                    }
                  />
                )}
              />
            </FormField>

            {/* Month + Year */}
            <div className="grid grid-cols-2 gap-3">

              <FormField
                label="Month"
                error={errors.month?.message}
                required
              >
                <Select
                  {...register('month')}
                  error={!!errors.month?.message}
                  disabled={generateMutation.isPending}
                >
                  {MONTHS.map((m, i) => (
                    <option
                      key={m}
                      value={i + 1}
                    >
                      {m}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Year"
                error={errors.year?.message}
                required
              >
                <Select
                  {...register('year')}
                  error={!!errors.year?.message}
                  disabled={generateMutation.isPending}
                >
                  {[
                    currentYear - 1,
                    currentYear,
                    currentYear + 1,
                  ].map((y) => (
                    <option
                      key={y}
                      value={y}
                    >
                      {y}
                    </option>
                  ))}
                </Select>
              </FormField>

            </div>

            {/* Working days */}
            <FormField
              label="Working Days This Period"
              error={errors.workingDays?.message}
              required
            >
              <Input
                {...register('workingDays')}
                type="number"
                min="1"
                max="31"
                error={!!errors.workingDays?.message}
                disabled={generateMutation.isPending}
              />

              <p className="text-[11px] text-muted-foreground mt-1">
                Actual working days in the period
                (e.g. 26 for a typical month).
                Used to calculate monthly salary proration.
              </p>
            </FormField>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={generateMutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={generateMutation.isPending}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {generateMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}

              {generateMutation.isPending
                ? 'Generating…'
                : 'Generate Payroll'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default GeneratePayrollModal