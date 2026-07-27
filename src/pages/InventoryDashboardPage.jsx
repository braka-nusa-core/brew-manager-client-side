// src/pages/InventoryDashboardPage.jsx
//
// Sprint 7.1 — Inventory Dashboard ONLY.
// Inventory List, Adjustment, Opname, Batch Detail, and Transaction pages
// are explicitly out of scope and are NOT implemented here.
//
// Reuses:
//   - PageHeader, ErrorState, EmptyState (shared components — same ones
//     used by CupRecordsPage/SalesPage)
//   - useEffectiveOutletId (same outlet-switcher pattern as Sales/Cup pages)
//   - cn() utility
// Backend: GET /inventory/dashboard (Sprint 6.4) — read-only, single call.

import {
  Boxes, PackageCheck, PackageX, SlidersHorizontal,
  CalendarClock, Activity, AlertTriangle,
} from 'lucide-react'

import PageHeader               from '@/components/shared/PageHeader'
import ErrorState                from '@/components/shared/ErrorState'
import EmptyState                from '@/components/shared/EmptyState'
import { useInventoryDashboard } from '@/features/inventory/hooks/useInventory'
import { useEffectiveOutletId }  from '@/store/activeOutletStore'
import { cn }                    from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const fmtNumber = (n) => (n == null ? '—' : n.toLocaleString('id-ID'))

