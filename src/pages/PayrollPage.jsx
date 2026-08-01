import { useState, useMemo }       from 'react'
import { Banknote, FileText }      from 'lucide-react'

import PageHeader                  from '@/components/shared/PageHeader'
import Pagination                  from '@/components/shared/Pagination'
import EmptyState                  from '@/components/shared/EmptyState'
import ErrorState                  from '@/components/shared/ErrorState'
import SearchInput                 from '@/components/shared/SearchInput'

import PayrollTable                from '@/features/payroll/components/PayrollTable'
import PayrollTableSkeleton        from '@/features/payroll/components/PayrollTableSkeleton'
import GeneratePayrollModal        from '@/features/payroll/components/GeneratePayrollModal'
import { PAYROLL_STATUSES, PAYROLL_STATUS_CONFIG } from '@/features/payroll/components/PayrollStatusBadge'
import { useGetPayrolls }             from '@/features/payroll/hooks/usePayroll'
import { useEffectiveOutletId }       from '@/store/activeOutletStore'
import { useAuthStore, selectUserRole } from '@/store/authStore'
import useDebounce                 from '@/hooks/useDebounce'
import { cn }                      from '@/lib/utils'

const PAGE_SIZE = 20

const MANAGE_ROLES = ['super_admin', 'tenant_admin']

const MONTHS = [
  { label: 'Semua Bulan', value: '' },
  { label: 'Januari',   value: 1  },
  { label: 'Februari',  value: 2  },
  { label: 'Maret',     value: 3  },
  { label: 'April',     value: 4  },
  { label: 'Mei',       value: 5  },
  { label: 'Juni',      value: 6  },
  { label: 'Juli',      value: 7  },
  { label: 'Agustus',   value: 8  },
  { label: 'September', value: 9  },
  { label: 'Oktober',   value: 10 },
  { label: 'November',  value: 11 },
  { label: 'Desember',  value: 12 },
]

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1]

const STATUS_OPTIONS = [
  { label: 'Semua Status', value: '' },
  ...PAYROLL_STATUSES.map((s) => ({
    label: PAYROLL_STATUS_CONFIG[s]?.label ?? s,
    value: s,
  })),
]

// ── Page ──────────────────────────────────────────────────────

const PayrollPage = () => {
  const role      = useAuthStore(selectUserRole)
  const canManage = MANAGE_ROLES.includes(role)
  // ── Filter state ───────────────────────────────────────────
  const [page,             setPage]             = useState(1)
  const [search,           setSearch]           = useState('')
  const [statusFilter,     setStatusFilter]     = useState('')
  const [monthFilter,      setMonthFilter]      = useState(currentMonth)
  const [yearFilter,       setYearFilter]       = useState(currentYear)
  const [generateOpen,     setGenerateOpen]     = useState(false)
  const effectiveOutletId = useEffectiveOutletId()

  const debouncedSearch = useDebounce(search, 300)
  const resetPage = () => setPage(1)

  // ── Data ───────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetPayrolls({
    page,
    limit:  PAGE_SIZE,
    status: statusFilter || undefined,
    month:  monthFilter  || undefined,
    year:   yearFilter   || undefined,
    outletId: effectiveOutletId || undefined,
  })

  const rawPayrolls = data?.data       ?? []
  const pagination  = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  // Client-side name search — backend attendance does not support
  // employee name text search on payroll list endpoint.
  const payrolls = useMemo(() => {
    if (!debouncedSearch) return rawPayrolls
    const q = debouncedSearch.toLowerCase()
    return rawPayrolls.filter((p) => {
      const name = (p.employeeId?.name ?? '').toLowerCase()
      return name.includes(q)
    })
  }, [rawPayrolls, debouncedSearch])

  // ── Summary counts from current page ──────────────────────
  const statusCounts = useMemo(() => {
    const counts = { draft: 0, approved: 0, paid: 0 }
    rawPayrolls.forEach((p) => { if (p.status in counts) counts[p.status]++ })
    return counts
  }, [rawPayrolls])

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <div>
        {/* Header */}
        <PageHeader
          title="Penggajian"
          description="Buat, tinjau, dan setujui data penggajian karyawan."
        >
          {canManage && (
            <button
              onClick={() => setGenerateOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
              )}
            >
              <Banknote className="w-4 h-4" />
              Generate Penggajian
            </button>
          )}
        </PageHeader>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-4">

          {/* Row 1: search + status */}
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); resetPage() }}
              placeholder="Cari nama karyawan…"
              className="w-full sm:w-64"
              disabled={isLoading}
            />

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); resetPage() }}
              disabled={isLoading}
              className={cn(
                'h-9 px-3 rounded-md border border-input bg-background text-sm',
                'focus:outline-none focus:ring-2 focus:ring-brand-500',
                'disabled:opacity-50 appearance-none cursor-pointer transition-colors'
              )}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {isFetching && !isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-center sm:ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Memuat ulang…
              </div>
            )}
          </div>

          {/* Row 2: month + year */}
          <div className="flex items-center gap-3">
            <select
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value ? Number(e.target.value) : ''); resetPage() }}
              disabled={isLoading}
              className={cn(
                'h-9 px-3 rounded-md border border-input bg-background text-sm',
                'focus:outline-none focus:ring-2 focus:ring-brand-500',
                'disabled:opacity-50 appearance-none cursor-pointer transition-colors'
              )}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => { setYearFilter(Number(e.target.value)); resetPage() }}
              disabled={isLoading}
              className={cn(
                'h-9 px-3 rounded-md border border-input bg-background text-sm',
                'focus:outline-none focus:ring-2 focus:ring-brand-500',
                'disabled:opacity-50 appearance-none cursor-pointer transition-colors'
              )}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {/* Status summary bar — only when data loaded */}
          {!isLoading && !isError && rawPayrolls.length > 0 && (
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {pagination.total} data
                {debouncedSearch && ` · ${payrolls.length} cocok dengan "${debouncedSearch}"`}
              </p>
              <div className="hidden sm:flex items-center gap-4">
                {Object.entries(statusCounts).map(([status, count]) => {
                  if (count === 0) return null
                  const config = PAYROLL_STATUS_CONFIG[status]
                  return (
                    <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn('w-1.5 h-1.5 rounded-full', config?.dot)} />
                      {count} {config?.label ?? status}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && <PayrollTableSkeleton rows={8} />}

          {/* Error */}
          {!isLoading && isError && (
            <ErrorState
              title="Gagal memuat data penggajian"
              message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
              onRetry={refetch}
            />
          )}

          {/* Empty */}
          {!isLoading && !isError && payrolls.length === 0 && (
            <EmptyState
              icon={<FileText className="w-5 h-5 text-muted-foreground" />}
              title={
                debouncedSearch
                  ? `Tidak ada penggajian cocok dengan "${debouncedSearch}"`
                  : statusFilter
                  ? `Tidak ada penggajian berstatus ${statusFilter}`
                  : 'Belum ada data penggajian'
              }
              description={
                debouncedSearch
                  ? 'Coba nama lain.'
                  : statusFilter
                  ? 'Ubah filter status atau buat penggajian untuk periode ini.'
                  : canManage
                  ? 'Klik "Generate Penggajian" untuk membuat data untuk tim Anda.'
                  : 'Belum ada data penggajian untuk periode ini.'
              }
              action={
                canManage && !debouncedSearch && !statusFilter ? (
                  <button
                    onClick={() => setGenerateOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors"
                  >
                    <Banknote className="w-4 h-4" />
                    Generate Penggajian
                  </button>
                ) : null
              }
            />
          )}

          {/* Data */}
          {!isLoading && !isError && payrolls.length > 0 && (
            <>
              <PayrollTable payrolls={payrolls} canManage={canManage} />
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

      {/* Generate payroll modal */}
      <GeneratePayrollModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
      />
    </>
  )
}

export default PayrollPage