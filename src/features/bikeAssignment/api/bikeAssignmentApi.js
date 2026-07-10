// src/features/bikeAssignment/api/bikeAssignmentApi.js
// All Bike Assignment HTTP calls — no logic, no state.
//
// Backend model fields:
//   { _id, tenantId, bikeId, employeeId, startDate, endDate, createdAt, updatedAt }
//   endDate: null = currently active
//
// Endpoint summary (mounted at /api/v1/bike-assignments):
//   POST   /bike-assignments           MANAGE_BIKES  body: { bikeId, employeeId, startDate }
//   GET    /bike-assignments           VIEW_BIKES    query: { bikeId?, employeeId?, active?, page, limit }
//   GET    /bike-assignments/active    VIEW_BIKES    no query — denormalized, no _id, no pagination
//   PATCH  /bike-assignments/:id/end   MANAGE_BIKES  no body — sets endDate = now
//
// THERE IS NO UPDATE ENDPOINT AND NO DELETE ENDPOINT.
// Assignment history is append-only. Ending sets endDate, never removes.
//
// GET /active returns a different shape from GET /:
//   { bikeId, bikeName, assetCode, riderId, riderName, startDate }
//   Note: NO _id. Designed for display/dashboards only.
//   To end an active assignment we need the _id — fetch from GET / with ?active=true.
//
// 409 errors on create:
//   "This bike already has an active assignment. End it before creating a new one."
//   "This rider already has an active bike assignment. End it before assigning a new bike."
//
// Bike requirements: isActive:true AND status:'ACTIVE'
// Rider requirements: isRider:true AND isActive:true

import apiClient from '@/lib/axios'

/**
 * GET /bike-assignments/active
 * Returns denormalized active assignments — pre-resolved bike/rider names.
 * No pagination. No _id on items.
 * @returns {{ bikeId, bikeName, assetCode, riderId, riderName, startDate }[]}
 */
export const getActiveAssignments = async () => {
  const { data } = await apiClient.get('/bike-assignments/active')
  return data.data // array, not paginated
}

/**
 * GET /bike-assignments
 * Paginated assignment history. bikeId/employeeId are raw ObjectIds.
 * @param {{ bikeId?, employeeId?, active?, page?, limit? }} params
 */
export const getAssignments = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/bike-assignments', { params: cleanParams })
  return data // { success, message, data: Assignment[], pagination }
}

/**
 * POST /bike-assignments
 * Create a new assignment. No backend-owned fields.
 * @param {{ bikeId: string, employeeId: string, startDate: string }} payload
 */
export const createAssignment = async (payload) => {
  const { data } = await apiClient.post('/bike-assignments', payload)
  return data.data
}

/**
 * PATCH /bike-assignments/:assignmentId/end
 * Sets endDate = now. No body. Rejects if already ended (409).
 * @param {string} assignmentId
 */
export const endAssignment = async (assignmentId) => {
  const { data } = await apiClient.patch(`/bike-assignments/${assignmentId}/end`)
  return data.data
}