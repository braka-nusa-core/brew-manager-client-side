// src/features/production/hooks/useProduction.js
//
// Sprint 8.1 — Production Module.
// Pattern follows features/inventory/hooks/useInventory.js exactly.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createProduction, getProductionList, getProductionDetail, getProductionDashboard } from '../api/productionApi'
import { inventoryKeys } from '@/features/inventory/hooks/useInventory'

export const productionKeys = {
  all:       () => ['production'],
  dashboard: (p) => ['production', 'dashboard', p],
  list:      (p) => ['production', 'list', p],
  detail:    (id) => ['production', 'detail', id],
}

const BASE = { staleTime: 1000 * 60 * 3, retry: 1 }

export const useProductionDashboard = (p = {}) =>
  useQuery({ queryKey: productionKeys.dashboard(p), queryFn: () => getProductionDashboard(p), ...BASE })

export const useProductionList = (p = {}) =>
  useQuery({ queryKey: productionKeys.list(p), queryFn: () => getProductionList(p), ...BASE })

export const useProductionDetail = (productionId) =>
  useQuery({
    queryKey: productionKeys.detail(productionId),
    queryFn:  () => getProductionDetail(productionId),
    enabled:  !!productionId,
    ...BASE,
  })

// On success: invalidate BOTH production and inventory queries — a new
// production batch changes InventoryBatch/InventoryTransaction state that
// the Inventory Dashboard/List/Product/Batch pages all read, so those
// must refresh too, not just the production list itself.
export const useCreateProduction = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => createProduction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionKeys.all() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all() })
    },
  })
}