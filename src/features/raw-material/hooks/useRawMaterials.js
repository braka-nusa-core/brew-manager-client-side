// src/features/raw-material/hooks/useRawMaterials.js
// TanStack Query hooks for raw material data.
// Mirrors src/features/product/hooks/useProducts.js exactly (minus the
// margin-specific query, which has no RawMaterial equivalent).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRawMaterials,
  getRawMaterial,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
} from '../api/rawMaterialApi'

// ── Query key factory ─────────────────────────────────────────

export const rawMaterialKeys = {
  all:    () => ['rawMaterials'],
  lists:  () => ['rawMaterials', 'list'],
  list:   (params) => ['rawMaterials', 'list', params],
  detail: (id)    => ['rawMaterials', 'detail', id],
}

// ── useRawMaterials — paginated list ──────────────────────────

export const useRawMaterials = (params) =>
  useQuery({
    queryKey:        rawMaterialKeys.list(params),
    queryFn:         () => getRawMaterials(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

// ── useRawMaterial — single record ────────────────────────────

export const useRawMaterial = (rawMaterialId) =>
  useQuery({
    queryKey:  rawMaterialKeys.detail(rawMaterialId),
    queryFn:   () => getRawMaterial(rawMaterialId),
    enabled:   !!rawMaterialId,
    staleTime: 1000 * 60 * 5,
  })

// ── useCreateRawMaterial ───────────────────────────────────────

export const useCreateRawMaterial = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRawMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rawMaterialKeys.lists() })
    },
  })
}

// ── useUpdateRawMaterial ───────────────────────────────────────

export const useUpdateRawMaterial = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rawMaterialId, payload }) => updateRawMaterial(rawMaterialId, payload),
    onSuccess: (_, { rawMaterialId }) => {
      queryClient.invalidateQueries({ queryKey: rawMaterialKeys.lists() })
      queryClient.invalidateQueries({ queryKey: rawMaterialKeys.detail(rawMaterialId) })
    },
  })
}

// ── useDeleteRawMaterial ────────────────────────────────────────

export const useDeleteRawMaterial = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRawMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rawMaterialKeys.lists() })
    },
  })
}