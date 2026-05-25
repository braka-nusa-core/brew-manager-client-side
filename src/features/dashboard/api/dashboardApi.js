// src/features/dashboard/api/dashboardApi.js
import apiClient from '@/lib/axios'

export const getDashboardSummary = async (params = {}) => {
  const { data } = await apiClient.get('/dashboard/summary', { params })
  return data.data
}

export const getSalesTrend = async (params = {}) => {
  const { data } = await apiClient.get('/dashboard/sales-trend', { params })
  return data.data
}

export const getExpenseTrend = async (params = {}) => {
  const { data } = await apiClient.get('/dashboard/expense-trend', { params })
  return data.data
}

export const getAttendanceSummary = async (params = {}) => {
  const { data } = await apiClient.get('/dashboard/attendance-summary', { params })
  return data.data
}

export const getEmployeePerformance = async (params = {}) => {
  const { data } = await apiClient.get('/dashboard/employee-performance', { params })
  return data.data
}