// src/features/notification/components/NotificationItem.jsx
// Renders one notification inside the dropdown panel.
//
// Visual states:
//   Unread  → highlighted background (bg-brand-50 / dark variant)
//   Read    → normal card background, muted text
//
// Icons per type (confirmed from Notification.model.js NOTIFICATION_TYPES):
//   payroll_generated        → Banknote
//   rider_bonus_achieved     → Trophy
//   bike_maintenance_overdue → Wrench
//
// Actions:
//   Mark as read  — PATCH /:id/read (only shown when isRead: false)
//   Delete        — DELETE /:id (hard delete, always available)
//   WhatsApp      — window.open(waLink, '_blank') only when waLink is non-null
//                   (only rider_bonus_achieved ever has waLink)

import { Banknote, Trophy, Wrench, Circle, Trash2, ExternalLink, CheckCheck } from 'lucide-react'
import { useMarkAsRead, useDeleteNotification } from '../hooks/useNotifications'
import { cn } from '@/lib/utils'

// ── Icon map ──────────────────────────────────────────────────

const TYPE_CONFIG = {
  payroll_generated: {
    icon:  Banknote,
    color: 'text-blue-500 dark:text-blue-400',
    bg:    'bg-blue-100 dark:bg-blue-950/40',
  },
  rider_bonus_achieved: {
    icon:  Trophy,
    color: 'text-amber-500 dark:text-amber-400',
    bg:    'bg-amber-100 dark:bg-amber-950/40',
  },
  bike_maintenance_overdue: {
    icon:  Wrench,
    color: 'text-red-500 dark:text-red-400',
    bg:    'bg-red-100 dark:bg-red-950/40',
  },
}

const DEFAULT_TYPE_CONFIG = {
  icon:  Circle,
  color: 'text-muted-foreground',
  bg:    'bg-muted',
}

// ── Time formatter ────────────────────────────────────────────

const timeAgo = (iso) => {
  if (!iso) return ''
  const diffMs  = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)  return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

// ── NotificationItem ──────────────────────────────────────────

/**
 * @param {{ notification: Object }} props
 */
const NotificationItem = ({ notification }) => {
  const markRead   = useMarkAsRead()
  const deleteNote = useDeleteNotification()

  const config = TYPE_CONFIG[notification.type] ?? DEFAULT_TYPE_CONFIG
  const Icon   = config.icon

  const isPending = markRead.isPending || deleteNote.isPending

  const handleMarkRead = (e) => {
    e.stopPropagation()
    if (notification.isRead || markRead.isPending) return
    markRead.mutate(notification._id)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (deleteNote.isPending) return
    deleteNote.mutate(notification._id)
  }

  const handleWhatsApp = (e) => {
    e.stopPropagation()
    if (notification.waLink) window.open(notification.waLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={cn(
      'group relative flex gap-3 px-3 py-3 transition-colors',
      notification.isRead
        ? 'bg-card hover:bg-muted/40'
        : 'bg-brand-50 dark:bg-brand-950/20 hover:bg-brand-100/70 dark:hover:bg-brand-950/30'
    )}>

      {/* Unread dot indicator */}
      {!notification.isRead && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
      )}

      {/* Type icon */}
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5',
        config.bg
      )}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs font-semibold leading-snug',
          notification.isRead ? 'text-muted-foreground' : 'text-foreground'
        )}>
          {notification.title}
        </p>
        <p className={cn(
          'text-xs mt-0.5 leading-relaxed line-clamp-2',
          notification.isRead ? 'text-muted-foreground/70' : 'text-muted-foreground'
        )}>
          {notification.message}
        </p>

        {/* Footer: time + WhatsApp */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground/60">
            {timeAgo(notification.createdAt)}
          </span>

          {notification.waLink && (
            <button
              onClick={handleWhatsApp}
              className={cn(
                'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded',
                'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
                'dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60',
                'transition-colors'
              )}
            >
              <ExternalLink className="w-2.5 h-2.5" />
              WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* Action buttons — visible on hover or always for pending states */}
      <div className={cn(
        'flex items-start gap-0.5 shrink-0 transition-opacity',
        isPending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        {/* Mark as read (only if unread) */}
        {!notification.isRead && (
          <button
            onClick={handleMarkRead}
            disabled={isPending}
            title="Mark as read"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-brand-600 transition-colors disabled:opacity-40"
          >
            <CheckCheck className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete / dismiss */}
        <button
          onClick={handleDelete}
          disabled={isPending}
          title="Dismiss"
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default NotificationItem