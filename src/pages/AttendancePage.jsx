// src/pages/AttendancePage.jsx
// Attendance management page.
// Wired to: useAttendances → GET /api/v1/attendance
// CRUD: detail/edit via row click → AttendanceDetailModal
//       bulk input → BulkAttendanceModal
//
// Filters: status, date range, search (by employeeId for now)
// Pagination: shared Pagination component

import { useState }                from 'react'
import { ClipboardCheck, ListPlus } from 'lucide-react'

import PageHeader                  from '@/components/shared/PageHeader'
import SearchInput                 from '@/components/shared/SearchInput'
import Pagination                  from '@/components/shared/Pagination'
import EmptyState                  from '@/components/shared/EmptyState'
import ErrorState                  from '@/components/shared/ErrorState'

import AttendanceTable             from '@/features/attendance/components/AttendanceTable'
import AttendanceTableSkeleton     from '@/features/attendance/components/AttendanceTableSkeleton'
import BulkAttendanceModal         from '@/features/attendance/components/BulkAttendanceModal'
import { ATTENDANCE_STATUSES, STATUS_CONFIG } from '@/features/attendance/components/AttendanceStatusBadge'
import { useAttendances }          from '@/features/attendance/hooks/useAttendance'
import { useEffectiveOutletId }    from '@/store/activeOutletStore'
import { useAuthStore, selectUserRole } from '@/store/authStore'
import useDebounce                 from '@/hooks/useDebounce'
import { cn }                      from '@/lib/utils'

const PAGE_SIZE = 20

// Roles that can manage (bulk-input/edit/delete) attendance — mirrors
// backend's MANAGE_ATTENDANCE grant (super_admin, tenant_admin, manager).
const MANAGE_ROLES = ['super_admin', 'tenant_admin', 'manager']

// Today in YYYY-MM-DD format for default endDate
const today = () => new Date().toISOString().split('T')[0]

// 30 days ago for default startDate
const thirtyDaysAgo = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

// ── Status filter options ─────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'Semua Status', value: '' },
  ...ATTENDANCE_STATUSES.map((s) => ({
    label: STATUS_CONFIG[s]?.label ?? s,
    value: s,
  })),
]

// ── Component ─────────────────────────────────────────────────

