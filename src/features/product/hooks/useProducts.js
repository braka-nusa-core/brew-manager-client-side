// src/features/product/hooks/useProducts.js
// TanStack Query hooks for product data.
// Follows the exact same query key factory pattern as useEmployees, useExpenses, etc.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProducts,
  getProduct,
  getProductMargin,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../api/productApi'

// ── Query key factory ─────────────────────────────────────────

export const productKeys = {
  all:    () => ['products'],
  lists:  () => ['products', 'list'],
  list:   (params) => ['products', 'list', params],
  detail: (id)    => ['products', 'detail', id],
  margin: (id)    => ['products', 'margin', id],
}

// ── useProducts — paginated list ──────────────────────────────

export const useProducts = (params) =>
  useQuery({
    queryKey:        productKeys.list(params),
    queryFn:         () => getProducts(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

// ── useProduct — single record ────────────────────────────────

export const useProduct = (productId) =>
  useQuery({
    queryKey:  productKeys.detail(productId),
    queryFn:   () => getProduct(productId),
    enabled:   !!productId,
    staleTime: 1000 * 60 * 5,
  })

// ── useProductMargin — single record margin DTO ───────────────

export const useProductMargin = (productId) =>
  useQuery({
    queryKey:  productKeys.margin(productId),
    queryFn:   () => getProductMargin(productId),
    enabled:   !!productId,
    staleTime: 1000 * 60 * 5,
  })

// ── useCreateProduct ───────────────────────────────────────────

export const useCreateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

// ── useUpdateProduct ───────────────────────────────────────────

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, payload }) => updateProduct(productId, payload),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) })
      queryClient.invalidateQueries({ queryKey: productKeys.margin(productId) })
    },
  })
}

// ── useDeleteProduct ───────────────────────────────────────────

export const useDeleteProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.margin(productId) })
    },
  })
}