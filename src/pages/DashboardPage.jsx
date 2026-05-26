// src/pages/DashboardPage.jsx
// Dashboard — Recharts edition.
// Install: npm install recharts
//
// Charts used:
//   AreaChart + Area + XAxis + YAxis + Tooltip + ResponsiveContainer
//     → Revenue vs Expense trend (main chart)
//   AreaChart (single series, no axes)
//     → Sparklines in hero metric cards
//   PieChart + Pie + Cell
//     → Attendance donut

import { useState, useMemo }          from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Coffee, Users,
  ArrowUpRight, ArrowDownRight, Wallet,
  BarChart3, Activity,
} from 'lucide-react'

import { useAuthStore, selectUser }    from '@/store/authStore'
import {
  useDashboardSummary, useSalesTrend, useExpenseTrend,
  useAttendanceSummary, useEmployeePerformance,
} from '@/features/dashboard/hooks/useDashboard'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────

const toDateStr = (d) => d.toISOString().split('T')[0]
const getRange  = (days) => {
  const end = new Date(), start = new Date()
  start.setDate(start.getDate() - (days - 1))
  return { startDate: toDateStr(start), endDate: toDateStr(end) }
}
const RANGES = [
  { label: '7D',  days: 7  },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

const fmtShort = (n) => {
  if (n == null) return '—'
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs/1e9).toFixed(1)}B`
  if (abs >= 1_000_000)     return `${sign}Rp ${(abs/1e6).toFixed(1)}M`
  if (abs >= 1_000)         return `${sign}Rp ${(abs/1e3).toFixed(0)}K`
  return `${sign}Rp ${abs}`
}

const fmtDateShort = (s) =>
  new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
const getInitials = (n = '') =>
  n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ─── Skeleton ─────────────────────────────────────────────────

const Sk = ({ className, style }) =>
  <div className={cn('animate-pulse rounded-xl bg-zinc-100', className)} style={style} />

// ─── Custom Tooltip (shared by main chart) ────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg px-3.5 py-3 min-w-[150px]">
      <p className="text-[11px] font-medium text-zinc-400 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-5 mb-1 last:mb-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-xs text-zinc-500">{p.name}</span>
          </div>
          <span className="text-xs font-bold text-zinc-800">{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Area Chart — Revenue vs Expense ─────────────────────

const TrendChart = ({ salesData, expData, isLoading }) => {
  if (isLoading) return <Sk className="w-full" style={{ height: 220 }} />

  // Merge both series by date into one data array for Recharts
  const allDates = [...new Set([
    ...(salesData ?? []).map(d => d.date),
    ...(expData   ?? []).map(d => d.date),
  ])].sort()

  if (!allDates.length) return (
    <div className="flex items-center justify-center text-sm text-zinc-400" style={{ height: 220 }}>
      No data available for this period
    </div>
  )

  const merged = allDates.map(date => ({
    date:    fmtDateShort(date),
    Revenue: salesData?.find(d => d.date === date)?.totalRevenue ?? 0,
    Expense: expData?.find(d => d.date === date)?.totalExpense   ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={merged} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#84cc16" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#84cc16" stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}    />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={fmtShort}
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e4e4e7', strokeWidth: 1.5, strokeDasharray: '4 4' }} />

        <Area
          type="monotone"
          dataKey="Revenue"
          stroke="#84cc16"
          strokeWidth={2.5}
          fill="url(#gradRevenue)"
          dot={false}
          activeDot={{ r: 5, fill: 'white', stroke: '#84cc16', strokeWidth: 2.5 }}
        />
        <Area
          type="monotone"
          dataKey="Expense"
          stroke="#f43f5e"
          strokeWidth={2.5}
          fill="url(#gradExpense)"
          dot={false}
          activeDot={{ r: 5, fill: 'white', stroke: '#f43f5e', strokeWidth: 2.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Sparkline (hero cards) ───────────────────────────────────
// Minimal AreaChart — no axes, no grid, no tooltip

const Sparkline = ({ data, color, valueKey, isLoading }) => {
  if (isLoading || !data?.length) return <Sk className="h-12 w-full rounded-lg" />

  const gradId = `spark-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={valueKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={true}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Attendance Donut ─────────────────────────────────────────

const STATUSES = [
  { key: 'present', label: 'Present',  color: '#22c55e' },
  { key: 'late',    label: 'Late',     color: '#f59e0b' },
  { key: 'leave',   label: 'On Leave', color: '#3b82f6' },
  { key: 'absent',  label: 'Absent',   color: '#f43f5e' },
  { key: 'holiday', label: 'Holiday',  color: '#a855f7' },
]

const AttendanceDonut = ({ data, isLoading }) => {
  if (isLoading) return (
    <div className="flex items-center gap-6">
      <Sk className="w-32 h-32 rounded-full shrink-0" />
      <div className="flex-1 space-y-3">
        {[1,2,3,4,5].map(i => <Sk key={i} className="h-4 w-full" />)}
      </div>
    </div>
  )

  const total = data?.total ?? 0
  if (!data || total === 0) return (
    <div className="flex flex-col items-center justify-center h-40 gap-2">
      <BarChart3 className="w-8 h-8 text-zinc-200" />
      <p className="text-xs text-zinc-400">No attendance records</p>
    </div>
  )

  const pieData = STATUSES
    .map(s => ({ ...s, value: data[s.key] ?? 0 }))
    .filter(s => s.value > 0)

  return (
    <div className="flex items-center gap-5">
      {/* Donut via Recharts PieChart */}
      <div className="relative shrink-0 w-32 h-32">
        <PieChart width={128} height={128}>
          <Pie
            data={pieData}
            cx={60}
            cy={60}
            innerRadius={38}
            outerRadius={56}
            paddingAngle={2}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {pieData.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
        {/* Center label — absolute overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-zinc-900 leading-none">
            {data.attendanceRate?.toFixed(0)}%
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5">on time</span>
        </div>
      </div>

      {/* Legend with mini bars */}
      <div className="flex-1 space-y-2.5">
        {STATUSES.map(({ key, label, color }) => {
          const count = data[key] ?? 0
          const pct   = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-zinc-500">{label}</span>
                </div>
                <span className="text-xs font-semibold text-zinc-700 tabular-nums">
                  {count}
                  <span className="text-zinc-400 font-normal ml-1">({pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── KPI Stat Card ─────────────────────────────────────────────

const COLOR_MAP = {
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-500' },
  red:    { bg: 'bg-rose-50',    icon: 'text-rose-500'    },
  blue:   { bg: 'bg-blue-50',    icon: 'text-blue-500'    },
  amber:  { bg: 'bg-amber-50',   icon: 'text-amber-500'   },
  violet: { bg: 'bg-violet-50',  icon: 'text-violet-500'  },
  brand:  { bg: 'bg-lime-50',    icon: 'text-lime-600'    },
}

const StatCard = ({ label, value, sub, icon: Icon, color = 'brand', trend, trendVal, isLoading }) => {
  const c = COLOR_MAP[color]
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 p-5">
      {isLoading ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Sk className="h-4 w-24" />
            <Sk className="w-9 h-9 rounded-xl" />
          </div>
          <Sk className="h-8 w-32" />
          <Sk className="h-3.5 w-28" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-zinc-500">{label}</span>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', c.bg)}>
              <Icon size={18} className={c.icon} />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900 tracking-tight leading-none mb-2">
            {value}
          </p>
          <div className="flex items-center gap-2">
            {trendVal && (
              <span className={cn(
                'inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
                trend === 'up'   ? 'bg-emerald-50 text-emerald-600' :
                trend === 'down' ? 'bg-rose-50    text-rose-500'    :
                                   'bg-zinc-100   text-zinc-500'
              )}>
                {trend === 'up'   ? <ArrowUpRight   size={11} /> :
                 trend === 'down' ? <ArrowDownRight size={11} /> : null}
                {trendVal}
              </span>
            )}
            {sub && <span className="text-xs text-zinc-400">{sub}</span>}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Employee Leaderboard ─────────────────────────────────────

const MEDAL    = ['🥇', '🥈', '🥉']
const AV_COLORS = [
  'bg-lime-100    text-lime-700',
  'bg-blue-100    text-blue-700',
  'bg-violet-100  text-violet-700',
  'bg-rose-100    text-rose-700',
  'bg-amber-100   text-amber-700',
  'bg-emerald-100 text-emerald-700',
]

const Leaderboard = ({ data, isLoading }) => {
  if (isLoading) return (
    <div className="space-y-4">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Sk className="w-5 h-5 shrink-0 rounded" />
          <Sk className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Sk className="h-3.5 w-40" />
            <Sk className="h-1.5 rounded-full w-full" />
          </div>
          <Sk className="h-3.5 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )

  if (!data?.length) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Activity className="w-10 h-10 text-zinc-200" />
      <p className="text-sm text-zinc-400">No performance data for this period</p>
    </div>
  )

  const maxRev = Math.max(...data.map(e => e.totalRevenue), 1)

  return (
    <div className="space-y-4">
      {data.slice(0, 8).map((emp, idx) => (
        <div key={emp.employeeId} className="flex items-center gap-3 group">

          {/* Medal / rank */}
          <div className="w-6 text-center shrink-0">
            {idx < 3
              ? <span className="text-base">{MEDAL[idx]}</span>
              : <span className="text-xs text-zinc-300 tabular-nums font-medium">{idx+1}</span>
            }
          </div>

          {/* Avatar */}
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0',
            'transition-transform group-hover:scale-110',
            AV_COLORS[idx % AV_COLORS.length]
          )}>
            {getInitials(emp.employeeName)}
          </div>

          {/* Name + progress bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-semibold text-zinc-800 truncate">
                {emp.employeeName}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0 ml-2">
                <Coffee size={10} />
                <span className="tabular-nums">{emp.totalCups}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 delay-75"
                style={{
                  width: `${(emp.totalRevenue / maxRev) * 100}%`,
                  background:
                    idx === 0 ? 'linear-gradient(90deg,#84cc16,#a3e635)' :
                    idx === 1 ? 'linear-gradient(90deg,#3b82f6,#60a5fa)' :
                    idx === 2 ? 'linear-gradient(90deg,#f97316,#fb923c)' :
                    '#d4d4d8',
                }}
              />
            </div>
          </div>

          {/* Revenue */}
          <span className={cn(
            'text-sm font-bold tabular-nums shrink-0 w-24 text-right',
            idx === 0 ? 'text-lime-600' : 'text-zinc-700'
          )}>
            {fmtShort(emp.totalRevenue)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

const DashboardPage = () => {
  const user = useAuthStore(selectUser)
  const [rangeIdx, setRangeIdx] = useState(1)

  const { startDate, endDate } = getRange(RANGES[rangeIdx].days)
  const params = useMemo(() => ({ startDate, endDate }), [startDate, endDate])

  const { data: summary, isLoading: lSum  } = useDashboardSummary(params)
  const { data: salesTr, isLoading: lSale } = useSalesTrend(params)
  const { data: expTr,   isLoading: lExp  } = useExpenseTrend(params)
  const { data: att,     isLoading: lAtt  } = useAttendanceSummary(params)
  const { data: perf,    isLoading: lPerf } = useEmployeePerformance(params)

  // Sparkline data — Recharts reads from array of objects
  const revSparkData = useMemo(() =>
    (salesTr ?? []).map(d => ({ date: d.date, totalRevenue: d.totalRevenue })),
  [salesTr])

  const expSparkData = useMemo(() =>
    (expTr ?? []).map(d => ({ date: d.date, totalExpense: d.totalExpense })),
  [expTr])

  const profitable = (summary?.netProfit ?? 0) >= 0

  return (
    <div className="space-y-5 pb-2">

      {/* ── Top bar: greeting + range selector ────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {greeting()},{' '}
            <span className="text-lime-600">{user?.name?.split(' ')[0] ?? 'there'}</span> 👋
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center bg-zinc-100 rounded-xl p-1 gap-0.5 shrink-0">
          {RANGES.map(({ label }, idx) => (
            <button
              key={label}
              onClick={() => setRangeIdx(idx)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                rangeIdx === idx
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hero metric cards (top 3 with sparklines) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Revenue */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          {lSum ? (
            <div className="space-y-3">
              <Sk className="h-4 w-20" />
              <Sk className="h-9 w-36" />
              <Sk className="h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Total Revenue</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1 tracking-tight">
                    {fmtShort(summary?.totalRevenue)}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-lime-50 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} className="text-lime-600" />
                </div>
              </div>
              <Sparkline data={revSparkData} color="#84cc16" valueKey="totalRevenue" isLoading={lSale} />
            </>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          {lSum ? (
            <div className="space-y-3">
              <Sk className="h-4 w-20" />
              <Sk className="h-9 w-36" />
              <Sk className="h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Total Expenses</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1 tracking-tight">
                    {fmtShort(summary?.totalExpense)}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <TrendingDown size={18} className="text-rose-500" />
                </div>
              </div>
              <Sparkline data={expSparkData} color="#f43f5e" valueKey="totalExpense" isLoading={lExp} />
            </>
          )}
        </div>

        {/* Net Profit — colored card */}
        <div className={cn(
          'rounded-2xl border shadow-sm p-5',
          profitable
            ? 'bg-gradient-to-br from-lime-500 to-lime-400 border-lime-400'
            : 'bg-gradient-to-br from-rose-500 to-rose-400 border-rose-400'
        )}>
          {lSum ? (
            <div className="space-y-3">
              <Sk className="h-4 w-20 bg-white/30" />
              <Sk className="h-9 w-36 bg-white/30" />
              <Sk className="h-7 w-28 bg-white/30" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-white/70">Net Profit</p>
                  <p className="text-3xl font-bold text-white mt-1 tracking-tight">
                    {fmtShort(summary?.netProfit)}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Wallet size={18} className="text-white/90" />
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                {profitable
                  ? <><ArrowUpRight size={12} /> Profitable</>
                  : <><ArrowDownRight size={12} /> Operating at loss</>
                }
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Secondary KPI cards ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cups Sold" icon={Coffee} color="amber"
          value={summary?.totalCups != null
            ? summary.totalCups.toLocaleString('id-ID') : '—'}
          sub="this period" isLoading={lSum}
        />
        <StatCard
          label="Active Employees" icon={Users} color="blue"
          value={summary?.totalEmployees != null
            ? String(summary.totalEmployees) : '—'}
          sub="in your scope" isLoading={lSum}
        />
        <StatCard
          label="Attendance Rate" icon={Activity}
          color={(summary?.attendanceRate ?? 0) >= 80 ? 'green'
               : (summary?.attendanceRate ?? 0) >= 60 ? 'amber' : 'red'}
          value={summary?.attendanceRate != null
            ? `${summary.attendanceRate}%` : '—'}
          trend={(summary?.attendanceRate ?? 0) >= 80 ? 'up'
               : (summary?.attendanceRate ?? 0) >= 60 ? 'neutral' : 'down'}
          trendVal={(summary?.attendanceRate ?? 0) >= 80 ? 'On track'
                  : (summary?.attendanceRate ?? 0) >= 60 ? 'Moderate' : 'Low'}
          isLoading={lSum}
        />
        <StatCard
          label="Attendance Records" icon={BarChart3} color="violet"
          value={att?.total != null
            ? att.total.toLocaleString('id-ID') : '—'}
          sub="total entries" isLoading={lAtt}
        />
      </div>

      {/* ── Trend chart + Attendance donut ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Main area chart — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Revenue vs Expenses</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Daily · last {RANGES[rangeIdx].days} days
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {[{ color: '#84cc16', label: 'Revenue' }, { color: '#f43f5e', label: 'Expense' }].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 bg-zinc-50 rounded-lg px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-medium text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <TrendChart salesData={salesTr} expData={expTr} isLoading={lSale || lExp} />
        </div>

        {/* Attendance donut — 1 col */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-zinc-900">Attendance</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Status breakdown · {RANGES[rangeIdx].label}
            </p>
          </div>
          <AttendanceDonut data={att} isLoading={lAtt} />
        </div>
      </div>

      {/* ── Leaderboard ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Top Performers</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ranked by revenue · last {RANGES[rangeIdx].days} days
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-50 rounded-xl px-3 py-1.5">
            <Coffee size={12} className="text-zinc-400" />
            <span className="text-xs text-zinc-400 font-medium">Cups sold shown</span>
          </div>
        </div>
        <Leaderboard data={perf} isLoading={lPerf} />
      </div>

    </div>
  )
}

export default DashboardPage