const fmtSignedNumber = (n) => {
  if (n == null) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toLocaleString('id-ID')}`
}

const TRANSACTION_TYPE_LABELS = {
  production: 'Produksi',
  dispatch:   'Dispatch',
  refill:     'Refill',
  return:     'Retur',
  reject:     'Reject',
  adjustment: 'Penyesuaian',
}

const REASON_LABELS = {
  damage:       'Rusak',
  loss:         'Hilang',
  correction:   'Koreksi',
  other:        'Lainnya',
  stock_opname: 'Stok Opname',
}

// ── Skeleton ─────────────────────────────────────────────────

const Sk = ({ className }) => <div className={cn('animate-pulse rounded-lg bg-muted', className)} />

// ── Metric Card ───────────────────────────────────────────────

const COLOR_MAP = {
  brand:  { bg: 'bg-brand-50 dark:bg-brand-950/30', icon: 'text-brand-600 dark:text-brand-400' },
  green:  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-600 dark:text-emerald-400' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/30',     icon: 'text-amber-600 dark:text-amber-400' },
  rose:   { bg: 'bg-rose-50 dark:bg-rose-950/30',       icon: 'text-rose-600 dark:text-rose-400' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/30',   icon: 'text-violet-600 dark:text-violet-400' },
}

const MetricCard = ({ label, value, sub, icon: Icon, color = 'brand', isLoading }) => {
  const c = COLOR_MAP[color]
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {isLoading ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Sk className="h-3.5 w-20" />
            <Sk className="w-8 h-8 rounded-lg" />
          </div>
          <Sk className="h-7 w-24" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', c.bg)}>
              <Icon size={16} className={c.icon} />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground tracking-tight tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </>
      )}
    </div>
  )
}

// ── Freshness Summary ─────────────────────────────────────────

const FRESHNESS_META = [
  { key: 'safe',    label: 'Aman',      color: 'bg-emerald-500' },
  { key: 'warning', label: 'Peringatan', color: 'bg-amber-500' },
  { key: 'expired', label: 'Kedaluwarsa', color: 'bg-rose-500' },
]

const FreshnessSummary = ({ breakdown, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Sk key={i} className="h-8 w-full" />)}
      </div>
    )
  }

  const total = (breakdown?.safe ?? 0) + (breakdown?.warning ?? 0) + (breakdown?.expired ?? 0)

  if (total === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-4 text-center">
        Belum ada batch aktif dengan stok tersisa.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {FRESHNESS_META.map(({ key, label, color }) => {
        const count = breakdown?.[key] ?? 0
        const pct   = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full shrink-0', color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {count}
                <span className="text-muted-foreground font-normal ml-1">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Recent Inventory Activity ─────────────────────────────────

const RecentActivity = ({ activity, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Sk key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  const rows = activity?.byType ?? []

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-4 text-center">
        Belum ada aktivitas dalam 7 hari terakhir.
      </p>
    )
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.type} className="flex items-center justify-between py-2.5">
          <span className="text-sm text-foreground">
            {TRANSACTION_TYPE_LABELS[row.type] ?? row.type}
          </span>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground tabular-nums">{fmtNumber(row.totalQuantity)} unit</p>
            <p className="text-xs text-muted-foreground">{fmtNumber(row.count)} transaksi</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Adjustment By Reason (today + month, side by side) ────────

const AdjustmentByReasonList = ({ byReason, emptyLabel }) => {
  if (!byReason || byReason.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-3 text-center">{emptyLabel}</p>
  }

  return (
    <div className="divide-y divide-border">
      {byReason.map((row) => (
        <div key={row.reason ?? 'unknown'} className="flex items-center justify-between py-2">
          <span className="text-xs text-foreground">
            {REASON_LABELS[row.reason] ?? row.reason ?? 'Tidak diketahui'}
          </span>
          <div className="text-right">
            <span
              className={cn(
                'text-xs font-semibold tabular-nums',
                row.totalQuantityDelta > 0 ? 'text-emerald-600 dark:text-emerald-400'
                  : row.totalQuantityDelta < 0 ? 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground'
              )}
            >
              {fmtSignedNumber(row.totalQuantityDelta)}
            </span>
            <span className="text-xs text-muted-foreground ml-2">({fmtNumber(row.count)}x)</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

const InventoryDashboardPage = () => {
  const effectiveOutletId = useEffectiveOutletId()

  const { data, isLoading, isError, refetch } = useInventoryDashboard({
    outletId: effectiveOutletId || undefined,
  })

  const isEmpty = !isLoading && !isError && (data?.totalBatches ?? 0) === 0

  const todayNetDelta = (data?.todayAdjustment?.byReason ?? [])
    .reduce((sum, r) => sum + (r.totalQuantityDelta ?? 0), 0)
  const todayCount = (data?.todayAdjustment?.byReason ?? [])
    .reduce((sum, r) => sum + (r.count ?? 0), 0)

  const monthNetDelta = (data?.monthAdjustment?.byReason ?? [])
    .reduce((sum, r) => sum + (r.totalQuantityDelta ?? 0), 0)
  const monthCount = (data?.monthAdjustment?.byReason ?? [])
    .reduce((sum, r) => sum + (r.count ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Dasbor Inventaris"
        description="Ringkasan stok, kesegaran batch, dan aktivitas penyesuaian inventaris."
      />

      {isError ? (
        <ErrorState
          title="Gagal memuat dasbor inventaris"
          onRetry={refetch}
        />
      ) : isEmpty ? (
        <EmptyState
          icon={<Boxes className="w-5 h-5 text-muted-foreground" />}
          title="Belum ada data inventaris"
          description="Catat produksi pertama Anda untuk mulai melacak stok dan kesegaran batch."
        />
      ) : (
        <div className="space-y-6">
          {/* ── Top metric cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              label="Total Stok"
              value={fmtNumber(data?.totalUnitsRemaining)}
              sub="unit tersisa"
              icon={Boxes}
              color="brand"
              isLoading={isLoading}
            />
            <MetricCard
              label="Batch Aktif"
              value={fmtNumber(data?.activeBatches)}
              sub="batch"
              icon={PackageCheck}
              color="green"
              isLoading={isLoading}
            />
            <MetricCard
              label="Batch Habis"
              value={fmtNumber(data?.depletedBatches)}
              sub="batch"
              icon={PackageX}
              color="rose"
              isLoading={isLoading}
            />
            <MetricCard
              label="Penyesuaian Hari Ini"
              value={fmtSignedNumber(todayNetDelta)}
              sub={`${fmtNumber(todayCount)} transaksi`}
              icon={SlidersHorizontal}
              color="amber"
              isLoading={isLoading}
            />
            <MetricCard
              label="Penyesuaian Bulan Ini"
              value={fmtSignedNumber(monthNetDelta)}
              sub={`${fmtNumber(monthCount)} transaksi`}
              icon={CalendarClock}
              color="violet"
              isLoading={isLoading}
            />
          </div>

          {/* ── Freshness + Recent Activity ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Ringkasan Kesegaran</h3>
              </div>
              <FreshnessSummary breakdown={data?.freshnessBreakdown} isLoading={isLoading} />
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Aktivitas Inventaris Terbaru</h3>
                <span className="text-xs text-muted-foreground ml-auto">7 hari terakhir</span>
              </div>
              <RecentActivity activity={data?.recentActivity} isLoading={isLoading} />
            </div>
          </div>

          {/* ── Adjustment by Reason (today + month) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Penyesuaian Hari Ini per Alasan</h3>
              {isLoading ? (
                <div className="space-y-2">{[1, 2].map((i) => <Sk key={i} className="h-8 w-full" />)}</div>
              ) : (
                <AdjustmentByReasonList
                  byReason={data?.todayAdjustment?.byReason}
                  emptyLabel="Belum ada penyesuaian hari ini."
                />
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Penyesuaian Bulan Ini per Alasan</h3>
              {isLoading ? (
                <div className="space-y-2">{[1, 2].map((i) => <Sk key={i} className="h-8 w-full" />)}</div>
              ) : (
                <AdjustmentByReasonList
                  byReason={data?.monthAdjustment?.byReason}
                  emptyLabel="Belum ada penyesuaian bulan ini."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryDashboardPage