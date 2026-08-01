import { useState }          from 'react'
import { UserPlus, Users }   from 'lucide-react'

import PageHeader             from '@/components/shared/PageHeader'
import SearchInput            from '@/components/shared/SearchInput'
import Pagination             from '@/components/shared/Pagination'
import EmptyState             from '@/components/shared/EmptyState'
import ErrorState             from '@/components/shared/ErrorState'

import EmployeeTable          from '@/features/employee/components/EmployeeTable'
import EmployeeTableSkeleton  from '@/features/employee/components/EmployeeTableSkeleton'
import EmployeeFormModal      from '@/features/employee/components/EmployeeFormModal'
import { useEmployees }       from '@/features/employee/hooks/useEmployees'
import { useAuthStore, selectUserRole } from '@/store/authStore'
import { useEffectiveOutletId } from '@/store/activeOutletStore'
import useDebounce            from '@/hooks/useDebounce'
import { cn }                 from '@/lib/utils'

const PAGE_SIZE = 15

const MANAGE_ROLES = ['super_admin', 'tenant_admin', 'manager']

const STATUS_FILTERS = [
  { label: 'Semua',      value: undefined },
  { label: 'Aktif',      value: 'true'    },
  { label: 'Tidak Aktif',value: 'false'   },
]

const EmployeesPage = () => {
  const role      = useAuthStore(selectUserRole)
  const canManage = MANAGE_ROLES.includes(role)
  const effectiveOutletId = useEffectiveOutletId()

  // ── State ──────────────────────────────────────────────────
  const [page,            setPage]            = useState(1)
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState(undefined)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const handleSearch = (val) => {
    setSearch(val)
    setPage(1)
  }

  const handleStatusFilter = (val) => {
    setStatusFilter(val)
    setPage(1)
  }

  // ── Data ───────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useEmployees({
    page,
    limit:    PAGE_SIZE,
    search:   debouncedSearch || undefined,
    isActive: statusFilter,
    outletId: effectiveOutletId || undefined,
  })

  const employees  = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Page content */}
      <div>

        {/* Header */}
        <PageHeader
          title="Karyawan"
          description="Kelola anggota tim Anda di semua outlet."
        >
          {canManage && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
              )}
            >
              <UserPlus className="w-4 h-4" />
              Tambah Karyawan
            </button>
          )}
        </PageHeader>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">

          {/* Search */}
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Cari berdasarkan nama..."
            className="w-full sm:w-72"
            disabled={isLoading}
          />

          {/* Status filter tabs */}
          <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => handleStatusFilter(value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  statusFilter === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Background-refetch indicator */}
          {isFetching && !isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-auto">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Memuat ulang…
            </div>
          )}
        </div>

        {/* Table card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {/* ── Loading state ──────────────────────────────── */}
          {isLoading && (
            <EmployeeTableSkeleton rows={8} />
          )}

          {/* ── Error state ─────────────────────────────────── */}
          {!isLoading && isError && (
            <ErrorState
              title="Gagal memuat data karyawan"
              message={
                error?.response?.data?.message
                ?? 'Tidak dapat terhubung ke server. Periksa koneksi Anda.'
              }
              onRetry={refetch}
            />
          )}

          {/* ── Empty state ─────────────────────────────────── */}
          {!isLoading && !isError && employees.length === 0 && (
            <EmptyState
              icon={<Users className="w-5 h-5 text-muted-foreground" />}
              title={
                debouncedSearch
                  ? `Tidak ada karyawan untuk "${debouncedSearch}"`
                  : statusFilter === 'false'
                  ? 'Tidak ada karyawan tidak aktif'
                  : 'Belum ada karyawan'
              }
              description={
                debouncedSearch
                  ? 'Coba kata kunci lain atau hapus filter.'
                  : statusFilter
                  ? 'Ubah filter status untuk melihat karyawan lainnya.'
                  : canManage
                  ? 'Tambahkan karyawan pertama Anda untuk memulai.'
                  : 'Belum ada karyawan yang ditambahkan.'
              }
              action={
                canManage && !debouncedSearch && !statusFilter ? (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                      'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
                    )}
                  >
                    <UserPlus className="w-4 h-4" />
                    Tambah Karyawan Pertama
                  </button>
                ) : null
              }
            />
          )}

          {/* ── Data table ──────────────────────────────────── */}
          {!isLoading && !isError && employees.length > 0 && (
            <>
              <EmployeeTable employees={employees} canManage={canManage} />

              {/* Pagination */}
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

      {/* ── Create Employee modal ──────────────────────────── */}
      {/* Rendered outside main div so it mounts/unmounts cleanly */}
      <EmployeeFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  )
}

export default EmployeesPage