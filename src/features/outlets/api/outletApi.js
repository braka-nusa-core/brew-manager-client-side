// src/features/outlet/api/outletApi.js
// All outlet HTTP calls — no logic, no state.
//
// Backend contract (confirmed from outlet.routes.js + outlet.controller.js):
//   GET    /outlets              → { success, data: Outlet[], pagination }
//   POST   /outlets              → body: { name, code?, address?, phone? }
//   GET    /outlets/:id          → { success, data: Outlet }
//   PATCH  /outlets/:id          → body: { name?, code?, address?, phone?, isActive? }
//   PATCH  /outlets/:id/toggle-active → no body, flips isActive
//   DELETE /outlets/:id          → 204 No Content (soft delete)
//
// Outlet fields: { _id, tenantId, name, code, address, phone, isActive, deletedAt, createdAt }
// tenantId comes from JWT — never sent in body.
// code is auto-generated from name if not provided.
//
// Access:
//   MANAGE_OUTLETS → create, update, toggle, delete
//   VIEW_OUTLETS   → list, detail
//   manager/cashier → view their own outlet only (backend enforces)

import apiClient from '@/lib/axios'

/**
 * Fetch paginated outlet list.
 * @param {{ page?, limit?, search?, isActive? }} params
 */
export const getOutlets = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/outlets', { params: cleanParams })
  return data // { success, message, data: Outlet[], pagination }
}

/**
 * Create a new outlet.
 * tenantId comes from JWT — backend derives it from req.tenantId.
 * @param {{ name: string, code?: string, address?: string, phone?: string }} payload
 */
export const createOutlet = async (payload) => {
  const { data } = await apiClient.post('/outlets', payload)
  return data.data
}

/**
 * Update an outlet.
 * tenantId is immutable — do NOT send it.
 * At least one mutable field required.
 * @param {string} outletId
 * @param {{ name?, code?, address?, phone?, isActive? }} payload
 */
export const updateOutlet = async (outletId, payload) => {
  const { data } = await apiClient.patch(`/outlets/${outletId}`, payload)
  return data.data
}

/**
 * Toggle outlet active/inactive status.
 * No body — backend flips current isActive value.
 * @param {string} outletId
 */
export const toggleOutletActive = async (outletId) => {
  const { data } = await apiClient.patch(`/outlets/${outletId}/toggle-active`)
  return data.data
}

/**
 * Soft-delete an outlet.
 * Returns 204 — no body.
 * Outlet data is preserved for history.
 * @param {string} outletId
 */
export const deleteOutlet = async (outletId) => {
  await apiClient.delete(`/outlets/${outletId}`)
}