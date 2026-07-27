// src/features/inventory/api/inventoryApi.js
//
// Sprint 7.1 — dashboard endpoint.
// Sprint 7.2 — per-product overview/list endpoint (GET /inventory).
// Sprint 7.3 — single product inventory detail (GET /inventory/products/:id).
// Sprint 7.4 — single batch detail + its transaction ledger.
// Sprint 7.5 — adjustment/opname write endpoints + adjustment ledger.
// GET /inventory/batches, /inventory/transactions are intentionally NOT
// implemented here — out of scope; Select Batch (Adjustment Modal) reuses
// useInventoryProductDetail's existing batches list instead of a new
// "list all batches" call (see InventoryAdjustmentModal.jsx).
//
// Pattern follows features/dashboard/api/dashboardApi.js exactly.

import apiClient from '@/lib/axios'

/**
 * GET /inventory/dashboard
 * Returns: {
 *   totalBatches, activeBatches, depletedBatches, totalUnitsRemaining,
 *   freshnessBreakdown: { safe, warning, expired },
 *   recentActivity: { sinceDate, byType: [{type, count, totalQuantity}] },
 *   todayAdjustment: { sinceDate, byReason: [{reason, count, totalQuantityDelta}] },
 *   monthAdjustment: { sinceDate, byReason: [{reason, count, totalQuantityDelta}] },
 * }
 * @param {{ outletId?: string }} params - outletId only meaningful for
 *   super_admin/tenant_admin (unscoped); ignored server-side for
 *   outlet-scoped roles (manager/cashier/viewer).
 */
export const getInventoryDashboard = async (params = {}) => {
  const { data } = await apiClient.get('/inventory/dashboard', { params })
  return data.data
}

/**
 * GET /inventory — paginated per-product stock overview.
 * Returns { data: InventoryOverviewRow[], pagination }.
 *
 * InventoryOverviewRow = {
 *   productId, productName, productIsActive,
 *   totalRemaining, batchCount, activeBatchCount, depletedBatchCount,
 *   oldestProducedAt, newestProducedAt, oldestAgeInDays,
 *   freshnessBreakdown: { safe, warning, expired },
 * }
 * NOTE: rows are NOT outlet-annotated by the backend (the aggregation
 * groups by productId only) — see InventoryListPage.jsx's own comment on
 * how the Outlet column is handled given this.
 *
 * @param {{
 *   search?: string, sort?: 'name'|'remaining'|'oldest', order?: 'asc'|'desc',
 *   outletId?: string, page?: number, limit?: number,
 * }} params
 */
export const getInventoryList = async (params = {}) => {
  const { data } = await apiClient.get('/inventory', { params })
  return data
}

/**
 * GET /inventory/products/:productId — single product's inventory detail.
 * Returns {
 *   product: { _id, name, isActive },
 *   summary: { totalRemaining, activeBatchCount, depletedBatchCount },
 *   batches: InventoryBatch[] (each annotated with ageInDays, freshness),
 *   pagination,
 * }
 *
 * @param {string} productId
 * @param {{ outletId?: string, page?: number, limit?: number }} params
 */
export const getInventoryProductDetail = async (productId, params = {}) => {
  const { data } = await apiClient.get(`/inventory/products/${productId}`, { params })
  return data.data
}

/**
 * GET /inventory/batches/:batchId — single batch, freshness-annotated.
 * Returns: { _id, tenantId, outletId, productId, producedAt, quantityInitial,
 *            quantityRemaining, status, createdAt, updatedAt, ageInDays, freshness }
 * NOTE: productId is a raw id — this endpoint does not populate/lookup the
 * product name (see InventoryBatchDetailPage.jsx's own comment on this).
 *
 * @param {string} batchId
 */
export const getInventoryBatchDetail = async (batchId) => {
  const { data } = await apiClient.get(`/inventory/batches/${batchId}`)
  return data.data
}

/**
 * GET /inventory/batches/:batchId/transactions — full movement ledger for
 * one batch (chronological by default — createdAt ascending).
 * Returns the full envelope (like getInventoryList): { data: transactions[],
 * batch, pagination } — transactions is nested under `.data`, `batch` and
 * `pagination` are siblings, matching the backend's exact response shape.
 *
 * @param {string} batchId
 * @param {{ type?: string, order?: 'asc'|'desc', page?: number, limit?: number }} params
 */
export const getBatchTransactions = async (batchId, params = {}) => {
  const { data } = await apiClient.get(`/inventory/batches/${batchId}/transactions`, { params })
  return data
}

// ── Sprint 7.5 — Adjustment & Stock Opname ──────────────────────

/**
 * POST /inventory/adjustment — manual, single-batch adjustment.
 * @param {{ batchId: string, quantityDelta: number, reason: string, notes?: string }} payload
 */
export const createInventoryAdjustment = async (payload) => {
  const { data } = await apiClient.post('/inventory/adjustment', payload)
  return data.data
}

/**
 * POST /inventory/opname — stock opname (physical count reconciliation).
 * Backend automatically creates the adjustment transaction(s) needed.
 * @param {{ productId: string, physicalQty: number, notes?: string }} payload
 * @returns {{ systemQty, physicalQty, delta, transactions: InventoryTransaction[] }}
 */
export const createStockOpname = async (payload) => {
  const { data } = await apiClient.post('/inventory/opname', payload)
  return data.data
}

/**
 * GET /inventory/adjustments — paginated/filterable adjustment ledger
 * (type='adjustment' only — includes both manual adjustments and
 * stock-opname-generated ones, distinguishable via `reason`).
 * Returns { data: InventoryTransaction[], pagination }.
 *
 * @param {{
 *   search?: string, reason?: string, productId?: string, batchId?: string,
 *   dateFrom?: string, dateTo?: string, sort?: 'quantity'|'createdAt',
 *   order?: 'asc'|'desc', outletId?: string, page?: number, limit?: number,
 * }} params
 */
export const getInventoryAdjustments = async (params = {}) => {
  const { data } = await apiClient.get('/inventory/adjustments', { params })
  return data
}

/**
 * GET /inventory/adjustments/:adjustmentId — single adjustment detail.
 * @param {string} adjustmentId
 */
export const getInventoryAdjustmentDetail = async (adjustmentId) => {
  const { data } = await apiClient.get(`/inventory/adjustments/${adjustmentId}`)
  return data.data
}