// src/pages/BikeMaintenancePage.jsx
// Bike Maintenance — two-tab layout.
//
// Tab "Damage Reports" → GET /bike-damage-reports
//   Filters: bikeId (select from useBikes), status
//   Row actions: Change Status, Add Repair Record
//
// Tab "Repair Records" → GET /bike-repair-records
//   Filters: repairStatus (all/IN_PROGRESS/COMPLETED)
//
// Buttons:
//   "Report Damage" — always visible, opens DamageReportFormModal
//   "Add Repair"    — only on Repair Records tab, opens RepairRecordFormModal

import { useState }                   from 'react'
import { Wrench, PlusCircle, AlertTriangle } from 'lucide-react'

import PageHeader                     from '@/components/shared/PageHeader'
import Pagination                     from '@/components/shared/Pagination'
import EmptyState                     from '@/components/shared/EmptyState'
import ErrorState                     from '@/components/shared/ErrorState'

import DamageReportsTable             from '@/features/bikeMaintenance/components/DamageReportsTable'
import RepairRecordsTable             from '@/features/bikeMaintenance/components/RepairRecordsTable'
import MaintenanceTableSkeleton       from '@/features/bikeMaintenance/components/MaintenanceTableSkeleton'
import DamageReportFormModal          from '@/features/bikeMaintenance/components/DamageReportFormModal'
import RepairRecordFormModal          from '@/features/bikeMaintenance/components/RepairRecordFormModal'
import {
  DAMAGE_REPORT_STATUS_OPTIONS,
}                                     from '@/features/bikeMaintenance/components/DamageReportStatusBadge'
import {
  REPAIR_STATUS_OPTIONS,
}                                     from '@/features/bikeMaintenance/components/RepairStatusBadge'
import {
  useDamageReports,
  useRepairRecords,
}                                     from '@/features/bikeMaintenance/hooks/useBikeMaintenance'
import { useBikes }                   from '@/features/bike/hooks/useBikes'
import { cn }                         from '@/lib/utils'

const PAGE_SIZE = 15

const TABS = [
  { key: 'damage', label: 'Damage Reports' },
  { key: 'repair', label: 'Repair Records'  },
]

// ── Damage Reports Tab ─────────────────────────────────────────

const DamageReportsTab = () => {
  const [page,         setPage]         = useState(1)
  const [bikeFilter,   setBikeFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const handleBike   = (v) => { setBikeFilter(v);   setPage(1) }
  const handleStatus = (v) => { setStatusFilter(v); setPage(1) }

  // Bikes for the bikeId filter dropdown
  const { data: bikesData } = useBikes({ limit: 200 })
  const bikes = bikesData?.data ?? []

  const { data, isLoading, isError, error, refetch, isFetching } = useDamageReports({
    page,
    limit:  PAGE_SIZE,
    bikeId: bikeFilter  || undefined,
    status: statusFilter || undefined,
  })

  const reports    = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <select
          value={bikeFilter}
          onChange={(e) => handleBike(e.target.value)}
          disabled={isLoading}
          className={cn(
            'h-9 px-2 rounded-md border border-input bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-brand-500',
            'disabled:opacity-50'
          )}
        >
          <option value="">All Bikes</option>
          {bikes.map((b) => (
            <option key={b._id} value={b._id}>
              {b.assetCode} — {b.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleStatus(e.target.value)}
          disabled={isLoading}
          className={cn(
            'h-9 px-2 rounded-md border border-input bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-brand-500',
            'disabled:opacity-50'
          )}
        >
          <option value="">All Statuses</option>
          {DAMAGE_REPORT_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>

        {isFetching && !isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Refreshing…
          </div>
        )}
      </div>

      {/* Table card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading && <MaintenanceTableSkeleton rows={6} variant="damage" />}

        {!isLoading && isError && (
          <ErrorState
            title="Failed to load damage reports"
            message={error?.response?.data?.message ?? 'Could not reach the server.'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && reports.length === 0 && (
          <EmptyState
            icon={<AlertTriangle className="w-5 h-5 text-muted-foreground" />}
            title="No damage reports found"
            description={
              bikeFilter || statusFilter
                ? 'Try clearing the filters.'
                : 'No damage has been reported yet.'
            }
          />
        )}

        {!isLoading && !isError && reports.length > 0 && (
          <>
            <DamageReportsTable reports={reports} />
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

// ── Repair Records Tab ─────────────────────────────────────────

const RepairRecordsTab = ({ onAddRepair }) => {
  const [page,           setPage]           = useState(1)
  const [statusFilter,   setStatusFilter]   = useState('')

  const handleStatus = (v) => { setStatusFilter(v); setPage(1) }

  const { data, isLoading, isError, error, refetch, isFetching } = useRepairRecords({
    page,
    limit:        PAGE_SIZE,
    repairStatus: statusFilter || undefined,
  })

  const records    = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => handleStatus(e.target.value)}
          disabled={isLoading}
          className={cn(
            'h-9 px-2 rounded-md border border-input bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-brand-500',
            'disabled:opacity-50'
          )}
        >
          <option value="">All Statuses</option>
          {REPAIR_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
            </option>
          ))}
        </select>

        {isFetching && !isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Refreshing…
          </div>
        )}
      </div>

      {/* Table card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading && <MaintenanceTableSkeleton rows={6} variant="repair" />}

        {!isLoading && isError && (
          <ErrorState
            title="Failed to load repair records"
            message={error?.response?.data?.message ?? 'Could not reach the server.'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && records.length === 0 && (
          <EmptyState
            icon={<Wrench className="w-5 h-5 text-muted-foreground" />}
            title="No repair records found"
            description={
              statusFilter ? 'Try clearing the filter.' : 'No repairs have been logged yet.'
            }
            action={
              !statusFilter ? (
                <button
                  onClick={onAddRepair}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                    'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
                  )}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Repair Record
                </button>
              ) : null
            }
          />
        )}

        {!isLoading && !isError && records.length > 0 && (
          <>
            <RepairRecordsTable records={records} />
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

// ── BikeMaintenancePage ────────────────────────────────────────

const BikeMaintenancePage = () => {
  const [activeTab,          setActiveTab]          = useState('damage')
  const [damageModalOpen,    setDamageModalOpen]    = useState(false)
  const [repairModalOpen,    setRepairModalOpen]    = useState(false)

  return (
    <>
      <div>
        {/* Header */}
        <PageHeader
          title="Bike Maintenance"
          description="Track damage reports and repair records for all bikes."
        >
          <div className="flex items-center gap-2">
            {activeTab === 'repair' && (
              <button
                onClick={() => setRepairModalOpen(true)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                  'border border-input hover:bg-muted transition-colors'
                )}
              >
                <PlusCircle className="w-4 h-4" />
                Add Repair
              </button>
            )}
            <button
              onClick={() => setDamageModalOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              Report Damage
            </button>
          </div>
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

        {activeTab === 'damage' && <DamageReportsTab />}
        {activeTab === 'repair' && (
          <RepairRecordsTab onAddRepair={() => setRepairModalOpen(true)} />
        )}
      </div>

      <DamageReportFormModal
        open={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
      />

      <RepairRecordFormModal
        open={repairModalOpen}
        onClose={() => setRepairModalOpen(false)}
      />
    </>
  )
}

export default BikeMaintenancePage