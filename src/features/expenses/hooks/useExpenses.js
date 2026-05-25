// src/features/expenses/hooks/useExpenses.js
// TanStack Query hooks for expense data.
// Follows the exact same query key factory pattern as useSales, useAttendance, etc.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../api/expensesApi'

// ── Query key factory ─────────────────────────────────────────

export const expenseKeys = {
  all:    () => ['expenses'],
  lists:  () => ['expenses', 'list'],
  list:   (params) => ['expenses', 'list', params],
  detail: (id)    => ['expenses', 'detail', id],
}

// ── useExpenses — paginated list ──────────────────────────────

/**
 * @param {{
 *   page?: number,
 *   limit?: number,
 *   outletId?: string,
 *   category?: string,
 *   startDate?: string,
 *   endDate?: string,
 * }} params
 */
export const useExpenses = (params) =>
  useQuery({
    queryKey:        expenseKeys.list(params),
    queryFn:         () => getExpenses(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

// ── useExpense — single record ────────────────────────────────

export const useExpense = (expenseId) =>
  useQuery({
    queryKey:  expenseKeys.detail(expenseId),
    queryFn:   () => getExpense(expenseId),
    enabled:   !!expenseId,
    staleTime: 1000 * 60 * 5,
  })

// ── useCreateExpense ──────────────────────────────────────────

export const useCreateExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() })
    },
  })
}

// ── useUpdateExpense ──────────────────────────────────────────

export const useUpdateExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ expenseId, payload }) => updateExpense(expenseId, payload),
    onSuccess: (_, { expenseId }) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() })
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(expenseId) })
    },
  })
}

// ── useDeleteExpense ──────────────────────────────────────────

export const useDeleteExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() })
    },
  })
}