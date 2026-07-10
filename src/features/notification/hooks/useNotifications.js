// src/features/notifications/hooks/useNotifications.js
// TanStack Query hooks for the Notification feature.
//
// Polling: useUnreadCount polls every 30 s while the Navbar is mounted.
// Invalidation: all three mutations invalidate both unread-count and
// the notification list, ensuring the bell badge and panel stay in sync.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../api/notificationApi'

// ── Query key factory ─────────────────────────────────────────

export const notificationKeys = {
  all:        () => ['notifications'],
  unread:     () => ['notifications', 'unread-count'],
  lists:      () => ['notifications', 'list'],
  list:       (params) => ['notifications', 'list', params],
}

// ── useUnreadCount — polled every 30 s ────────────────────────

export const useUnreadCount = () =>
  useQuery({
    queryKey:        notificationKeys.unread(),
    queryFn:         getUnreadCount,
    refetchInterval: 30 * 1000,
    staleTime:       0, // always consider stale so poll stays live
  })

// ── useNotifications — paginated list ─────────────────────────
// staleTime: 0 so calling refetch() on dropdown open always fetches fresh.

export const useNotifications = (params) =>
  useQuery({
    queryKey:        notificationKeys.list(params),
    queryFn:         () => getNotifications(params),
    placeholderData: (prev) => prev,
    staleTime:       0,
  })

// ── useMarkAsRead ─────────────────────────────────────────────

export const useMarkAsRead = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}

// ── useMarkAllAsRead ──────────────────────────────────────────

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}

// ── useDeleteNotification ─────────────────────────────────────
// Hard delete ("dismiss") — no soft delete for notifications.

export const useDeleteNotification = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}