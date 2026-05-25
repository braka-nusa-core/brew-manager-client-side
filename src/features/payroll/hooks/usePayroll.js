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

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payrolls'],
      })
    },
  })
}

export const useApprovePayroll = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: approvePayroll,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payrolls'],
      })
    },
  })
}

export const useRejectPayroll = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rejectPayroll,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payrolls'],
      })
    },
  })
}

export const useMarkPayrollPaid = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markPayrollPaid,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payrolls'],
      })
    },
  })
}