// src/features/notification/components/NotificationBell.jsx
// Bell icon button in the Navbar with unread badge + dropdown panel.
//
// Polling: useUnreadCount polls every 30 s (configured in useNotifications.js).
// Refetch on open: explicit refetch() called when dropdown opens.
// Pagination: prev/next inline buttons (full Pagination component too wide for panel).
//
// Panel positioning: absolute below the bell, right-aligned.
// No portal needed — Navbar header has no overflow:hidden.
// z-50 matches other dropdowns in the app.

import { useState, useEffect, useRef }  from 'react'
import { Bell, CheckCheck, Loader2 }    from 'lucide-react'

import NotificationItem                  from './NotificationItem'
import {
  useUnreadCount,
  useNotifications,
  useMarkAllAsRead,
}                                        from '../hooks/useNotifications'
import { cn }                            from '@/lib/utils'

const PAGE_SIZE = 8

// ── UnreadBadge ───────────────────────────────────────────────

const UnreadBadge = ({ count }) => {
  if (!count || count <= 0) return null
  return (
    <span className={cn(
      'absolute -top-1 -right-1 flex items-center justify-center',
      'min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold',
      'bg-red-500 text-white leading-none pointer-events-none'
    )}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ── NotificationBell ──────────────────────────────────────────

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [page,   setPage]   = useState(1)
  const panelRef            = useRef(null)

  const { data: unreadCount = 0 } = useUnreadCount()

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useNotifications({ page, limit: PAGE_SIZE })

  const markAllMutation = useMarkAllAsRead()

  const notifications = data?.data       ?? []
  const pagination    = data?.pagination ?? { totalPages: 1, page: 1, total: 0 }

  // Refetch + reset page when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setPage(1)
      refetch()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleMarkAll = () => {
    if (markAllMutation.isPending) return
    markAllMutation.mutate()
  }

  const handlePrev = () => setPage((p) => Math.max(1, p - 1))
  const handleNext = () => setPage((p) => Math.min(pagination.totalPages, p + 1))

  const hasUnread = unreadCount > 0
  const totalPages = pagination.totalPages ?? 1
  const currentPage = pagination.page ?? page

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'relative p-2 rounded-md transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          isOpen && 'bg-muted text-foreground'
        )}
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        <UnreadBadge count={unreadCount} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className={cn(
          'absolute right-0 top-full mt-2 z-50',
          'w-[calc(100vw-2rem)] sm:w-80',
          'bg-popover border border-border rounded-xl shadow-xl',
          'overflow-hidden animate-fade-in'
        )}>

          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {hasUnread && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {hasUnread && (
              <button
                onClick={handleMarkAll}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-600 transition-colors disabled:opacity-50"
              >
                {markAllMutation.isPending
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <CheckCheck className="w-3 h-3" />
                }
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  You're all caught up.
                </p>
              </div>
            ) : (
              <>
                {isFetching && !isLoading && (
                  <div className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-muted-foreground bg-muted/30">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Refreshing…
                  </div>
                )}
                {notifications.map((n) => (
                  <NotificationItem key={n._id} notification={n} />
                ))}
              </>
            )}
          </div>

          {/* Pagination — only shown when multiple pages */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
              <button
                onClick={handlePrev}
                disabled={currentPage <= 1 || isFetching}
                className="px-2 py-1 text-xs rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>

              <span className="text-[11px] text-muted-foreground tabular-nums">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={handleNext}
                disabled={currentPage >= totalPages || isFetching}
                className="px-2 py-1 text-xs rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell