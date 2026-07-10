// src/features/notification/api/notificationApi.js
// All Notification HTTP calls.
//
// Authorization: authenticate only — no tenantGuard, no authorize().
// Every endpoint is scoped to req.user.userId server-side automatically.
// Never send userId, tenantId, or any user identity in request body/params.
//
// Model fields returned:
//   { _id, tenantId, userId, type, title, message,
//     relatedEntity: { entityType, entityId },
//     waText, waLink,              ← null except on rider_bonus_achieved
//     isRead, readAt, createdAt, updatedAt }
//
// Notification types: payroll_generated | rider_bonus_achieved | bike_maintenance_overdue
//
// Endpoints:
//   GET    /notifications              query: { isRead?, page, limit }
//   GET    /notifications/unread-count returns { data: { count } }
//   PATCH  /notifications/read-all     no body
//   PATCH  /notifications/:id/read     no body
//   DELETE /notifications/:id          204

import apiClient from '@/lib/axios'

export const getNotifications = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/notifications', { params: cleanParams })
  return data // { success, message, data: Notification[], pagination }
}

export const getUnreadCount = async () => {
  const { data } = await apiClient.get('/notifications/unread-count')
  return data.data.count // number
}

export const markAsRead = async (notificationId) => {
  const { data } = await apiClient.patch(`/notifications/${notificationId}/read`)
  return data.data
}

export const markAllAsRead = async () => {
  const { data } = await apiClient.patch('/notifications/read-all')
  return data.data // { matched, modified }
}

export const deleteNotification = async (notificationId) => {
  await apiClient.delete(`/notifications/${notificationId}`)
}