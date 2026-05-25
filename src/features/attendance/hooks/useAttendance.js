// src/features/attendance/hooks/useAttendance.js
// TanStack Query hooks for attendance data.
// Pages and components ONLY import from here — never from attendanceApi directly.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAttendances,
  getAttendance,
  createAttendance,
  bulkCreateAttendance,
  updateAttendance,
  deleteAttendance,
} from '../api/attendanceApi'

// ── Query key factory ─────────────────────────────────────────

export const attendanceKeys = {
  all:    () => ['attendance'],
  lists:  () => ['attendance', 'list'],
  list:   (params) => ['attendance', 'list', params],
  detail: (id)    => ['attendance', 'detail', id],
}

// ── useAttendances — paginated list ───────────────────────────

/**
 * @param {{
 *   page?: number,
 *   limit?: number,
 *   employeeId?: string,
 *   outletId?: string,
 *   status?: string,
 *   startDate?: string,
 *   endDate?: string
 * }} params
 */
export const useAttendances = (params) =>
  useQuery({
    queryKey:        attendanceKeys.list(params),
    queryFn:         () => getAttendances(params),
    placeholderData: (prev) => prev,  // no flash on filter/page change
    staleTime:       1000 * 60 * 2,   // 2 min
  })

// ── useAttendance — single record ─────────────────────────────

export const useAttendance = (attendanceId) =>
  useQuery({
    queryKey:  attendanceKeys.detail(attendanceId),
    queryFn:   () => getAttendance(attendanceId),
    enabled:   !!attendanceId,
    staleTime: 1000 * 60 * 5,
  })

// ── useCreateAttendance ───────────────────────────────────────

export const useCreateAttendance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })
    },
  })
}

// ── useBulkCreateAttendance ───────────────────────────────────

export const useBulkCreateAttendance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkCreateAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })
    },
  })
}

// ── useUpdateAttendance ───────────────────────────────────────
// Only status and notes are mutable — backend enforces this.

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ attendanceId, payload }) => updateAttendance(attendanceId, payload),
    onSuccess: (_, { attendanceId }) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: attendanceKeys.detail(attendanceId) })
    },
  })
}

// ── useDeleteAttendance ───────────────────────────────────────
// Hard delete — used for corrections. Re-submit after deleting.

export const useDeleteAttendance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })
    },
  })
}