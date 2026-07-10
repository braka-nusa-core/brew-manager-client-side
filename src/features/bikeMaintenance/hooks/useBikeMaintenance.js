// src/features/bikeMaintenance/hooks/useBikeMaintenance.js
// TanStack Query hooks for BikeDamageReport and BikeRepairRecord.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDamageReports,
  createDamageReport,
  updateDamageReportStatus,
  getRepairRecords,
  createRepairRecord,
  updateRepairRecord,
} from '../api/bikeMaintenanceApi'

// ── Query key factories ───────────────────────────────────────

export const damageReportKeys = {
  all:    () => ['damageReports'],
  lists:  () => ['damageReports', 'list'],
  list:   (params) => ['damageReports', 'list', params],
}

export const repairRecordKeys = {
  all:    () => ['repairRecords'],
  lists:  () => ['repairRecords', 'list'],
  list:   (params) => ['repairRecords', 'list', params],
}

// ── Damage Report queries ─────────────────────────────────────

export const useDamageReports = (params) =>
  useQuery({
    queryKey:        damageReportKeys.list(params),
    queryFn:         () => getDamageReports(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

export const useCreateDamageReport = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDamageReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: damageReportKeys.lists() })
    },
  })
}

export const useUpdateDamageReportStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ damageReportId, status }) => updateDamageReportStatus(damageReportId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: damageReportKeys.lists() })
      // Also invalidate bikeKeys since RESOLVED status unblocks bike→ACTIVE transition
      queryClient.invalidateQueries({ queryKey: ['bikes', 'list'] })
    },
  })
}

// ── Repair Record queries ─────────────────────────────────────

export const useRepairRecords = (params) =>
  useQuery({
    queryKey:        repairRecordKeys.list(params),
    queryFn:         () => getRepairRecords(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

export const useCreateRepairRecord = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRepairRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repairRecordKeys.lists() })
    },
  })
}

export const useUpdateRepairRecord = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ repairRecordId, payload }) => updateRepairRecord(repairRecordId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repairRecordKeys.lists() })
    },
  })
}