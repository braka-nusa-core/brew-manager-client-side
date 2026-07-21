// src/features/outlet/hooks/useOutlets.js
// TanStack Query hooks for outlet data.
// Pages and components ONLY import from here — never from outletApi directly.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOutlets,
  createOutlet,
  updateOutlet,
  toggleOutletActive,
  deleteOutlet,
} from '../api/outletApi'

// ── Query key factory ─────────────────────────────────────────

export const outletKeys = {
  all:   () => ['outlets'],
  lists: () => ['outlets', 'list'],
  list:  (params) => ['outlets', 'list', params],
}

// ── useOutlets — paginated list ───────────────────────────────

/**
 * @param {{ page?, limit?, search?, isActive? }} params
 */
export const useOutlets = (params) =>
  useQuery({
    queryKey:        outletKeys.list(params),
    queryFn:         () => getOutlets(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 5, // outlets change rarely — 5min
  })

// ── useCreateOutlet ───────────────────────────────────────────

export const useCreateOutlet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOutlet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletKeys.lists() })
    },
  })
}

// ── useUpdateOutlet ───────────────────────────────────────────

export const useUpdateOutlet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ outletId, payload }) => updateOutlet(outletId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletKeys.lists() })
    },
  })
}

// ── useToggleOutletActive ─────────────────────────────────────

export const useToggleOutletActive = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleOutletActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletKeys.lists() })
    },
  })
}

// ── useDeleteOutlet ───────────────────────────────────────────
// Soft delete — 204 response, record preserved.

export const useDeleteOutlet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteOutlet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outletKeys.lists() })
    },
  })
}