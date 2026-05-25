  // src/pages/DashboardPage.jsx
  // Dashboard overview — fully wired to backend.
  //
  // Backend endpoints used:
  //   GET /dashboard/summary            → KPI cards
  //   GET /dashboard/sales-trend        → revenue line chart
  //   GET /dashboard/expense-trend      → expense line chart (overlaid)
  //   GET /dashboard/attendance-summary → donut chart + breakdown
  //   GET /dashboard/employee-performance → leaderboard table
  //
  // Query params sent to all endpoints: { startDate, endDate }
  // All data fetched in parallel via individual TanStack Query hooks.
  // Charts: pure SVG — zero external dependencies.

  import { useState, useMemo }  from 'react'
  import {
    TrendingUp, TrendingDown, Receipt, Coffee,
    Users, ClipboardCheck,
  } from 'lucide-react'

  import PageHeader             from '@/components/shared/PageHeader'
  import { useAuthStore, selectUser } from '@/store/authStore'
  import {
    useDashboardSummary,
    useSalesTrend,
    useExpenseTrend,
    useAttendanceSummary,
    useEmployeePerformance,
  } from '@/features/dashboard/hooks/useDashboard'
  import { cn }                 from '@/lib/utils'

  // ── Date range helpers ────────────────────────────────────────

  const toDateStr = (d) => d.toISOString().split('T')[0]

  const getRange = (days) => {
    const end   = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    return { startDate: toDateStr(start), endDate: toDateStr(end) }
  }

  const RANGES = [
    { label: '7D',  days: 7  },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
  ]

  // ── Formatters ────────────────────────────────────────────────

  const fmtShortCurrency = (n) => {
    if (n == null) return '—'
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`
    if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(0)}K`
    return `Rp ${n}`
  }

  const fmtDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

  // ── Skeleton ──────────────────────────────────────────────────

  const Sk = ({ className }) => (
    <div className={cn('animate-pulse bg-muted rounded', className)} />
  )

  // ── KPI Card ──────────────────────────────────────────────────

  const KpiCard = ({ label, value, icon: Icon, iconBg, iconColor, isLoading, sub }) => (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className={cn('p-2 rounded-lg shrink-0', iconBg)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>
      <div className="mt-3 space-y-0.5">
        {isLoading ? (
          <>
            <Sk className="h-7 w-28 mb-1" />
            <Sk className="h-3 w-20" />
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-foreground tracking-tight leading-none">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sub && <p className="text-[11px] text-muted-foreground/60 pt-0.5">{sub}</p>}
          </>
        )}
      </div>
    </div>
  )

  // ── Pure SVG Line Chart ───────────────────────────────────────

  const LineChart = ({ series, isLoading, height = 180 }) => {
    const W = 600
    const H = height
    const PAD = { top: 12, right: 16, bottom: 32, left: 58 }
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top  - PAD.bottom

    if (isLoading) return <Sk className="w-full rounded-lg" style={{ height }} />

    const allDates  = [...new Set(series.flatMap((s) => s.data.map((d) => d.date)))].sort()
    const allValues = series.flatMap((s) => s.data.map((d) => d.value))

    if (allDates.length === 0) {
      return (
        <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
          No data for this period
        </div>
      )
    }

    const maxVal = Math.max(...allValues, 1)
    const xScale = (i) => PAD.left + (i / Math.max(allDates.length - 1, 1)) * innerW
    const yScale = (v) => PAD.top  + innerH - (v / maxVal) * innerH

    const makePath = (data) =>
      allDates
        .map((date, i) => {
          const found = data.find((d) => d.date === date)
          return `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(found?.value ?? 0).toFixed(1)}`
        })
        .join(' ')

    const makeArea = (data) => {
      const pts = allDates.map((date, i) => {
        const found = data.find((d) => d.date === date)
        return [xScale(i), yScale(found?.value ?? 0)]
      })
      const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
      const last = pts[pts.length - 1]; const first = pts[0]
      return `${line} L${last[0].toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${first[0].toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`
    }

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: yScale(maxVal * t), label: fmtShortCurrency(maxVal * t),
    }))

    const step = Math.max(1, Math.floor(allDates.length / 6))
    const xLabels = allDates
      .map((date, i) => ({ date, i }))
      .filter(({ i }) => i % step === 0 || i === allDates.length - 1)

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        {yTicks.map(({ y, label }) => (
          <g key={y}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="currentColor" strokeOpacity={0.07} strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9}
              fill="currentColor" fillOpacity={0.4}>{label}</text>
          </g>
        ))}
        {series.map((s) => (
          <path key={`a-${s.key}`} d={makeArea(s.data)} fill={s.color} fillOpacity={0.07} />
        ))}
        {series.map((s) => (
          <path key={`l-${s.key}`} d={makePath(s.data)} fill="none"
            stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {xLabels.map(({ date, i }) => (
          <text key={date} x={xScale(i)} y={H - PAD.bottom + 14}
            textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.45}>
            {fmtDate(date)}
          </text>
        ))}
      </svg>
    )
  }

  // ── Attendance Donut ──────────────────────────────────────────

  const STATUS_COLORS = {
    present: '#84cc16',
    late:    '#f59e0b',
    leave:   '#3b82f6',
    absent:  '#ef4444',
    holiday: '#8b5cf6',
  }

  const AttendanceDonut = ({ data, isLoading }) => {
    if (isLoading) return (
      <div className="flex items-center gap-6">
        <Sk className="w-28 h-28 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          {[1,2,3,4,5].map((i) => <Sk key={i} className="h-4 w-full" />)}
        </div>
      </div>
    )

    const total = data?.total ?? 0
    if (!data || total === 0) return (
      <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">
        No attendance data for this period
      </div>
    )

    const segments = ['present','late','leave','absent','holiday']
      .map((key) => ({ key, count: data[key] ?? 0, color: STATUS_COLORS[key] }))
      .filter((s) => s.count > 0)

    const R = 40, r = 26, cx = 50, cy = 50
    let angle = -Math.PI / 2
    const arcs = segments.map(({ key, count, color }) => {
      const sweep = (count / total) * 2 * Math.PI
      const x1 = cx + R * Math.cos(angle); const y1 = cy + R * Math.sin(angle)
      angle += sweep
      const x2 = cx + R * Math.cos(angle); const y2 = cy + R * Math.sin(angle)
      const xi1 = cx + r * Math.cos(angle); const yi1 = cy + r * Math.sin(angle)
      const xi2 = cx + r * Math.cos(angle - sweep); const yi2 = cy + r * Math.sin(angle - sweep)
      const lg = sweep > Math.PI ? 1 : 0
      return {
        key, color, count,
        d: `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${xi1.toFixed(2)} ${yi1.toFixed(2)} A${r} ${r} 0 ${lg} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)} Z`,
      }
    })

    return (
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
          {arcs.map(({ key, d, color }) => <path key={key} d={d} fill={color} />)}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight="600" fill="currentColor">
            {data.attendanceRate?.toFixed(0)}%
          </text>
          <text x={cx} y={cy + 9} textAnchor="middle" fontSize={7} fill="currentColor" fillOpacity={0.5}>
            rate
          </text>
        </svg>
        <div className="flex-1 space-y-1.5">
          {['present','late','leave','absent','holiday'].map((key) => {
            const count = data[key] ?? 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={key} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[key] }} />
                  <span className="text-muted-foreground capitalize">{key}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="text-foreground font-medium">{count}</span>
                  <span className="text-muted-foreground/50 w-7 text-right">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Employee Performance Leaderboard ──────────────────────────

  const AVATAR_COLORS = [
    'bg-brand-100 text-brand-700',
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-emerald-100 text-emerald-700',
  ]

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const PerformanceTable = ({ data, isLoading }) => {
    if (isLoading) return (
      <div className="space-y-3">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Sk className="w-5 h-3 shrink-0" />
            <Sk className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Sk className="h-3 w-32" />
              <Sk className="h-1.5 w-full rounded-full" />
            </div>
            <Sk className="h-3 w-20 shrink-0" />
          </div>
        ))}
      </div>
    )

    if (!data?.length) return (
      <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">
        No employee data for this period
      </div>
    )

    const maxRevenue = Math.max(...data.map((e) => e.totalRevenue), 1)

    return (
      <div className="space-y-3">
        {data.slice(0, 8).map((emp, idx) => (
          <div key={emp.employeeId} className="flex items-center gap-3">
            {/* Rank */}
            <span className="text-[11px] text-muted-foreground/40 tabular-nums w-4 text-right shrink-0">
              {idx + 1}
            </span>
            {/* Avatar */}
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
              AVATAR_COLORS[idx % AVATAR_COLORS.length]
            )}>
              {getInitials(emp.employeeName)}
            </div>
            {/* Name + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-foreground truncate">
                  {emp.employeeName}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {emp.totalCups} cups · {emp.attendancePresent + emp.attendanceLate}d
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-700"
                  style={{ width: `${(emp.totalRevenue / maxRevenue) * 100}%` }}
                />
              </div>
            </div>
            {/* Revenue */}
            <span className="text-xs font-semibold text-foreground tabular-nums shrink-0 w-20 text-right">
              {fmtShortCurrency(emp.totalRevenue)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // ── Main Page ─────────────────────────────────────────────────

  const DashboardPage = () => {
    const user     = useAuthStore(selectUser)
    const [rangeIdx, setRangeIdx] = useState(1)   // default 30D

    const { startDate, endDate } = getRange(RANGES[rangeIdx].days)
    const params = useMemo(() => ({ startDate, endDate }), [startDate, endDate])

    const { data: summary,     isLoading: loadSummary     } = useDashboardSummary(params)
    const { data: salesTrend,  isLoading: loadSalesTrend  } = useSalesTrend(params)
    const { data: expTrend,    isLoading: loadExpTrend     } = useExpenseTrend(params)
    const { data: attendance,  isLoading: loadAttendance   } = useAttendanceSummary(params)
    const { data: performance, isLoading: loadPerformance  } = useEmployeePerformance(params)

    const trendSeries = useMemo(() => [
      {
        key: 'revenue', label: 'Revenue', color: '#84cc16',
        data: (salesTrend ?? []).map((d) => ({ date: d.date, value: d.totalRevenue })),
      },
      {
        key: 'expense', label: 'Expense', color: '#f97316',
        data: (expTrend   ?? []).map((d) => ({ date: d.date, value: d.totalExpense })),
      },
    ], [salesTrend, expTrend])

    const loadingTrend      = loadSalesTrend || loadExpTrend
    const netProfitPositive = (summary?.netProfit ?? 0) >= 0

    const greeting = () => {
      const h = new Date().getHours()
      if (h < 12) return 'Good morning'
      if (h < 17) return 'Good afternoon'
      return 'Good evening'
    }

    return (
      <div>
        {/* Header + range selector */}
        <PageHeader
          title={`${greeting()}, ${user?.name?.split(' ')[0] ?? 'there'} 👋`}
          description="Here's your business overview."
        >
          <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5">
            {RANGES.map(({ label }, idx) => (
              <button
                key={label}
                onClick={() => setRangeIdx(idx)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  rangeIdx === idx
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </PageHeader>

        {/* ── KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
          <KpiCard
            label="Total Revenue" value={fmtShortCurrency(summary?.totalRevenue)}
            icon={TrendingUp} iconBg="bg-brand-50 dark:bg-brand-950/40" iconColor="text-brand-500"
            isLoading={loadSummary}
          />
          <KpiCard
            label="Total Expenses" value={fmtShortCurrency(summary?.totalExpense)}
            icon={Receipt} iconBg="bg-orange-50 dark:bg-orange-950/40" iconColor="text-orange-500"
            isLoading={loadSummary}
          />
          <KpiCard
            label="Net Profit" value={fmtShortCurrency(summary?.netProfit)}
            icon={netProfitPositive ? TrendingUp : TrendingDown}
            iconBg={netProfitPositive ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-red-50 dark:bg-red-950/40'}
            iconColor={netProfitPositive ? 'text-emerald-500' : 'text-red-500'}
            isLoading={loadSummary}
            sub={!loadSummary && summary ? (netProfitPositive ? 'Profitable ↑' : 'Operating at loss ↓') : undefined}
          />
          <KpiCard
            label="Cups Sold"
            value={summary?.totalCups != null ? summary.totalCups.toLocaleString('id-ID') : '—'}
            icon={Coffee} iconBg="bg-amber-50 dark:bg-amber-950/40" iconColor="text-amber-500"
            isLoading={loadSummary}
          />
          <KpiCard
            label="Active Employees"
            value={summary?.totalEmployees != null ? String(summary.totalEmployees) : '—'}
            icon={Users} iconBg="bg-blue-50 dark:bg-blue-950/40" iconColor="text-blue-500"
            isLoading={loadSummary}
            sub={!loadSummary && summary ? `${summary.attendanceRate}% attendance rate` : undefined}
          />
        </div>

        {/* ── Revenue vs Expense Chart + Attendance Donut ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Line chart — 2/3 */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-foreground">Revenue vs Expenses</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daily trend — last {RANGES[rangeIdx].days} days
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {[{ color: '#84cc16', label: 'Revenue' }, { color: '#f97316', label: 'Expense' }].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <LineChart series={trendSeries} isLoading={loadingTrend} height={180} />
          </div>

          {/* Attendance donut — 1/3 */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground">Attendance</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Status breakdown — last {RANGES[rangeIdx].days} days
              </p>
            </div>
            <AttendanceDonut data={attendance} isLoading={loadAttendance} />
          </div>
        </div>

        {/* ── Employee Performance ──────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-medium text-foreground">Employee Performance</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ranked by revenue — last {RANGES[rangeIdx].days} days
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>Cups sold · Days attended</span>
            </div>
          </div>
          <PerformanceTable data={performance} isLoading={loadPerformance} />
        </div>
      </div>
    )
  }

  export default DashboardPage