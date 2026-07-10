// src/features/subscription/api/subscriptionApi.js
// Plans, Subscriptions, and Upgrade Requests HTTP calls.
//
// Plans:
//   GET  /plans        — PUBLIC (no auth)
//   GET  /plans/:id    — PUBLIC
//   POST /plans        — MANAGE_PLANS (super_admin)
//   PATCH /plans/:id   — MANAGE_PLANS (super_admin)
//   PATCH /plans/:id/toggle-active — MANAGE_PLANS (super_admin)
//
// Subscriptions:
//   GET  /subscriptions/my        — VIEW_SUBSCRIPTIONS (tenant_admin)
//   GET  /subscriptions           — MANAGE_SUBSCRIPTIONS (super_admin)
//   POST /subscriptions           — MANAGE_SUBSCRIPTIONS (super_admin)
//   GET  /subscriptions/:tenantId — MANAGE_SUBSCRIPTIONS (super_admin)
//   PATCH /subscriptions/:tenantId — MANAGE_SUBSCRIPTIONS (super_admin)
//
// Upgrade Requests:
//   POST  /upgrade-requests             — MANAGE_UPGRADE_REQUESTS (tenant_admin + super_admin)
//   GET   /upgrade-requests             — MANAGE_UPGRADE_REQUESTS (tenant_admin sees own; super_admin sees all)
//   PATCH /upgrade-requests/:id/approve — MANAGE_SUBSCRIPTIONS (super_admin)
//   PATCH /upgrade-requests/:id/reject  — MANAGE_SUBSCRIPTIONS (super_admin)

import apiClient from '@/lib/axios'
import axios     from 'axios'

const cleanParams = (p) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== '' && v !== null))

// ── Plans (public reads) ──────────────────────────────────────

export const getPlans = async (params = {}) => {
  // Public endpoint — use raw axios (no auth header needed or leaked)
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL}/plans`,
    { params: cleanParams(params) }
  )
  return data // { success, data: Plan[], pagination }
}

export const getPlanById = async (planId) => {
  const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/plans/${planId}`)
  return data.data
}

export const createPlan = async (payload) => {
  const { data } = await apiClient.post('/plans', payload)
  return data.data
}

export const updatePlan = async (planId, payload) => {
  const { data } = await apiClient.patch(`/plans/${planId}`, payload)
  return data.data
}

export const togglePlanActive = async (planId) => {
  const { data } = await apiClient.patch(`/plans/${planId}/toggle-active`)
  return data.data
}

// ── Subscriptions ─────────────────────────────────────────────

export const getMySubscription = async () => {
  const { data } = await apiClient.get('/subscriptions/my')
  return data.data
}

export const getAllSubscriptions = async (params = {}) => {
  const { data } = await apiClient.get('/subscriptions', { params: cleanParams(params) })
  return data
}

export const createSubscription = async (payload) => {
  const { data } = await apiClient.post('/subscriptions', payload)
  return data.data
}

export const updateSubscription = async (tenantId, payload) => {
  const { data } = await apiClient.patch(`/subscriptions/${tenantId}`, payload)
  return data.data
}

// ── Upgrade Requests ──────────────────────────────────────────

export const submitUpgradeRequest = async (payload) => {
  // payload: { toPlanId, reason? }
  const { data } = await apiClient.post('/upgrade-requests', payload)
  return data.data
}

export const getUpgradeRequests = async (params = {}) => {
  const { data } = await apiClient.get('/upgrade-requests', { params: cleanParams(params) })
  return data
}

export const approveUpgradeRequest = async (requestId, payload = {}) => {
  // payload: { adminNotes?, maintenanceUntil? }
  const { data } = await apiClient.patch(`/upgrade-requests/${requestId}/approve`, payload)
  return data.data
}

export const rejectUpgradeRequest = async (requestId, payload = {}) => {
  // payload: { adminNotes? }
  const { data } = await apiClient.patch(`/upgrade-requests/${requestId}/reject`, payload)
  return data.data
}