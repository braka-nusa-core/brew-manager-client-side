// src/features/sales/hooks/useSales.js
// TanStack Query hooks for sales data.
// Pages and components ONLY import from here — never from salesApi directly.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
} from '../api/salesApi'

// ── Query key factory ─────────────────────────────────────────
// Follows the exact same shape used in employeeKeys and attendanceKeys.

export const salesKeys = {
  all:    () => ['sales'],
  lists:  () => ['sales', 'list'],
  list:   (params) => ['sales', 'list', params],
  detail: (id)    => ['sales', 'detail', id],
}

// ── useSales — paginated list ─────────────────────────────────

/**
 * @param {{\
 *   page?: number,
 *   limit?: number,
 *   outletId?: string,
 *   employeeId?: string,
 *   paymentMethod?: string,
 *   startDate?: string,
 *   endDate?: string,
 * }} params
 */
export const useSales = (params) =>
  useQuery({
    queryKey:        salesKeys.list(params),
    queryFn:         () => getSales(params),
    placeholderData: (prev) => prev,  // no flash on filter/page change
    staleTime:       1000 * 60 * 2,   // 2 min
  })

// ── useSale — single record ───────────────────────────────────

export const useSale = (saleId) =>
  useQuery({
    queryKey:  salesKeys.detail(saleId),
    queryFn:   () => getSale(saleId),
    enabled:   !!saleId,
    staleTime: 1000 * 60 * 5,
  })

// ── useCreateSale ─────────────────────────────────────────────

export const useCreateSale = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
    },
  })
}

// ── useUpdateSale ─────────────────────────────────────────────

export const useUpdateSale = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ saleId, payload }) => updateSale(saleId, payload),
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(saleId) })
    },
  })
}

// ── useDeleteSale ─────────────────────────────────────────────

export const useDeleteSale = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
    },
  })
}