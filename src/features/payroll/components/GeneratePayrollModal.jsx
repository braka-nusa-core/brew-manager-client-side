// src/features/payroll/components/GeneratePayrollModal.jsx
//
// Working Outlet architecture:
//   There is no outlet selector in this form. Payroll is always
//   generated for the current Working Outlet (useEffectiveOutletId()) —
//   the same single source of truth the Navbar's Outlet Switcher writes
//   to. If no specific Working Outlet is selected ("All Outlets"),
//   generation is blocked entirely — there is no single outlet to
//   generate for.

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TriangleAlert,
} from 'lucide-react'

import Modal from '@/components/shared/Modal'
import FormField, {
  Input,
  Select,
} from '@/components/shared/FormField'

import { useGeneratePayroll } from '../hooks/usePayroll'
import { useEffectiveOutletId } from '@/store/activeOutletStore'

import useToast from '@/hooks/useToast'

import { cn } from '@/lib/utils'

// ── Zod schema ────────────────────────────────────────────────
//
// outletId is intentionally NOT a field here — see file header.

const schema = z.object({
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

  // The single source of truth for outlet — no local outlet state, no
  // form field, no AsyncSearchSelect. Same store the Navbar's Outlet
  // Switcher writes to. null = "All Outlets".
  const effectiveOutletId = useEffectiveOutletId()
  const hasWorkingOutlet  = !!effectiveOutletId

  const generateMutation = useGeneratePayroll()

  const [result, setResult] = useState(null)

  // ── Form ───────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),

    defaultValues: {
      month: currentMonth,
      year: currentYear,
      workingDays: 26,
    },
  })

  // ── Reset on open ──────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    reset({
      month: currentMonth,
      year: currentYear,
      workingDays: 26,
    })

    setResult(null)
  }, [open, reset])

  // ── Close handler ──────────────────────────────────────────

  const handleClose = () => {
    reset()

    setResult(null)

    onClose()
  }

  // ── Submit ────────────────────────────────────────────────

  const onSubmit = (data) => {
    // No Working Outlet selected ("All Outlets") — not a valid context
    // for generation. Blocked in the UI below, but guard here too in
    // case of a stray submit.
    if (!hasWorkingOutlet) return

    generateMutation.mutate(
      {
        outletId: effectiveOutletId,
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

            {/* No Working Outlet selected ("All Outlets") — generation
                requires exactly one outlet to generate for. */}
            {!hasWorkingOutlet && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-400">
                <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Select a specific outlet from the switcher above to generate payroll.</span>
              </div>
            )}

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
              disabled={generateMutation.isPending || !hasWorkingOutlet}
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