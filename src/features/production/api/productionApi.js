// src/features/production/api/productionApi.js
//
// Sprint 8.1 — Production Module.
// Backend: /api/v1/production — a thin alias surface over the existing
// Inventory architecture (see inventory.service.js's listProduction/
// getProductionById on the backend). Pattern follows
// features/inventory/api/inventoryApi.js exactly.

import apiClient from '@/lib/axios'

/**
 * POST /production — records a new production batch.
 * Every call creates a NEW InventoryBatch + InventoryTransaction
 * (type='production') — batches are never merged/reused.
 * @param {{ productId: string, quantity: number, producedAt?: string, notes?: string }} payload
 */
export const createProduction = async (payload) => {
  const { data } = await apiClient.post('/production', payload)
  return data.data
}

/**
 * GET /production/dashboard — Sprint 8.2.
 * Returns { todayProduction, monthProduction, todayQuantity, monthQuantity,
 *           productionByProduct: [{productId, productName, count, totalQuantity}],
 *           last7Days: [{date, count, totalQuantity}] (always exactly 7 points),
 *           recentProduction: InventoryTransaction[] (product/outlet populated) }
 * @param {{ outletId?: string }} params
 */
export const getProductionDashboard = async (params = {}) => {
  const { data } = await apiClient.get('/production/dashboard', { params })
  return data.data
}

/**
 * GET /production — paginated/filterable production ledger.
 * Returns { data: InventoryTransaction[] (product/outlet populated), pagination }.
 * @param {{
 *   search?: string, period?: 'today'|'thisWeek'|'thisMonth',
 *   productId?: string, outletId?: string,
 *   dateFrom?: string, dateTo?: string, sort?: 'quantity'|'createdAt',
 *   order?: 'asc'|'desc', page?: number, limit?: number,
 * }} params - `search` matches Product Name OR Batch ID (Sprint 8.2).
 *   `period` is a quick-filter shortcut; a custom dateFrom/dateTo still
 *   works as before and takes effect whenever `period` is omitted.
 */
export const getProductionList = async (params = {}) => {
  const { data } = await apiClient.get('/production', { params })
  return data
}

/**
 * GET /production/:productionId — single production record.
 * Returns { transaction, batch } — both product/outlet populated.
 * @param {string} productionId
 */
export const getProductionDetail = async (productionId) => {
  const { data } = await apiClient.get(`/production/${productionId}`)
  return data.data
}