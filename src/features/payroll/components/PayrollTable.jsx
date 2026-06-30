// src/features/payroll/components/PayrollTable.jsx
// Payroll table with resolved employee/outlet names via useEntityMap()
// because backend returns raw ObjectId strings.
//
// Features:
// - Row click → PayrollDetailModal
// - Quick approve for draft payrolls
// - Responsive columns
// - Employee avatar + resolved names

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, CheckCircle2, Eye } from 'lucide-react'

import DataTable from '@/components/shared/DataTable'
import PayrollStatusBadge from './PayrollStatusBadge'
import PayrollDetailModal from './PayrollDetailModal'
import { useApprovePayroll } from '../hooks/usePayroll'
import useEntityMap from '@/hooks/useEntityMap'
import useToast from '@/hooks/useToast'
import { cn } from '@/lib/utils'

// ── Formatters ────────────────────────────────────────────────

const formatIDR = (val) =>
  val != null
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(val)
    : '—'

const MONTHS = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const formatPeriod = (period) =>
  period
    ? `${MONTHS[period.month] ?? period.month} ${period.year}`
    : '—'

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

// ── Avatar ────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-brand-100 text-brand-700',
]

const MiniAvatar = ({ name }) => {
  const color =
    AVATAR_COLORS[(name?.length ?? 0) % AVATAR_COLORS.length]

  return (
    <div
      className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
        color
      )}
    >
      {getInitials(name)}
    </div>
  )
}

// ── Row Actions ───────────────────────────────────────────────

const RowActions = ({ payroll, onView }) => {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)

  const approveMutation = useApprovePayroll()
  const toast = useToast()

  const isDraft = payroll.status === 'draft'

  const handleApprove = (e) => {
    e.stopPropagation()

    setOpen(false)

    approveMutation.mutate(payroll._id, {
      onSuccess: () => {
        toast.success('Payroll approved')
      },

      onError: (err) => {
        toast.error(
          'Approval failed',
          err?.response?.data?.message
        )
      },
    })
  }

  // Dropdown is portaled to <body> and positioned via fixed coordinates
  // computed from the trigger's bounding rect, so it is never clipped by
  // a table/card ancestor's overflow-hidden/auto.
  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 }) // 176px = w-44
    }
    setOpen((o) => !o)
  }

  return (
    <div className="relative flex justify-end">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed w-44 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onView(payroll)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              View Detail
            </button>

            {isDraft && (
              <>
                <div className="border-t border-border" />

                <button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Quick Approve
                </button>
              </>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── Main Table ────────────────────────────────────────────────

const PayrollTable = ({ payrolls }) => {
  const [selectedPayroll, setSelectedPayroll] = useState(null)

  // Resolve ObjectId → entity
  const { employeeMap, outletMap } = useEntityMap()

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Employee</DataTable.HeadCell>
            <DataTable.HeadCell>Period</DataTable.HeadCell>

            <DataTable.HeadCell className="hidden md:table-cell">
              Attendance
            </DataTable.HeadCell>

            <DataTable.HeadCell className="hidden lg:table-cell">
              Base Salary
            </DataTable.HeadCell>

            <DataTable.HeadCell className="hidden xl:table-cell">
              Bonus + Cups
            </DataTable.HeadCell>

            <DataTable.HeadCell>Total Pay</DataTable.HeadCell>

            <DataTable.HeadCell className="hidden xl:table-cell">
              Outlet
            </DataTable.HeadCell>

            <DataTable.HeadCell>Status</DataTable.HeadCell>

            <DataTable.HeadCell className="w-10" />
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {payrolls.map((p) => {
            // Resolve raw ObjectId → entity object
            const employee = employeeMap.get(
              p.employeeId?.toString()
            )

            const outlet = outletMap.get(
              p.outletId?.toString()
            )

            const empName = employee?.name ?? '—'
            const empPos = employee?.position ?? null
            const outletName = outlet?.name ?? '—'

            return (
              <DataTable.Row
                key={p._id}
                onClick={() => setSelectedPayroll(p)}
                className="cursor-pointer"
              >
                {/* Employee */}
                <DataTable.Cell>
                  <div className="flex items-center gap-2.5">
                    <MiniAvatar name={empName} />

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {empName}
                      </p>

                      {empPos && (
                        <p className="text-xs text-muted-foreground truncate">
                          {empPos}
                        </p>
                      )}
                    </div>
                  </div>
                </DataTable.Cell>

                {/* Period */}
                <DataTable.Cell>
                  <div className="leading-none">
                    <p className="text-sm text-foreground">
                      {formatPeriod(p.period)}
                    </p>

                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {p.salaryType}
                    </p>
                  </div>
                </DataTable.Cell>

                {/* Attendance */}
                <DataTable.Cell className="hidden md:table-cell">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-brand-600 font-medium">
                      {p.presentDays}P
                    </span>

                    <span className="text-muted-foreground">
                      /
                    </span>

                    <span className="text-muted-foreground">
                      {p.workingDays}d
                    </span>

                    {p.absentDays > 0 && (
                      <span className="text-destructive/70">
                        {p.absentDays}A
                      </span>
                    )}
                  </div>
                </DataTable.Cell>

                {/* Base Salary */}
                <DataTable.Cell className="hidden lg:table-cell">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatIDR(p.baseSalary)}
                  </span>
                </DataTable.Cell>

                {/* Bonus */}
                <DataTable.Cell className="hidden xl:table-cell">
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      Cups: +{formatIDR(p.cupsBonus)}
                    </p>

                    {p.manualBonus > 0 && (
                      <p>
                        Manual: +{formatIDR(p.manualBonus)}
                      </p>
                    )}

                    {p.deductions > 0 && (
                      <p className="text-destructive/70">
                        -{formatIDR(p.deductions)}
                      </p>
                    )}
                  </div>
                </DataTable.Cell>

                {/* Total */}
                <DataTable.Cell>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {formatIDR(p.totalPay)}
                  </span>
                </DataTable.Cell>

                {/* Outlet */}
                <DataTable.Cell className="hidden xl:table-cell text-sm text-muted-foreground">
                  {outletName}
                </DataTable.Cell>

                {/* Status */}
                <DataTable.Cell>
                  <PayrollStatusBadge status={p.status} />
                </DataTable.Cell>

                {/* Actions */}
                <DataTable.Cell
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActions
                    payroll={p}
                    onView={setSelectedPayroll}
                  />
                </DataTable.Cell>
              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>

      <PayrollDetailModal
        open={!!selectedPayroll}
        onClose={() => setSelectedPayroll(null)}
        payroll={selectedPayroll}
      />
    </>
  )
}

export default PayrollTable