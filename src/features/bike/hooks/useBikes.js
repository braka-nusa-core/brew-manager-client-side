// src/features/bike/hooks/useBikes.js
// TanStack Query hooks for Bike data.
// Components and pages import exclusively from here.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBikes,
  getBike,
  createBike,
  updateBike,
  updateBikeStatus,
  deleteBike,
} from '../api/bikeApi'

// ── Query key factory ─────────────────────────────────────────

export const bikeKeys = {
  all:    () => ['bikes'],
  lists:  () => ['bikes', 'list'],
  list:   (params) => ['bikes', 'list', params],
  detail: (id)    => ['bikes', 'detail', id],
}

// ── useBikes — paginated list ─────────────────────────────────

export const useBikes = (params) =>
  useQuery({
    queryKey:        bikeKeys.list(params),
    queryFn:         () => getBikes(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

// ── useBike — single record ───────────────────────────────────

export const useBike = (bikeId) =>
  useQuery({
    queryKey:  bikeKeys.detail(bikeId),
    queryFn:   () => getBike(bikeId),
    enabled:   !!bikeId,
    staleTime: 1000 * 60 * 5,
  })

// ── useCreateBike ─────────────────────────────────────────────

export const useCreateBike = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBike,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bikeKeys.lists() })
    },
  })
}

// ── useUpdateBike ─────────────────────────────────────────────

export const useUpdateBike = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bikeId, payload }) => updateBike(bikeId, payload),
    onSuccess: (_, { bikeId }) => {
      queryClient.invalidateQueries({ queryKey: bikeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: bikeKeys.detail(bikeId) })
    },
  })
}

// ── useUpdateBikeStatus ───────────────────────────────────────
// Dedicated mutation for PATCH /:bikeId/status only.
// Setting ACTIVE can fail (400) when unresolved damage reports exist.

export const useUpdateBikeStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bikeId, status }) => updateBikeStatus(bikeId, status),
    onSuccess: (_, { bikeId }) => {
      queryClient.invalidateQueries({ queryKey: bikeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: bikeKeys.detail(bikeId) })
    },
  })
}

// ── useDeleteBike ─────────────────────────────────────────────
// Soft delete — sets isActive: false. Record is preserved.

export const useDeleteBike = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBike,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bikeKeys.lists() })
    },
  })
}