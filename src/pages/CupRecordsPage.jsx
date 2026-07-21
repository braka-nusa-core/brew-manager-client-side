// src/pages/CupRecordsPage.jsx
// Cup Record management page — daily rider cup distribution and reconciliation.
//
// Filters: date range (startDate/endDate) + status (all | draft | finalized).
// Default: last 30 days, all statuses.
//
// Backend list params: page, limit, riderId, outletId, status, date, startDate, endDate.
// outletId now follows the Working Outlet (useEffectiveOutletId()) — the
// same single source of truth used by every other outlet-scoped list page.
// riderId filter is not exposed in this pass (future enhancement).
// Free-text search does not exist on this endpoint — backend does not support it.
//
// Pattern follows SalesPage exactly.

import { useState }          from 'react'
import { Coffee, PlusCircle } from 'lucide-react'

import PageHeader             from '@/components/shared/PageHeader'
import Pagination             from '@/components/shared/Pagination'
import EmptyState             from '@/components/shared/EmptyState'
import ErrorState             from '@/components/shared/ErrorState'

import CupRecordTable         from '@/features/cup/components/CupRecordTable'
import CupRecordTableSkeleton from '@/features/cup/components/CupRecordTableSkeleton'
import CupRecordFormModal     from '@/features/cup/components/CupRecordFormModal'
import { useCupRecords }      from '@/features/cup/hooks/useCupRecords'
import { useEffectiveOutletId } from '@/store/activeOutletStore'
import { useAuthStore, selectUserRole } from '@/store/authStore'
import { cn }                 from '@/lib/utils'

const PAGE_SIZE = 20

// Roles that can manage (create/edit/finalize/delete) cup records —
// mirrors backend's MANAGE_CUPS grant (super_admin, tenant_admin,
// manager, cashier — NOT viewer).
const MANAGE_ROLES = ['super_admin', 'tenant_admin', 'manager', 'cashier']

const today = () => new Date().toISOString().split('T')[0]
const thirtyDaysAgo = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

// Status filter options — "all" means no status param is sent to the backend
const STATUS_OPTIONS = [
  { value: '',           label: 'Semua Status' },
  { value: 'draft',      label: 'Draf' },
  { value: 'finalized',  label: 'Selesai' },
]

// ── Component ─────────────────────────────────────────────────

const CupRecordsPage = () => {
  const role      = useAuthStore(selectUserRole)
  const canManage = MANAGE_ROLES.includes(role)
  const [page,            setPage]            = useState(1)
  const [startDate,       setStartDate]       = useState(thirtyDaysAgo())
  const [endDate,         setEndDate]         = useState(today())
  const [status,          setStatus]          = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const effectiveOutletId = useEffectiveOutletId()

  const resetPage = () => setPage(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useCupRecords({
    page,
    limit:     PAGE_SIZE,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
    status:    status    || undefined,
    outletId:  effectiveOutletId || undefined,
  })

  const records    = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  return (
    <>
      <div>
        {/* Header */}
        <PageHeader
          title="Catatan Cup"
          description="Pantau distribusi cup harian dan rekonsiliasi penjualan per rider."
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
              <PlusCircle className="w-4 h-4" />
              Catatan Baru
            </button>
          )}
        </PageHeader>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

            {/* Date range */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Dari</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); resetPage() }}
                disabled={isLoading}
                className={cn(
                  'h-8 px-2 rounded-md border border-input bg-background text-xs',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              <label className="text-xs text-muted-foreground">sampai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); resetPage() }}
                disabled={isLoading}
                className={cn(
                  'h-8 px-2 rounded-md border border-input bg-background text-xs',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
            </div>

            {/* Status filter */}
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); resetPage() }}
              disabled={isLoading}
              className={cn(
                'h-8 px-2 rounded-md border border-input bg-background text-xs',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Refresh indicator */}
            {isFetching && !isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-auto">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Memuat ulang…
              </div>
            )}
          </div>
        </div>

        {/* Table card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading && <CupRecordTableSkeleton rows={8} />}

          {!isLoading && isError && (
            <ErrorState
              title="Gagal memuat catatan cup"
              message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
              onRetry={refetch}
            />
          )}

          {!isLoading && !isError && records.length === 0 && (
            <EmptyState
              icon={<Coffee className="w-5 h-5 text-muted-foreground" />}
              title="Belum ada catatan cup"
              description={
                canManage
                  ? 'Sesuaikan rentang tanggal atau filter status, atau buat catatan pertama.'
                  : 'Sesuaikan rentang tanggal atau filter status untuk melihat catatan lainnya.'
              }
              action={
                canManage ? (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                      'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
                    )}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Catatan Baru
                  </button>
                ) : null
              }
            />
          )}

          {!isLoading && !isError && records.length > 0 && (
            <>
              <CupRecordTable records={records} canManage={canManage} />
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

      {/* Create modal — outside the main div to avoid overflow clipping */}
      <CupRecordFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  )
}

export default CupRecordsPage