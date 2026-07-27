// src/features/inventory/hooks/useInventory.js
//
// Sprint 7.1 — dashboard query.
// Sprint 7.2 — inventory list (per-product overview) query.
// Sprint 7.3 — single product inventory detail query.
// Sprint 7.4 — single batch detail + its transaction ledger queries.
// Sprint 7.5 — adjustment/opname mutations + adjustment ledger queries.
// Pattern follows features/dashboard/hooks/useDashboard.js exactly
// (queries) and features/cup/hooks/useCupRecords.js exactly (mutations).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInventoryDashboard,
  getInventoryList,
  getInventoryProductDetail,
  getInventoryBatchDetail,
  getBatchTransactions,
  createInventoryAdjustment,
  createStockOpname,
  getInventoryAdjustments,
  getInventoryAdjustmentDetail,
} from '../api/inventoryApi'

export const inventoryKeys = {
  all:               () => ['inventory'],
  dashboard:         (p) => ['inventory', 'dashboard', p],
  list:              (p) => ['inventory', 'list', p],
  productDetail:     (productId, p) => ['inventory', 'product', productId, p],
  batchDetail:       (batchId) => ['inventory', 'batch', batchId],
  batchTransactions: (batchId, p) => ['inventory', 'batch', batchId, 'transactions', p],
  adjustments:       (p) => ['inventory', 'adjustments', p],
  adjustmentDetail:  (adjustmentId) => ['inventory', 'adjustments', adjustmentId],
}

const BASE = { staleTime: 1000 * 60 * 3, retry: 1 }

export const useInventoryDashboard = (p = {}) =>
  useQuery({ queryKey: inventoryKeys.dashboard(p), queryFn: () => getInventoryDashboard(p), ...BASE })

export const useInventoryList = (p = {}) =>
  useQuery({ queryKey: inventoryKeys.list(p), queryFn: () => getInventoryList(p), ...BASE })

export const useInventoryProductDetail = (productId, p = {}) =>
  useQuery({
    queryKey: inventoryKeys.productDetail(productId, p),
    queryFn:  () => getInventoryProductDetail(productId, p),
    enabled:  !!productId,
    ...BASE,
  })

export const useInventoryBatchDetail = (batchId) =>
  useQuery({
    queryKey: inventoryKeys.batchDetail(batchId),
    queryFn:  () => getInventoryBatchDetail(batchId),
    enabled:  !!batchId,
    ...BASE,
  })

export const useBatchTransactions = (batchId, p = {}) =>
  useQuery({
    queryKey: inventoryKeys.batchTransactions(batchId, p),
    queryFn:  () => getBatchTransactions(batchId, p),
    enabled:  !!batchId,
    ...BASE,
  })

// ── Sprint 7.5 — Adjustment & Stock Opname ──────────────────────

export const useInventoryAdjustments = (p = {}) =>
  useQuery({ queryKey: inventoryKeys.adjustments(p), queryFn: () => getInventoryAdjustments(p), ...BASE })

export const useInventoryAdjustmentDetail = (adjustmentId) =>
  useQuery({
    queryKey: inventoryKeys.adjustmentDetail(adjustmentId),
    queryFn:  () => getInventoryAdjustmentDetail(adjustmentId),
    enabled:  !!adjustmentId,
    ...BASE,
  })

// Both mutations invalidate every 'inventory'-prefixed query on success —
// an adjustment/opname can affect the dashboard, the product overview
// list, the product/batch detail (quantityRemaining, freshness/status),
// AND the adjustments ledger simultaneously, so a broad invalidation
// (rather than five separate narrow ones) is the correct, non-duplicative
// choice here.

export const useCreateInventoryAdjustment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => createInventoryAdjustment(payload),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: inventoryKeys.all() }),
  })
}

export const useCreateStockOpname = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => createStockOpname(payload),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: inventoryKeys.all() }),
  })
}