// src/features/user/api/userApi.js
// User Management HTTP calls — no logic, no state.
//
// All routes require authenticate + tenantGuard + MANAGE_USERS.
// Only super_admin and tenant_admin have MANAGE_USERS.
// tenantId/createdBy/passwordHash never sent — always backend-owned.
//
// Creatable roles: manager | cashier | viewer (all outlet-scoped)
// Immutable via PATCH: role, password (use reset-password for the latter)
//
// Endpoints:
//   POST   /users                            body: { name, email, password, role, outletId }
//   GET    /users                            query: { search, role, isActive, outletId, page, limit }
//   GET    /users/:userId
//   PATCH  /users/:userId                    body: { name?, email?, outletId? } — at least one
//   PATCH  /users/:userId/toggle-active      no body
//   PATCH  /users/:userId/reset-password     body: { newPassword }

import apiClient from '@/lib/axios'

export const getUsers = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/users', { params: cleanParams })
  return data // { success, message, data: User[], pagination }
}

export const getUserById = async (userId) => {
  const { data } = await apiClient.get(`/users/${userId}`)
  return data.data
}

export const createUser = async (payload) => {
  const { data } = await apiClient.post('/users', payload)
  return data.data
}

/**
 * Update mutable fields: name, email, outletId.
 * role and password are IMMUTABLE via this endpoint.
 */
export const updateUser = async (userId, payload) => {
  const { data } = await apiClient.patch(`/users/${userId}`, payload)
  return data.data
}

/** No body. Flips isActive. Prevents self-deactivation (400 from backend). */
export const toggleUserActive = async (userId) => {
  const { data } = await apiClient.patch(`/users/${userId}/toggle-active`)
  return data.data
}

/** Admin reset — does NOT require the current password. */
export const resetUserPassword = async (userId, newPassword) => {
  const { data } = await apiClient.patch(`/users/${userId}/reset-password`, { newPassword })
  return data.data
}