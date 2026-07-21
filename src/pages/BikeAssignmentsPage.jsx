// src/pages/BikeAssignmentsPage.jsx
// Bike Assignment management — tabbed layout.
//
// Tab "Active" → GET /bike-assignments/active (denormalized, no pagination)
//   + GET /bike-assignments?active=true (parallel, for assignment _id lookup)
//   Renders ActiveAssignmentsTable with End action.
//
// Tab "History" → GET /bike-assignments (paginated, raw ObjectIds)
//   Filters: active (all | active | ended)
//   Renders AssignmentHistoryTable with name resolution.
//
// "Assign Bike" button is always visible.
//
// Why two queries for Active tab:
//   GET /active returns denormalized names but NO _id.
//   GET /?active=true returns full docs with _id for the /end endpoint.
//   We build a Map<bikeId, assignmentId> from the second query and
//   pass it to ActiveAssignmentsTable so EndAssignmentDialog has the ID.

import { useState }                 from 'react'
import { UserCheck, PlusCircle, Bike } from 'lucide-react'

import PageHeader                   from '@/components/shared/PageHeader'
import Pagination                   from '@/components/shared/Pagination'
import EmptyState                   from '@/components/shared/EmptyState'
import ErrorState                   from '@/components/shared/ErrorState'

import ActiveAssignmentsTable       from '@/features/bikeAssignment/components/ActiveAssignmentsTable'
import AssignmentHistoryTable       from '@/features/bikeAssignment/components/AssignmentHistoryTable'
import AssignmentTableSkeleton      from '@/features/bikeAssignment/components/AssignmentTableSkeleton'
import AssignmentFormModal          from '@/features/bikeAssignment/components/AssignmentFormModal'
import {
  useActiveAssignments,
  useBikeAssignments,
}                                   from '@/features/bikeAssignment/hooks/useBikeAssignments'
import { useAuthStore, selectUserRole } from '@/store/authStore'
import { cn }                       from '@/lib/utils'

const PAGE_SIZE = 15

// Roles that can manage (assign/end) bike assignments — mirrors
// backend's MANAGE_BIKES grant (super_admin, tenant_admin, manager —
// NOT cashier/viewer).
const MANAGE_ROLES = ['super_admin', 'tenant_admin', 'manager']

// History filter options — maps to ?active= query param
const HISTORY_FILTERS = [
  { label: 'Semua',   value: undefined  },
  { label: 'Aktif',   value: 'true'     },
  { label: 'Selesai', value: 'false'    },
]

const TABS = [
  { key: 'active',  label: 'Penugasan Aktif' },
  { key: 'history', label: 'Riwayat'          },
]

// ── Active Tab ────────────────────────────────────────────────

const ActiveTab = ({ canManage }) => {
  // GET /active — denormalized display data
  const {
    data:      activeAssignments,
    isLoading: activeLoading,
    isError:   activeError,
    error:     activeErr,
    refetch:   activeRefetch,
  } = useActiveAssignments()

  // GET /?active=true — full docs for _id lookup (to power /end)
  const { data: listData, isLoading: listLoading } = useBikeAssignments(
    { active: 'true', limit: 100 }
  )

  // Build bikeId → assignmentId map for EndAssignmentDialog
  const assignmentIdMap = new Map(
    (listData?.data ?? []).map((a) => [
      a.bikeId?.toString?.() ?? a.bikeId,
      a._id,
    ])
  )

  const isLoading = activeLoading || listLoading
  const items     = activeAssignments ?? []

  if (isLoading) return <AssignmentTableSkeleton rows={5} variant="active" />

  if (activeError) {
    return (
      <ErrorState
        title="Gagal memuat penugasan aktif"
        message={activeErr?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
        onRetry={activeRefetch}
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bike className="w-5 h-5 text-muted-foreground" />}
        title="Belum ada penugasan aktif"
        description={
          canManage
            ? "Semua sepeda saat ini belum ditugaskan. Gunakan 'Tugaskan Sepeda' untuk membuat penugasan."
            : 'Semua sepeda saat ini belum ditugaskan.'
        }
      />
    )
  }

  return (
    <ActiveAssignmentsTable
      assignments={items}
      assignmentIdMap={assignmentIdMap}
      canManage={canManage}
    />
  )
}

// ── History Tab ───────────────────────────────────────────────

const HistoryTab = () => {
  const [page,         setPage]         = useState(1)
  const [activeFilter, setActiveFilter] = useState(undefined)

  const handleFilter = (val) => { setActiveFilter(val); setPage(1) }

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useBikeAssignments({
    page,
    limit:  PAGE_SIZE,
    active: activeFilter,
  })

  const assignments = data?.data       ?? []
  const pagination  = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5">
          {HISTORY_FILTERS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => handleFilter(value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeFilter === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {isFetching && !isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Memuat ulang…
          </div>
        )}
      </div>

      {/* Table card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading && <AssignmentTableSkeleton rows={8} variant="history" />}

        {!isLoading && isError && (
          <ErrorState
            title="Gagal memuat riwayat"
            message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && assignments.length === 0 && (
          <EmptyState
            icon={<UserCheck className="w-5 h-5 text-muted-foreground" />}
            title="Belum ada riwayat penugasan"
            description={
              activeFilter === 'true'  ? 'Belum ada penugasan aktif.'  :
              activeFilter === 'false' ? 'Belum ada penugasan yang selesai.' :
              'Belum ada riwayat penugasan.'
            }
          />
        )}

        {!isLoading && !isError && assignments.length > 0 && (
          <>
            <AssignmentHistoryTable assignments={assignments} />
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
  )
}

// ── BikeAssignmentsPage ───────────────────────────────────────

const BikeAssignmentsPage = () => {
  const role      = useAuthStore(selectUserRole)
  const canManage = MANAGE_ROLES.includes(role)

  const [activeTab,       setActiveTab]       = useState('active')
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  return (
    <>
      <div>
        {/* Header */}
        <PageHeader
          title="Penugasan Sepeda"
          description="Pantau sepeda mana yang ditugaskan ke rider mana."
        >
          {canManage && (
            <button
              onClick={() => setAssignModalOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
              )}
            >
              <PlusCircle className="w-4 h-4" />
              Tugaskan Sepeda
            </button>
          )}
        </PageHeader>

        {/* Tab switcher */}
        <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5 mb-5 w-fit">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeTab === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Active tab content */}
        {activeTab === 'active' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <ActiveTab canManage={canManage} />
          </div>
        )}

        {/* History tab content */}
        {activeTab === 'history' && <HistoryTab />}
      </div>

      {/* Create modal — outside main div */}
      <AssignmentFormModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
      />
    </>
  )
}

export default BikeAssignmentsPage