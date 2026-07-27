// src/features/payroll/components/PayrollDetailModal.jsx
// Shows full payroll record detail + action buttons.
//
// Actions available per status:
//   draft    → adjust (manualBonus/deductions/kasbon) | approve | (no paid)
//   approved → reject (back to draft)          | mark paid
//   paid     → read only (terminal state)
//
// Adjust uses inline form within the modal — no separate modal needed.

import { useState, useEffect }       from 'react'
import { useForm }                   from 'react-hook-form'
import { zodResolver }               from '@hookform/resolvers/zod'
import { z }                         from 'zod'
import {
  Loader2, CheckCircle2, RotateCcw,
  Banknote, Sliders, User, Building2,
  Calendar, Coffee, TrendingUp,
} from 'lucide-react'

import Modal                         from '@/components/shared/Modal'
import FormField, { Input }          from '@/components/shared/FormField'
import PayrollStatusBadge            from './PayrollStatusBadge'
import {
  usePayroll,
  useApprovePayroll,
  useRejectPayroll,
  useMarkPayrollPaid,
  useAdjustPayroll,
} from '../hooks/usePayroll'
import useToast                      from '@/hooks/useToast'
import { cn }                        from '@/lib/utils'

// ── Formatters ────────────────────────────────────────────────

const formatIDR = (val) =>
  val != null
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
      }).format(val)
    : '—'

const MONTHS = [
  '', 'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const formatPeriod = (period) =>
  period ? `${MONTHS[period.month] ?? period.month} ${period.year}` : '—'

// ── Adjust schema ─────────────────────────────────────────────

const adjustSchema = z.object({
  manualBonus: z.coerce.number().min(0, 'Cannot be negative').optional().or(z.literal('')),
  deductions:  z.coerce.number().min(0, 'Cannot be negative').optional().or(z.literal('')),
  kasbon:      z.coerce.number().min(0, 'Cannot be negative').optional().or(z.literal('')),
}).refine(
  (d) => d.manualBonus !== '' || d.deductions !== '' || d.kasbon !== '',
  { message: 'Provide at least one field' }
)

// ── Info Row ──────────────────────────────────────────────────

const InfoRow = ({ icon: Icon, label, value, highlight }) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs">{label}</span>
    </div>
    <span className={cn(
      'text-sm font-medium',
      highlight ? 'text-brand-600 dark:text-brand-400' : 'text-foreground'
    )}>
      {value}
    </span>
  </div>
)

// ── Calculation Row ───────────────────────────────────────────

const CalcRow = ({ label, value, muted, bold, positive, negative }) => (
  <div className={cn(
    'flex items-center justify-between py-1.5',
    bold && 'border-t border-border mt-1 pt-2.5'
  )}>
    <span className={cn('text-sm', muted ? 'text-muted-foreground' : 'text-foreground')}>
      {label}
    </span>
    <span className={cn(
      'text-sm tabular-nums',
      bold && 'font-bold text-base',
      positive && 'text-brand-600 dark:text-brand-400',
      negative && 'text-destructive',
      !positive && !negative && !bold && 'text-foreground font-medium'
    )}>
      {value}
    </span>
  </div>
)

// ── Component ─────────────────────────────────────────────────

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   payrollId: string | null,
 *   canManage: boolean   — whether the current role may approve/reject/adjust/mark-paid
 * }} props
 */
