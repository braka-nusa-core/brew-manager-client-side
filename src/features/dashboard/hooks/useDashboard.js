// src/features/dashboard/hooks/useDashboard.js
import { useQuery } from '@tanstack/react-query'
import {
  getDashboardSummary, getSalesTrend,
  getExpenseTrend, getAttendanceSummary, getEmployeePerformance,
} from '../api/dashboardApi'

export const dashboardKeys = {
  all:         () => ['dashboard'],
  summary:     (p) => ['dashboard', 'summary', p],
  salesTrend:  (p) => ['dashboard', 'sales-trend', p],
  expenseTrend:(p) => ['dashboard', 'expense-trend', p],
  attendance:  (p) => ['dashboard', 'attendance-summary', p],
  performance: (p) => ['dashboard', 'employee-performance', p],
}

const BASE = { staleTime: 1000 * 60 * 3, retry: 1 }

export const useDashboardSummary  = (p = {}) => useQuery({ queryKey: dashboardKeys.summary(p),     queryFn: () => getDashboardSummary(p),   ...BASE })
export const useSalesTrend        = (p = {}) => useQuery({ queryKey: dashboardKeys.salesTrend(p),  queryFn: () => getSalesTrend(p),         ...BASE })
export const useExpenseTrend      = (p = {}) => useQuery({ queryKey: dashboardKeys.expenseTrend(p),queryFn: () => getExpenseTrend(p),       ...BASE })
export const useAttendanceSummary = (p = {}) => useQuery({ queryKey: dashboardKeys.attendance(p),  queryFn: () => getAttendanceSummary(p),  ...BASE })
export const useEmployeePerformance=(p = {}) => useQuery({ queryKey: dashboardKeys.performance(p), queryFn: () => getEmployeePerformance(p), ...BASE })