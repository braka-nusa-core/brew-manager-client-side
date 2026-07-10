// src/features/bikeAssignment/hooks/useBikeAssignments.js
// TanStack Query hooks for Bike Assignment data.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getActiveAssignments,
  getAssignments,
  createAssignment,
  endAssignment,
} from '../api/bikeAssignmentApi'

// ── Query key factory ─────────────────────────────────────────

export const bikeAssignmentKeys = {
  all:    () => ['bikeAssignments'],
  active: () => ['bikeAssignments', 'active'],
  lists:  () => ['bikeAssignments', 'list'],
  list:   (params) => ['bikeAssignments', 'list', params],
}

// ── useActiveAssignments ──────────────────────────────────────
// GET /bike-assignments/active — denormalized, no pagination, no _id.
// Short staleTime — operational data that changes on assign/end.

export const useActiveAssignments = () =>
  useQuery({
    queryKey:  bikeAssignmentKeys.active(),
    queryFn:   getActiveAssignments,
    staleTime: 1000 * 60, // 1 min
  })

// ── useBikeAssignments — paginated list ───────────────────────

export const useBikeAssignments = (params) =>
  useQuery({
    queryKey:        bikeAssignmentKeys.list(params),
    queryFn:         () => getAssignments(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

// ── useCreateAssignment ───────────────────────────────────────

export const useCreateAssignment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bikeAssignmentKeys.active() })
      queryClient.invalidateQueries({ queryKey: bikeAssignmentKeys.lists() })
    },
  })
}

// ── useEndAssignment ──────────────────────────────────────────

export const useEndAssignment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: endAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bikeAssignmentKeys.active() })
      queryClient.invalidateQueries({ queryKey: bikeAssignmentKeys.lists() })
    },
  })
}