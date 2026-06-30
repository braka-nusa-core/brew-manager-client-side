// src/features/outlet/components/OutletCard.jsx
// Displays a single outlet as a card (grid layout).
// Actions: edit, toggle-active, delete.

import { useState }                              from 'react'
import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2, MapPin, Phone, Hash } from 'lucide-react'

import OutletStatusBadge                         from './OutletStatusBadge'
import { useToggleOutletActive, useDeleteOutlet } from '../../outlets/hooks/useOutlets'
import useToast                                  from '@/hooks/useToast'
import { cn }                                    from '@/lib/utils'

// ── Card Menu ─────────────────────────────────────────────────

const CardMenu = ({ outlet, onEdit }) => {
  const [open,       setOpen]       = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const toggleMutation              = useToggleOutletActive()
  const deleteMutation              = useDeleteOutlet()
  const toast                       = useToast()

  const handleToggle = () => {
    setOpen(false)
    toggleMutation.mutate(outlet._id, {
      onSuccess: (updated) => {
        toast.success(
          updated.isActive ? 'Outlet activated' : 'Outlet deactivated',
          updated.name
        )
      },
      onError: (err) => toast.error('Failed', err?.response?.data?.message),
    })
  }

  const handleDelete = () => {
    if (!confirmDel) { setConfirmDel(true); return }
    setOpen(false)
    setConfirmDel(false)
    deleteMutation.mutate(outlet._id, {
      onSuccess: () => toast.success('Outlet removed', 'Data is preserved for history.'),
      onError:   (err) => toast.error('Delete failed', err?.response?.data?.message),
    })
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => { setOpen(false); setConfirmDel(false) }}
          />
          <div className="absolute right-0 top-full mt-1 w-48 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in">

            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(outlet) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Outlet
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleToggle() }}
              disabled={toggleMutation.isPending}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              {outlet.isActive
                ? <ToggleLeft  className="w-3.5 h-3.5 text-muted-foreground" />
                : <ToggleRight className="w-3.5 h-3.5 text-brand-500" />
              }
              {outlet.isActive ? 'Deactivate' : 'Activate'}
            </button>

            <div className="border-t border-border" />

            <button
              onClick={(e) => { e.stopPropagation(); handleDelete() }}
              disabled={deleteMutation.isPending}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors disabled:opacity-50',
                confirmDel
                  ? 'text-destructive bg-destructive/10 font-semibold'
                  : 'text-destructive hover:bg-destructive/10'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDel ? 'Confirm remove?' : 'Remove Outlet'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Outlet Card ───────────────────────────────────────────────

// Deterministic color from outlet name for the icon circle
const CARD_COLORS = [
  'bg-blue-100   text-blue-600   dark:bg-blue-950/50   dark:text-blue-400',
  'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
  'bg-amber-100  text-amber-600  dark:bg-amber-950/50  dark:text-amber-400',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
  'bg-rose-100   text-rose-600   dark:bg-rose-950/50   dark:text-rose-400',
  'bg-brand-100  text-brand-700  dark:bg-brand-950/50  dark:text-brand-400',
]

/**
 * @param {{
 *   outlet: Object,
 *   onEdit: (outlet: Object) => void,
 *   canManage: boolean
 * }} props
 */
const OutletCard = ({ outlet, onEdit, canManage }) => {
  const color = CARD_COLORS[(outlet.name?.length ?? 0) % CARD_COLORS.length]

  const initials = outlet.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '??'

  return (
    <div className={cn(
      'bg-card border border-border rounded-xl p-4 flex flex-col gap-4',
      'hover:shadow-sm transition-shadow duration-200',
      !outlet.isActive && 'opacity-70'
    )}>

      {/* Top row: icon + code + menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Icon circle */}
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
            color
          )}>
            {initials}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {outlet.name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Hash className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground font-mono">
                {outlet.code ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {canManage && <CardMenu outlet={outlet} onEdit={onEdit} />}
      </div>

      {/* Details */}
      <div className="space-y-1.5 flex-1">
        {outlet.address ? (
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {outlet.address}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/40 italic">No address set</p>
        )}

        {outlet.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <p className="text-xs text-muted-foreground">{outlet.phone}</p>
          </div>
        )}
      </div>

      {/* Footer: status + date */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <OutletStatusBadge isActive={outlet.isActive} />
        <p className="text-[10px] text-muted-foreground/60">
          {outlet.createdAt
            ? new Date(outlet.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })
            : '—'}
        </p>
      </div>

    </div>
  )
}

export default OutletCard