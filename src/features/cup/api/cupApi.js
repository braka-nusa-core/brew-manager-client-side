// src/features/cup/api/cupApi.js
// All Cup Record HTTP calls — no logic, no state.
//
// Backend CupRecord model:
//   { _id, tenantId, outletId, riderId, date,
//     items: [{ productId, distributed, refill, sold, returned, reject }],
//     status: 'draft'|'finalized', notes,
//     recordedBy, finalizedBy, finalizedAt, createdAt, updatedAt }
//
// Backend contract (confirmed from cup.routes.js + cup.controller.js + cup.service.js):
//   GET    /cups                → { success, message, data: CupRecord[], pagination }
//   GET    /cups/:id            → { success, message, data: CupRecord }
//   POST   /cups                → body: { riderId, date, items: [{productId, distributed?, refill?, sold?, returned?, reject?}], notes? }
//   PATCH  /cups/:id            → body: { items?, notes? } — draft only, at least one required, FULL REPLACE of items
//                                  LEGACY/emergency-correction path only — do NOT use for refill events (see POST /refill below).
//   POST   /cups/:id/refill     → body: { items: [{productId, quantity, notes?}] } — draft only, ONE refill event
//                                  per call, appended server-side to refillLogs (never overwrites prior refills).
//   PATCH  /cups/:id/finalize   → no body. 400 with { errors: string[] } if any item is unbalanced.
//                                  On success the backend automatically generates the matching Sale
//                                  (Sale.origin = 'system') — the frontend does NOT create a Sale after this.
//   DELETE /cups/:id            → 204 No Content — draft only, hard delete
//
// Every read/write response augments items[] (server-computed, NEVER persisted, NEVER send back):
//   carried = distributed + refill, accounted = sold + returned + reject, balance = carried - accounted
//
// Field rules:
//   tenantId, outletId — NEVER send. outletId is derived server-side from the rider's own Employee.outletId.
//   riderId, date       — immutable after creation. Rejected with 400 if sent on PATCH.
//   status              — NEVER send directly. Use finalizeCupRecord() — generic update rejects a status field.
//   riderId must reference an Employee with isRider:true, isActive:true in the same tenant (404 otherwise).
//
// Filter params (list): page, limit, riderId, outletId, status, date, startDate, endDate
// There is NO free-text "search" param on this endpoint (unlike employees/products).
//
// Access:
//   MANAGE_CUPS → create, update, finalize, delete
//   VIEW_CUPS   → list, detail
//   tenant_admin, manager, and cashier all hold BOTH permissions — no view-only role exists for this module.

import apiClient from '@/lib/axios'

/**
 * Fetch paginated cup record list.
 * @param {{ page?, limit?, riderId?, outletId?, status?, date?, startDate?, endDate? }} params
 */
export const getCupRecords = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/cups', { params: cleanParams })
  return data // { success, message, data: CupRecord[], pagination }
}

/**
 * Fetch a single cup record by ID.
 */
export const getCupRecord = async (cupRecordId) => {
  const { data } = await apiClient.get(`/cups/${cupRecordId}`)
  return data.data
}

/**
 * Create a new cup record (draft).
 * @param {{ riderId: string, date: string, items: Array, notes?: string }} payload
 */
export const createCupRecord = async (payload) => {
  const { data } = await apiClient.post('/cups', payload)
  return data.data
}

/**
 * Update a draft cup record. items[] (if sent) is a FULL REPLACE, never a delta.
 * riderId/date/status are immutable — never include them here.
 * @param {string} cupRecordId
 * @param {{ items?: Array, notes?: string }} payload
 */
export const updateCupRecord = async (cupRecordId, payload) => {
  const { data } = await apiClient.patch(`/cups/${cupRecordId}`, payload)
  return data.data
}

/**
 * Finalize a draft cup record. No body.
 * Throws (400) with err.response.data.errors — a string[] balance breakdown —
 * if any item is unbalanced. Record stays in draft on failure.
 * @param {string} cupRecordId
 */
export const finalizeCupRecord = async (cupRecordId) => {
  const { data } = await apiClient.patch(`/cups/${cupRecordId}/finalize`)
  return data.data
}

/**
 * Record a refill event for one or more products on a DRAFT cup record.
 * Each call is a SEPARATE event — appended to the backend's refillLogs,
 * never a delta/overwrite of the previous refill. A rider can be refilled
 * multiple times a day; call this once per refill event.
 *
 * Backend contract (cup.routes.js / cup.controller.js / cup.service.js):
 *   POST /cups/:id/refill  → body: { items: [{ productId, quantity, notes? }] }
 *   - quantity must be a positive integer (>0) — this IS the refill amount
 *     for this event, not the new total.
 *   - productId must already exist on the cup record (already dispatched);
 *     otherwise 400.
 *   - Draft records only — 409 if already finalized.
 *
 * @param {string} cupRecordId
 * @param {{ items: Array<{ productId: string, quantity: number, notes?: string }> }} payload
 */
export const addCupRefill = async (cupRecordId, payload) => {
  const { data } = await apiClient.post(`/cups/${cupRecordId}/refill`, payload)
  return data.data
}

/**
 * Hard-delete a draft cup record. Finalized records are rejected (409) server-side.
 * Returns 204 — no body.
 * @param {string} cupRecordId
 */
export const deleteCupRecord = async (cupRecordId) => {
  await apiClient.delete(`/cups/${cupRecordId}`)
}