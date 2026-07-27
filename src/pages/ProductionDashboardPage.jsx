// src/pages/ProductionDashboardPage.jsx
//
// Sprint 8.2 — Production Operational Improvements. Route: /production/dashboard
//
// Backend: GET /production/dashboard (Sprint 8.2) — single read-only call.
// Charts reuse recharts exactly like pages/DashboardPage.jsx (same library,
// same ResponsiveContainer/Tooltip pattern) — no new charting approach.

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import {
  PackagePlus, CalendarClock, TrendingUp, Boxes,
} from 'lucide-react'

import PageHeader     from '@/components/shared/PageHeader'
import ErrorState     from '@/components/shared/ErrorState'
import EmptyState     from '@/components/shared/EmptyState'
import LoadingSpinner  from '@/components/shared/LoadingSpinner'
import DataTable       from '@/components/shared/DataTable'

import { useProductionDashboard } from '@/features/production/hooks/useProduction'
import { useEffectiveOutletId }   from '@/store/activeOutletStore'
import { cn } from '@/lib/utils'

const fmtNumber = (n) => (n == null ? '—' : n.toLocaleString('id-ID'))

const fmtDate = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

const fmtShortDate = (isoDay) => {
  try { return new Date(isoDay).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) }
  catch { return isoDay }
}

const shortId = (id) => {
  const str = id?.toString?.() ?? id
  if (!str) return '—'
  return str.length > 10 ? `…${str.slice(-8)}` : str
}

const COLOR_MAP = {
  brand:  { bg: 'bg-brand-50 dark:bg-brand-950/30', icon: 'text-brand-600 dark:text-brand-400' },
  green:  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-600 dark:text-emerald-400' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'text-violet-600 dark:text-violet-400' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: 'text-amber-600 dark:text-amber-400' },
}

const MetricCard = ({ label, value, sub, icon: Icon, color = 'brand' }) => {
  const c = COLOR_MAP[color]
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', c.bg)}>
          <Icon size={16} className={c.icon} />
        </div>
      </div>
      <p className="text-xl font-bold text-foreground tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────

const ProductionDashboardPage = () => {
  const navigate = useNavigate()
  const effectiveOutletId = useEffectiveOutletId()

  const { data, isLoading, isError, refetch } = useProductionDashboard({
    outletId: effectiveOutletId || undefined,
  })

  return (
    <div>
      <PageHeader
        title="Dasbor Produksi"
        description="Ringkasan aktivitas produksi harian dan bulanan."
      />

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!isLoading && isError && (
        <ErrorState title="Gagal memuat dasbor produksi" onRetry={refetch} />
      )}

      {!isLoading && !isError && (
        <div className="space-y-6">
          {/* ── Top metric cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Produksi Hari Ini"
              value={fmtNumber(data?.todayProduction)}
              sub="catatan"
              icon={PackagePlus}
              color="brand"
            />
            <MetricCard
              label="Produksi Bulan Ini"
              value={fmtNumber(data?.monthProduction)}
              sub="catatan"
              icon={CalendarClock}
              color="violet"
            />
            <MetricCard
              label="Kuantitas Hari Ini"
              value={fmtNumber(data?.todayQuantity)}
              sub="unit"
              icon={Boxes}
              color="green"
            />
            <MetricCard
              label="Kuantitas Bulan Ini"
              value={fmtNumber(data?.monthQuantity)}
              sub="unit"
              icon={TrendingUp}
              color="amber"
            />
          </div>

          {/* ── Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Produksi per Produk (Bulan Ini)</h3>
              {(data?.productionByProduct ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">Belum ada produksi bulan ini.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.productionByProduct} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="productName"
                      width={100}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v ?? '—'}
                    />
                    <Tooltip
                      formatter={(value) => [fmtNumber(value), 'Kuantitas']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="totalQuantity" fill="#84cc16" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Produksi 7 Hari Terakhir</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.last7Days ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="date" tickFormatter={fmtShortDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={fmtShortDate}
                    formatter={(value) => [fmtNumber(value), 'Kuantitas']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="totalQuantity" fill="#65a30d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Recent Production ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Produksi Terbaru</h3>
            </div>

            {(data?.recentProduction ?? []).length === 0 ? (
              <EmptyState
                icon={<PackagePlus className="w-5 h-5 text-muted-foreground" />}
                title="Belum ada produksi"
                description="Catat produksi pertama Anda untuk melihatnya di sini."
              />
            ) : (
              <DataTable>
                <DataTable.Head>
                  <DataTable.HeadRow>
                    <DataTable.HeadCell>Produk</DataTable.HeadCell>
                    <DataTable.HeadCell className="text-right">Kuantitas</DataTable.HeadCell>
                    <DataTable.HeadCell>Tanggal</DataTable.HeadCell>
                    <DataTable.HeadCell>Outlet</DataTable.HeadCell>
                  </DataTable.HeadRow>
                </DataTable.Head>
                <DataTable.Body>
                  {data.recentProduction.map((row) => (
                    <DataTable.Row
                      key={row._id}
                      onClick={() => navigate(`/production/${row._id}`)}
                      className="cursor-pointer"
                    >
                      <DataTable.Cell className="font-medium text-foreground">
                        {row.product?.name ?? shortId(row.productId)}
                      </DataTable.Cell>
                      <DataTable.Cell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        +{fmtNumber(row.quantityDelta)}
                      </DataTable.Cell>
                      <DataTable.Cell className="text-muted-foreground whitespace-nowrap">
                        {fmtDate(row.createdAt)}
                      </DataTable.Cell>
                      <DataTable.Cell className="text-muted-foreground">
                        {row.outlet?.name ?? shortId(row.outletId)}
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable.Body>
              </DataTable>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductionDashboardPage