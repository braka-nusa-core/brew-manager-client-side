// src/features/user/components/UserTable.jsx
// User management table.
// Columns: Name/Email | Role | Outlet | Status | Actions
// RowActions: Edit | Reset Password | Activate/Deactivate

import { useState, useRef }         from 'react'
import { createPortal }             from 'react-dom'
import { MoreHorizontal, Pencil, KeyRound, UserX, UserCheck } from 'lucide-react'

import DataTable                    from '@/components/shared/DataTable'
import UserRoleBadge                from './UserRoleBadge'
import UserFormModal                from './UserFormModal'
import ResetPasswordDialog          from './ResetPasswordDialog'
import ToggleActiveDialog           from './ToggleActiveDialog'
import useEntityMap                 from '@/hooks/useEntityMap'
import { useAuthStore, selectUser }  from '@/store/authStore'
import { cn }                       from '@/lib/utils'

const ActiveBadge = ({ isActive }) => (
  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
    isActive ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400'
             : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400')}>
    <span className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-brand-500' : 'bg-zinc-400')} />
    {isActive ? 'Active' : 'Inactive'}
  </span>
)

const getInitials = (name = '') => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
const AVATAR_COLORS = ['bg-violet-100 text-violet-700','bg-blue-100 text-blue-700','bg-brand-100 text-brand-700','bg-amber-100 text-amber-700','bg-rose-100 text-rose-700']
const UserAvatar = ({ name }) => (
  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
    AVATAR_COLORS[(name?.length ?? 0) % AVATAR_COLORS.length])}>
    {getInitials(name)}
  </div>
)

const RowActions = ({ user, onEdit, onReset, onToggle, isSelf }) => {
  const [open, setOpen]       = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef            = useRef(null)

  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 })
    }
    setOpen((o) => !o)
  }
  const close  = () => setOpen(false)
  const action = (fn) => (e) => { e.stopPropagation(); close(); fn(user) }

  return (
    <div className="relative flex justify-end">
      <button ref={triggerRef} onClick={handleOpen}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed w-44 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in">
            <button onClick={action(onEdit)}  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
              <Pencil    className="w-3.5 h-3.5 text-muted-foreground" />Edit Details
            </button>
            <button onClick={action(onReset)} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
              <KeyRound  className="w-3.5 h-3.5 text-muted-foreground" />Reset Password
            </button>
            <div className="border-t border-border" />
            <button onClick={isSelf ? undefined : action(onToggle)}
              disabled={isSelf}
              title={isSelf ? 'You cannot deactivate your own account' : undefined}
              className={cn('flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors',
                isSelf
                  ? 'text-muted-foreground opacity-50 cursor-not-allowed'
                  : user.isActive
                    ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30')}>
              {user.isActive
                ? <><UserX  className="w-3.5 h-3.5" />Deactivate</>
                : <><UserCheck className="w-3.5 h-3.5" />Activate</>}
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

const UserTable = ({ users }) => {
  const [editTarget,   setEditTarget]   = useState(null)
  const [resetTarget,  setResetTarget]  = useState(null)
  const [toggleTarget, setToggleTarget] = useState(null)
  const { outletMap } = useEntityMap()
  const currentUser    = useAuthStore(selectUser)

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Name / Email</DataTable.HeadCell>
            <DataTable.HeadCell>Role</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden sm:table-cell">Outlet</DataTable.HeadCell>
            <DataTable.HeadCell>Status</DataTable.HeadCell>
            <DataTable.HeadCell className="w-10" />
          </DataTable.HeadRow>
        </DataTable.Head>
        <DataTable.Body>
          {users.map((u) => {
            const outletIdStr = u.outletId?.toString?.() ?? u.outletId ?? ''
            const outletName  = outletMap.get(outletIdStr)?.name ?? (outletIdStr ? '—' : 'All outlets')
            return (
              <DataTable.Row key={u._id}>
                <DataTable.Cell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={u.name} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                </DataTable.Cell>
                <DataTable.Cell><UserRoleBadge role={u.role} /></DataTable.Cell>
                <DataTable.Cell className="hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">{outletName}</span>
                </DataTable.Cell>
                <DataTable.Cell><ActiveBadge isActive={u.isActive} /></DataTable.Cell>
                <DataTable.Cell>
                  <RowActions
                    user={u}
                    onEdit={setEditTarget}
                    onReset={setResetTarget}
                    onToggle={setToggleTarget}
                    isSelf={!!currentUser?._id && currentUser._id === u._id}
                  />
                </DataTable.Cell>
              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>

      <UserFormModal     open={!!editTarget}   onClose={() => setEditTarget(null)}   user={editTarget} />
      <ResetPasswordDialog open={!!resetTarget}  onClose={() => setResetTarget(null)}  user={resetTarget} />
      <ToggleActiveDialog  open={!!toggleTarget} onClose={() => setToggleTarget(null)} user={toggleTarget} />
    </>
  )
}

export default UserTable