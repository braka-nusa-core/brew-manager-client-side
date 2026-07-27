// src/features/payroll/hooks/usePayroll.js

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  generatePayroll,
  getPayrolls,
  getPayroll,
  adjustPayroll,
  approvePayroll,
  rejectPayroll,
  markPayrollPaid,
} from '../api/payrollApi'

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

export const useGetPayrolls = (params = {}) => {
  return useQuery({
    queryKey: ['payrolls', params],
    queryFn: () => getPayrolls(params),
  })
}

export const usePayroll = (payrollId, options = {}) => {
  return useQuery({
    queryKey: ['payroll', payrollId],
    queryFn: () => getPayroll(payrollId),
    enabled: !!payrollId,
    ...options,
  })
}

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

export const useGeneratePayroll = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generatePayroll,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payrolls'],
      })
    },
  })
}

export const useAdjustPayroll = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ payrollId, payload }) =>
      adjustPayroll(payrollId, payload),

    // Sprint 8.2.6a: also invalidate the single-record query so
    // PayrollDetailModal (now fetching live via usePayroll) refreshes.
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] })
      queryClient.invalidateQueries({ queryKey: ['payroll', variables.payrollId] })
    },
  })
}

export const useApprovePayroll = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: approvePayroll,

    onSuccess: (_data, payrollId) => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] })
      queryClient.invalidateQueries({ queryKey: ['payroll', payrollId] })
    },
  })
}

export const useRejectPayroll = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rejectPayroll,

    onSuccess: (_data, payrollId) => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] })
      queryClient.invalidateQueries({ queryKey: ['payroll', payrollId] })
    },
  })
}

export const useMarkPayrollPaid = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markPayrollPaid,

    onSuccess: (_data, payrollId) => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] })
      queryClient.invalidateQueries({ queryKey: ['payroll', payrollId] })
    },
  })
}