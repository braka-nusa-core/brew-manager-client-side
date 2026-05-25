// src/features/sales/api/salesApi.js
// All sales HTTP calls — no logic, no state.
//
// Backend Sale model (actual):
//   { tenantId, outletId, employeeId, date, totalCups, totalRevenue, notes, recordedBy }
//
// Backend contract:
//   GET    /sales            → { success, message, data: Sale[], pagination }
//   GET    /sales/:saleId    → { success, message, data: Sale }
//   POST   /sales            → body: { employeeId, date, totalCups, totalRevenue, notes? }
//                              NOTE: outletId derived from employee in service layer
//   PATCH  /sales/:saleId    → body: { date?, totalCups?, totalRevenue?, notes? }
//   DELETE /sales/:saleId    → 204 No Content
//
// Filter params: outletId, employeeId, startDate, endDate, page, limit

import apiClient from '@/lib/axios'

/**
 * Fetch paginated sales list.
 * @param {Object} params - { page, limit, outletId, employeeId, startDate, endDate }
 */
export const getSales = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/sales', { params: cleanParams })
  return data // { success, message, data, pagination }
}

/**
 * Fetch a single sale record by ID.
 * @param {string} saleId
 */
export const getSale = async (saleId) => {
  const { data } = await apiClient.get(`/sales/${saleId}`)
  return data.data
}

/**
 * Create a new sale record.
 * outletId is NOT sent — backend derives it from the employee record.
 * @param {{ employeeId: string, date: string, totalCups: number, totalRevenue: number, notes?: string }} payload
 */
export const createSale = async (payload) => {
  const { data } = await apiClient.post('/sales', payload)
  return data.data
}

/**
 * Update a sale record.
 * employeeId, outletId, tenantId are immutable — do not send them.
 * @param {string} saleId
 * @param {{ date?: string, totalCups?: number, totalRevenue?: number, notes?: string }} payload
 */
export const updateSale = async (saleId, payload) => {
  const { data } = await apiClient.patch(`/sales/${saleId}`, payload)
  return data.data
}

/**
 * Delete a sale record. Returns 204 — no body.
 * @param {string} saleId
 */
export const deleteSale = async (saleId) => {
  await apiClient.delete(`/sales/${saleId}`)
}