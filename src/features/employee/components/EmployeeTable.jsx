// src/features/employee/components/EmployeeTable.jsx
import { useState }                  from 'react'
import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import DataTable                     from '@/components/shared/DataTable'
import EmployeeStatusBadge           from './EmployeeStatusBadge'
import EmployeeFormModal             from './EmployeeFormModal'
import DeleteConfirmDialog           from './DeleteConfirmDialog'
import { useToggleEmployeeActive }   from '../hooks/useEmployees'
import useToast                      from '@/hooks/useToast'
import { cn }                        from '@/lib/utils'

// Employee type badge config — labels mirror EMPLOYEE_TYPES (imported from
// EmployeeFormModal, the single source of truth shared with the form).
// Rider gets a distinct color since it's operationally significant
// (riders are the only employees eligible for Cup Record assignment).
const EMPLOYEE_TYPE_BADGE = {
  barista:    { label: 'Barista',    className: 'bg-blue-50 text-blue-600' },
  cashier:    { label: 'Cashier',    className: 'bg-violet-50 text-violet-600' },
  supervisor: { label: 'Supervisor', className: 'bg-amber-50 text-amber-600' },
  rider:      { label: 'Rider',      className: 'bg-emerald-50 text-emerald-600' },
}

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount ?? 0)

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-brand-100 text-brand-700',
]

const EmployeeAvatar = ({ name }) => {
  const color = AVATAR_COLORS[(name?.length ?? 0) % AVATAR_COLORS.length]
  return (
    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', color)}>
      {getInitials(name)}
    </div>
  )
}

const RowActions = ({ employee, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false)
  const toggleMutation  = useToggleEmployeeActive()
  const toast           = useToast()

  const handleToggle = () => {
    setOpen(false)
    toggleMutation.mutate(employee._id, {
      onSuccess: (updated) => {
        toast.success(updated.isActive ? 'Employee activated' : 'Employee deactivated', updated.name)
      },
      onError: (err) => toast.error('Failed to update status', err.response?.data?.message),
    })
  }

  return (
    <div className="relative flex justify-end">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in">
            <button
              onClick={() => { setOpen(false); onEdit(employee) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Details
            </button>

            <button
              onClick={handleToggle}
              disabled={toggleMutation.isPending}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              {employee.isActive
                ? <ToggleLeft  className="w-3.5 h-3.5 text-muted-foreground" />
                : <ToggleRight className="w-3.5 h-3.5 text-brand-500" />}
              {employee.isActive ? 'Deactivate' : 'Activate'}
            </button>

            <div className="border-t border-border" />

            <button
              onClick={() => { setOpen(false); onDelete(employee) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const EmployeeTable = ({ employees }) => {
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Employee</DataTable.HeadCell>
            <DataTable.HeadCell>Position</DataTable.HeadCell>
            <DataTable.HeadCell>Type</DataTable.HeadCell>
            <DataTable.HeadCell>Salary Type</DataTable.HeadCell>
            <DataTable.HeadCell>Base Salary</DataTable.HeadCell>
            <DataTable.HeadCell>Join Date</DataTable.HeadCell>
            <DataTable.HeadCell>Status</DataTable.HeadCell>
            <DataTable.HeadCell className="w-12" />
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {employees.map((emp) => (
            <DataTable.Row key={emp._id}>
              <DataTable.Cell>
                <div className="flex items-center gap-3">
                  <EmployeeAvatar name={emp.name} />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground leading-none truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{emp.phone ?? 'No phone'}</p>
                  </div>
                </div>
              </DataTable.Cell>

              <DataTable.Cell>
                <span className="capitalize text-sm">{emp.position}</span>
              </DataTable.Cell>

              <DataTable.Cell>
                {(() => {
                  const typeBadge = EMPLOYEE_TYPE_BADGE[emp.employeeType] ?? EMPLOYEE_TYPE_BADGE.barista
                  return (
                    <span className={cn(
                      'inline-block text-xs px-2 py-0.5 rounded-md font-medium',
                      typeBadge.className
                    )}>
                      {typeBadge.label}
                    </span>
                  )
                })()}
              </DataTable.Cell>

              <DataTable.Cell>
                <span className={cn(
                  'inline-block text-xs px-2 py-0.5 rounded-md font-medium',
                  emp.salaryType === 'monthly'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-amber-50 text-amber-600'
                )}>
                  {emp.salaryType === 'monthly' ? 'Monthly' : 'Daily'}
                </span>
              </DataTable.Cell>

              <DataTable.Cell>
                <span className="font-mono text-xs">{formatCurrency(emp.baseSalary)}</span>
              </DataTable.Cell>

              <DataTable.Cell className="text-muted-foreground text-sm">
                {formatDate(emp.joinDate)}
              </DataTable.Cell>

              <DataTable.Cell>
                <EmployeeStatusBadge isActive={emp.isActive} />
              </DataTable.Cell>

              <DataTable.Cell>
                <RowActions employee={emp} onEdit={setEditTarget} onDelete={setDeleteTarget} />
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>

      <EmployeeFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        employee={editTarget}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        employee={deleteTarget}
      />
    </>
  )
}

export default EmployeeTable