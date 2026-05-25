// src/features/employee/hooks/useEmployees.js
// All TanStack Query hooks for employee data.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  toggleEmployeeActive,
  deleteEmployee,
} from '../api/employeeApi'

export const employeeKeys = {
  all:    () => ['employees'],
  lists:  () => ['employees', 'list'],
  list:   (params) => ['employees', 'list', params],
  detail: (id)    => ['employees', 'detail', id],
}

export const useEmployees = (params) =>
  useQuery({
    queryKey:        employeeKeys.list(params),
    queryFn:         () => getEmployees(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

export const useEmployee = (employeeId) =>
  useQuery({
    queryKey:  employeeKeys.detail(employeeId),
    queryFn:   () => getEmployee(employeeId),
    enabled:   !!employeeId,
    staleTime: 1000 * 60 * 5,
  })

export const useCreateEmployee = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, payload }) => updateEmployee(employeeId, payload),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) })
    },
  })
}

export const useToggleEmployeeActive = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleEmployeeActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}