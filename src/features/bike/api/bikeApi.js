// src/features/bike/api/bikeApi.js
// All Bike HTTP calls — no logic, no state.
//
// Backend model fields:
//   { _id, tenantId, outletId, assetCode, name, status, notes, isActive, createdAt, updatedAt }
//
// TWO DISTINCT CONCEPTS (do not conflate):
//   status   — operational state: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'
//              changed ONLY via PATCH /:bikeId/status. NEVER in create/edit form.
//   isActive — soft-delete flag: true | false
//              set to false ONLY via DELETE /:bikeId (soft delete, 204).
//
// Backend field rules:
//   tenantId — NEVER sent (from JWT)
//   status   — FORBIDDEN on create (always defaults to ACTIVE); rejected on PATCH /:id
//   isActive — FORBIDDEN on PATCH /:id; use DELETE to soft-delete
//   assetCode — auto-uppercased server-side; unique per tenant → 409 on duplicate
//
// Endpoint summary:
//   POST   /bikes              MANAGE_BIKES  body: { outletId, assetCode, name, notes? }
//   GET    /bikes              VIEW_BIKES    query: { search, outletId, status, isActive, page, limit }
//   GET    /bikes/:bikeId      VIEW_BIKES
//   PATCH  /bikes/:bikeId      MANAGE_BIKES  body: { name?, assetCode?, notes?, outletId? } — at least one
//   PATCH  /bikes/:bikeId/status MANAGE_BIKES body: { status: 'ACTIVE'|'MAINTENANCE'|'RETIRED' }
//   DELETE /bikes/:bikeId      MANAGE_BIKES  soft delete → 204

import apiClient from '@/lib/axios'

export const getBikes = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/bikes', { params: cleanParams })
  return data // { success, message, data: Bike[], pagination }
}

export const getBike = async (bikeId) => {
  const { data } = await apiClient.get(`/bikes/${bikeId}`)
  return data.data
}

/**
 * Create a new bike. Status always defaults to ACTIVE — never send status here.
 * @param {{ outletId: string, assetCode: string, name: string, notes?: string }} payload
 */
export const createBike = async (payload) => {
  const { data } = await apiClient.post('/bikes', payload)
  return data.data
}

/**
 * Update bike fields. At least one of name/assetCode/notes/outletId required.
 * Never send status, isActive, or tenantId.
 * @param {string} bikeId
 * @param {{ name?, assetCode?, notes?, outletId? }} payload
 */
export const updateBike = async (bikeId, payload) => {
  const { data } = await apiClient.patch(`/bikes/${bikeId}`, payload)
  return data.data
}

/**
 * Change the operational status of a bike.
 * Separate from updateBike — backend enforces this via a dedicated endpoint.
 * Setting ACTIVE fails (400) if bike has OPEN or IN_REPAIR damage reports.
 * @param {string} bikeId
 * @param {'ACTIVE'|'MAINTENANCE'|'RETIRED'} status
 */
export const updateBikeStatus = async (bikeId, status) => {
  const { data } = await apiClient.patch(`/bikes/${bikeId}/status`, { status })
  return data.data
}

/**
 * Soft-delete a bike — sets isActive: false. Returns 204, no body.
 * The bike record is preserved for assignment/maintenance history.
 */
export const deleteBike = async (bikeId) => {
  await apiClient.delete(`/bikes/${bikeId}`)
}