const PayrollDetailModal = ({ open, onClose, payrollId, canManage }) => {
  const toast          = useToast()
  const approveMutation = useApprovePayroll()
  const rejectMutation  = useRejectPayroll()
  const paidMutation    = useMarkPayrollPaid()
  const adjustMutation  = useAdjustPayroll()

  // Sprint 8.2.6a: always fetch the newest backend data instead of
  // reusing the (possibly stale) row object passed from the table.
  // employeeId/outletId are populated with { _id, name } by
  // getPayrollById() on the backend.
  const {
    data: payroll,
    isLoading,
    isError,
    error,
  } = usePayroll(payrollId, { enabled: open && !!payrollId })

  const [showAdjust, setShowAdjust] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      manualBonus: payroll?.manualBonus ?? '',
      deductions:  payroll?.deductions  ?? '',
      kasbon:      payroll?.kasbon      ?? '',
    },
  })

  useEffect(() => {
    if (open && payroll) {
      reset({
        manualBonus: payroll.manualBonus ?? '',
        deductions:  payroll.deductions  ?? '',
        kasbon:      payroll.kasbon      ?? '',
      })
      setShowAdjust(false)
    }
  }, [open, payroll, reset])

  if (!open) return null

  // Loading state — acceptable per Sprint 8.2.6a spec (Task 2).
  if (isLoading) {
    return (
      <Modal open={open} onClose={onClose} title="Payroll Detail" size="md">
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading payroll…
        </div>
      </Modal>
    )
  }

  if (isError || !payroll) {
    return (
      <Modal open={open} onClose={onClose} title="Payroll Detail" size="md">
        <div className="py-10 text-center text-sm text-destructive">
          {error?.response?.data?.message ?? 'Failed to load payroll record.'}
        </div>
      </Modal>
    )
  }

  const isDraft    = payroll.status === 'draft'
  const isApproved = payroll.status === 'approved'
  const isPaid     = payroll.status === 'paid'
  const anyPending = approveMutation.isPending || rejectMutation.isPending ||
                     paidMutation.isPending    || adjustMutation.isPending

  // ── Action handlers ───────────────────────────────────────

  const handleApprove = () => {
    approveMutation.mutate(payroll._id, {
      onSuccess: () => { toast.success('Payroll approved') },
      onError:   (err) => toast.error('Approval failed', err?.response?.data?.message),
    })
  }

  const handleReject = () => {
    rejectMutation.mutate(payroll._id, {
      onSuccess: () => { toast.success('Payroll reverted to draft') },
      onError:   (err) => toast.error('Rejection failed', err?.response?.data?.message),
    })
  }

  const handleMarkPaid = () => {
    paidMutation.mutate(payroll._id, {
      onSuccess: () => { toast.success('Payroll marked as paid') },
      onError:   (err) => toast.error('Failed', err?.response?.data?.message),
    })
  }

  const onAdjustSubmit = (data) => {
    const payload = {}
    if (data.manualBonus !== '' && data.manualBonus !== undefined)
      payload.manualBonus = Number(data.manualBonus)
    if (data.deductions !== '' && data.deductions !== undefined)
      payload.deductions = Number(data.deductions)
    if (data.kasbon !== '' && data.kasbon !== undefined)
      payload.kasbon = Number(data.kasbon)

    adjustMutation.mutate(
      { payrollId: payroll._id, payload },
      {
        onSuccess: () => {
          toast.success('Payroll adjusted')
          setShowAdjust(false)
        },
        onError: (err) => toast.error('Adjustment failed', err?.response?.data?.message),
      }
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Payroll Detail"
      size="md"
    >
      <div className="flex flex-col max-h-[80vh]">
        <div className="flex-1 overflow-y-auto pr-1">

          {/* Header: period + status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-foreground">
                {formatPeriod(payroll.period)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {payroll.salaryType === 'monthly' ? 'Monthly' : 'Daily'} — {payroll.workingDays} working days
              </p>
            </div>
            <PayrollStatusBadge status={payroll.status} />
          </div>

          {/* Employee / Outlet info */}
          <div className="bg-muted/40 rounded-lg px-1">
            <InfoRow icon={User}     label="Employee" value={payroll.employeeId?.name ?? payroll.employeeId ?? '—'} />
            <InfoRow icon={Building2} label="Outlet"  value={payroll.outletId?.name  ?? payroll.outletId  ?? '—'} />
            {/* P0.3.2: payrollType ('commission'/'fixed') is the engine used —
                distinct from salaryType ('monthly'/'daily') shown above. */}
            <InfoRow icon={TrendingUp} label="Salary Type" value={payroll.payrollType === 'commission' ? 'Commission' : 'Fixed'} />
            <InfoRow icon={Calendar} label="Base Salary" value={formatIDR(payroll.baseSalary)} />
          </div>

          {/* Attendance summary */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Attendance
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Present', value: payroll.presentDays, color: 'text-brand-600' },
                { label: 'Absent',  value: payroll.absentDays,  color: 'text-destructive' },
                { label: 'Cups',    value: payroll.totalCupsSold, color: 'text-amber-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted/50 rounded-lg p-2.5 text-center">
                  <p className={cn('text-xl font-bold', color)}>{value ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Calculation breakdown */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Calculation
            </p>
            <div className="bg-muted/30 rounded-lg px-3 py-1">
              <CalcRow label="Salary Earned"  value={formatIDR(payroll.salaryEarned)} />
              {/* P0.3.2.1: Revenue → Commission Rate → Commission Earned,
                  in that order, so an owner can see the full chain at a
                  glance. Revenue/rate are immutable snapshots persisted at
                  generation time — shown only when this was a commission
                  payroll (both are 0/unused for fixed-type payrolls). */}
              {payroll.payrollType === 'commission' && (
                <>
                  <CalcRow label="Revenue"         value={formatIDR(payroll.totalRevenue)} />
                  <CalcRow label="Commission Rate" value={`${payroll.commissionPercentage ?? 0}%`} />
                </>
              )}
              <CalcRow label="Commission Earned" value={`+ ${formatIDR(payroll.commission)}`}              positive={payroll.commission > 0} />
              <CalcRow label="Cups Bonus"     value={`+ ${formatIDR(payroll.cupsBonus)}`}    positive />
              <CalcRow label="Meal Allowance" value={`+ ${formatIDR(payroll.mealAllowanceTotal)}`}       positive={payroll.mealAllowanceTotal > 0} />
              <CalcRow label="Daily Tier Bonus"        value={`+ ${formatIDR(payroll.dailyTierBonus)}`}          positive={payroll.dailyTierBonus > 0} />
              <CalcRow label="Weekly Attendance Bonus" value={`+ ${formatIDR(payroll.weeklyAttendanceBonus)}`}   positive={payroll.weeklyAttendanceBonus > 0} />
              <CalcRow label="Manual Bonus"   value={`+ ${formatIDR(payroll.manualBonus)}`}  positive={payroll.manualBonus > 0} muted={!payroll.manualBonus} />
              <CalcRow label="Deductions"     value={`− ${formatIDR(payroll.deductions)}`}   negative={payroll.deductions > 0} muted={!payroll.deductions} />
              <CalcRow label="Kasbon"         value={`− ${formatIDR(payroll.kasbon)}`}       negative={payroll.kasbon > 0} muted={!payroll.kasbon} />
              <CalcRow label="Total Pay"      value={formatIDR(payroll.totalPay)} bold />
            </div>
          </div>

          {/* Adjust form — only for draft/approved, and only for managing roles */}
          {canManage && !isPaid && showAdjust && (
            <form onSubmit={handleSubmit(onAdjustSubmit)} noValidate>
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
                <p className="text-xs font-semibold text-foreground">Adjust Values</p>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Manual Bonus" error={errors.manualBonus?.message}>
                    <Input
                      {...register('manualBonus')}
                      type="number" min="0"
                      placeholder={String(payroll.manualBonus ?? 0)}
                      error={!!errors.manualBonus?.message}
                      disabled={anyPending}
                    />
                  </FormField>
                  <FormField label="Deductions" error={errors.deductions?.message}>
                    <Input
                      {...register('deductions')}
                      type="number" min="0"
                      placeholder={String(payroll.deductions ?? 0)}
                      error={!!errors.deductions?.message}
                      disabled={anyPending}
                    />
                  </FormField>
                  <FormField label="Kasbon" error={errors.kasbon?.message}>
                    <Input
                      {...register('kasbon')}
                      type="number" min="0"
                      placeholder={String(payroll.kasbon ?? 0)}
                      error={!!errors.kasbon?.message}
                      disabled={anyPending}
                    />
                  </FormField>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdjust(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-input hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={anyPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors disabled:opacity-60"
                  >
                    {adjustMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Apply Adjustment
                  </button>
                </div>
              </div>
            </form>
          )}


        </div>
        <div className="pt-3 border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">

            {/* Left: secondary actions */}
            <div className="flex items-center gap-2">
              {/* Adjust — draft or approved only, managing roles only */}
              {canManage && !isPaid && !showAdjust && (
                <button
                  onClick={() => setShowAdjust(true)}
                  disabled={anyPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Adjust
                </button>
              )}

              {/* Reject — approved only, managing roles only */}
              {canManage && isApproved && (
                <button
                  onClick={handleReject}
                  disabled={anyPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-input text-muted-foreground hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
                >
                  {rejectMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RotateCcw className="w-3.5 h-3.5" />
                  }
                  Revert to Draft
                </button>
              )}
            </div>

            {/* Right: primary actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors"
              >
                Close
              </button>

              {/* Approve — draft only, managing roles only */}
              {canManage && isDraft && (
                <button
                  onClick={handleApprove}
                  disabled={anyPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors disabled:opacity-60"
                >
                  {approveMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />
                  }
                  Approve
                </button>
              )}

              {/* Mark Paid — approved only, managing roles only */}
              {canManage && isApproved && (
                <button
                  onClick={handleMarkPaid}
                  disabled={anyPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60"
                >
                  {paidMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Banknote className="w-3.5 h-3.5" />
                  }
                  Mark as Paid
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PayrollDetailModal