const AttendancePage = () => {
  const role      = useAuthStore(selectUserRole)
  const canManage = MANAGE_ROLES.includes(role)

  // ── Filter state ───────────────────────────────────────────
  const [page,           setPage]          = useState(1)
  const [search,         setSearch]        = useState('')
  const [statusFilter,   setStatusFilter]  = useState('')
  const [startDate,      setStartDate]     = useState(thirtyDaysAgo())
  const [endDate,        setEndDate]       = useState(today())
  const [bulkModalOpen,  setBulkModalOpen] = useState(false)
  const effectiveOutletId = useEffectiveOutletId()

  const debouncedSearch = useDebounce(search, 400)

  const resetPage = () => setPage(1)

  const handleSearch      = (val) => { setSearch(val);      resetPage() }
  const handleStatus      = (val) => { setStatusFilter(val); resetPage() }
  const handleStartDate   = (val) => { setStartDate(val);   resetPage() }
  const handleEndDate     = (val) => { setEndDate(val);     resetPage() }

  // ── Data ───────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAttendances({
    page,
    limit:      PAGE_SIZE,
    status:     statusFilter    || undefined,
    startDate:  startDate       || undefined,
    endDate:    endDate         || undefined,
    outletId:   effectiveOutletId || undefined,
    // search maps to employeeId in MVP — future: backend text search
    // For now we show search as UI but don't pass to backend since
    // backend doesn't support name-based search on attendance.
    // This will be wired when backend adds $lookup-based search.
  })

  const records    = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <div>
        {/* Header */}
        <PageHeader
          title="Absensi"
          description="Pantau dan kelola data absensi harian karyawan."
        >
          {canManage && (
            <button
              onClick={() => setBulkModalOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
              )}
            >
              <ListPlus className="w-4 h-4" />
              Input Massal
            </button>
          )}
        </PageHeader>

        {/* Filters row */}
        <div className="flex flex-col gap-3 mb-4">

          {/* Top row: search + status */}
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchInput
              value={search}
              onChange={handleSearch}
              placeholder="Cari nama karyawan…"
              className="w-full sm:w-64"
              disabled={isLoading}
            />

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatus(e.target.value)}
              disabled={isLoading}
              className={cn(
                'h-9 px-3 rounded-md border border-input bg-background text-sm',
                'focus:outline-none focus:ring-2 focus:ring-brand-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors appearance-none cursor-pointer'
              )}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Background-refetch indicator */}
            {isFetching && !isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-center sm:ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Memuat ulang…
              </div>
            )}
          </div>

          {/* Date range row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Dari</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDate(e.target.value)}
                disabled={isLoading}
                className={cn(
                  'h-9 px-3 rounded-md border border-input bg-background text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Sampai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDate(e.target.value)}
                disabled={isLoading}
                className={cn(
                  'h-9 px-3 rounded-md border border-input bg-background text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                )}
              />
            </div>

            {/* Quick range buttons */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              {[
                { label: 'Hari Ini', days: 0  },
                { label: '7h',       days: 7  },
                { label: '30h',      days: 30 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  onClick={() => {
                    const end = new Date()
                    const start = new Date()
                    start.setDate(start.getDate() - days)
                    setEndDate(end.toISOString().split('T')[0])
                    setStartDate(start.toISOString().split('T')[0])
                    resetPage()
                  }}
                  className="px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {isLoading && <AttendanceTableSkeleton rows={PAGE_SIZE} />}

          {!isLoading && isError && (
            <ErrorState
              title="Gagal memuat data absensi"
              message={
                error?.response?.data?.message
                ?? 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.'
              }
              onRetry={refetch}
            />
          )}

          {!isLoading && !isError && records.length === 0 && (
            <EmptyState
              icon={<ClipboardCheck className="w-5 h-5 text-muted-foreground" />}
              title={
                statusFilter
                  ? `Tidak ada data "${statusFilter}" pada rentang tanggal ini`
                  : 'Belum ada data absensi'
              }
              description={
                statusFilter
                  ? 'Coba ubah filter status atau rentang tanggal.'
                  : canManage
                  ? 'Gunakan "Input Massal" untuk mencatat absensi tim Anda.'
                  : 'Belum ada data absensi yang dicatat.'
              }
              action={
                canManage && !statusFilter ? (
                  <button
                    onClick={() => setBulkModalOpen(true)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                      'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
                    )}
                  >
                    <ListPlus className="w-4 h-4" />
                    Input Massal Absensi
                  </button>
                ) : null
              }
            />
          )}

          {!isLoading && !isError && records.length > 0 && (
            <>
              {/* Record count bar */}
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {pagination.total} data ditemukan
                </p>

                {/* Status summary pills */}
                <div className="hidden sm:flex items-center gap-2">
                  {ATTENDANCE_STATUSES.map((s) => {
                    const count = records.filter((r) => r.status === s).length
                    if (count === 0) return null
                    return (
                      <div key={s} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          STATUS_CONFIG[s]?.dot ?? 'bg-zinc-400'
                        )} />
                        {count} {STATUS_CONFIG[s]?.label ?? s}
                      </div>
                    )
                  })}
                </div>
              </div>

              <AttendanceTable records={records} canManage={canManage} />

              <div className="px-4 py-3 border-t border-border">
                <Pagination
                  page={pagination.page ?? page}
                  totalPages={pagination.totalPages ?? 1}
                  total={pagination.total ?? 0}
                  limit={PAGE_SIZE}
                  onPageChange={setPage}
                  isLoading={isFetching}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bulk input modal */}
      <BulkAttendanceModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
      />
    </>
  )
}

export default AttendancePage