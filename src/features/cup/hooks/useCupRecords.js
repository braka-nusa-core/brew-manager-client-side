// src/features/cup/hooks/useCupRecords.js
// TanStack Query hooks for Cup Record data.
// Pages and components ONLY import from here — never from cupApi directly.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCupRecords,
  getCupRecord,
  createCupRecord,
  updateCupRecord,
  addCupRefill,
  finalizeCupRecord,
  deleteCupRecord,
} from '../api/cupApi'

// ── Query key factory ─────────────────────────────────────────

export const cupRecordKeys = {
  all:    () => ['cupRecords'],
  lists:  () => ['cupRecords', 'list'],
  list:   (params) => ['cupRecords', 'list', params],
  detail: (id)    => ['cupRecords', 'detail', id],
}

// ── useCupRecords — paginated list ──────────────────────────────

export const useCupRecords = (params) =>
  useQuery({
    queryKey:        cupRecordKeys.list(params),
    queryFn:         () => getCupRecords(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

// ── useCupRecord — single record ────────────────────────────────

export const useCupRecord = (cupRecordId) =>
  useQuery({
    queryKey:  cupRecordKeys.detail(cupRecordId),
    queryFn:   () => getCupRecord(cupRecordId),
    enabled:   !!cupRecordId,
    staleTime: 1000 * 60 * 5,
  })

// ── useCreateCupRecord ────────────────────────────────────────

export const useCreateCupRecord = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCupRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cupRecordKeys.lists() })
    },
  })
}

// ── useUpdateCupRecord ────────────────────────────────────────
// Draft records only — backend rejects updates on finalized records (409).

export const useUpdateCupRecord = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cupRecordId, payload }) => updateCupRecord(cupRecordId, payload),
    onSuccess: (_, { cupRecordId }) => {
      queryClient.invalidateQueries({ queryKey: cupRecordKeys.lists() })
      queryClient.invalidateQueries({ queryKey: cupRecordKeys.detail(cupRecordId) })
    },
  })
}

// ── useAddCupRefill ────────────────────────────────────────────
// Each call = one refill event (appended server-side, never overwrites
// prior refills). Draft records only — backend rejects on finalized (409).

export const useAddCupRefill = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cupRecordId, payload }) => addCupRefill(cupRecordId, payload),
    onSuccess: (_, { cupRecordId }) => {
      queryClient.invalidateQueries({ queryKey: cupRecordKeys.lists() })
      queryClient.invalidateQueries({ queryKey: cupRecordKeys.detail(cupRecordId) })
    },
  })
}

// ── useFinalizeCupRecord ──────────────────────────────────────
// Locks the record permanently on success. On failure (400), the error
// response carries a per-product balance breakdown in err.response.data.errors.

export const useFinalizeCupRecord = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: finalizeCupRecord,
    onSuccess: (_, cupRecordId) => {
      queryClient.invalidateQueries({ queryKey: cupRecordKeys.lists() })
      queryClient.invalidateQueries({ queryKey: cupRecordKeys.detail(cupRecordId) })
    },
  })
}

// ── useDeleteCupRecord ────────────────────────────────────────
// Draft records only — backend rejects deletion of finalized records (409).

export const useDeleteCupRecord = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCupRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cupRecordKeys.lists() })
    },
  })
}