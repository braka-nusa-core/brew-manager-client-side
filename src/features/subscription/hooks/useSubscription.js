// src/features/subscription/hooks/useSubscription.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPlans, createPlan, updatePlan, togglePlanActive,
  getMySubscription, getAllSubscriptions, createSubscription, updateSubscription,
  submitUpgradeRequest, getUpgradeRequests, approveUpgradeRequest, rejectUpgradeRequest,
} from '../api/subscriptionApi'

// ── Key factories ─────────────────────────────────────────────

export const planKeys = {
  all:   () => ['plans'],
  lists: () => ['plans', 'list'],
  list:  (p) => ['plans', 'list', p],
}

export const subscriptionKeys = {
  all: () => ['subscriptions'],
  my:  () => ['subscriptions', 'my'],
  lists:  () => ['subscriptions', 'list'],
  list:   (p) => ['subscriptions', 'list', p],
}

export const upgradeRequestKeys = {
  all:   () => ['upgradeRequests'],
  lists: () => ['upgradeRequests', 'list'],
  list:  (p) => ['upgradeRequests', 'list', p],
}

// ── Plans ─────────────────────────────────────────────────────

export const usePlans = (params) =>
  useQuery({
    queryKey:  planKeys.list(params),
    queryFn:   () => getPlans(params),
    staleTime: 1000 * 60 * 10, // plans rarely change
  })

export const useCreatePlan = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPlan,
    onSuccess:  () => qc.invalidateQueries({ queryKey: planKeys.lists() }),
  })
}

export const useUpdatePlan = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, payload }) => updatePlan(planId, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: planKeys.lists() }),
  })
}

export const useTogglePlanActive = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: togglePlanActive,
    onSuccess:  () => qc.invalidateQueries({ queryKey: planKeys.lists() }),
  })
}

// ── Subscriptions ─────────────────────────────────────────────

export const useMySubscription = () =>
  useQuery({
    queryKey:  subscriptionKeys.my(),
    queryFn:   getMySubscription,
    staleTime: 1000 * 60 * 5,
  })

export const useAllSubscriptions = (params) =>
  useQuery({
    queryKey:        subscriptionKeys.list(params),
    queryFn:         () => getAllSubscriptions(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

export const useCreateSubscription = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSubscription,
    onSuccess:  () => qc.invalidateQueries({ queryKey: subscriptionKeys.lists() }),
  })
}

export const useUpdateSubscription = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, payload }) => updateSubscription(tenantId, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: subscriptionKeys.lists() })
      qc.invalidateQueries({ queryKey: subscriptionKeys.my() })
    },
  })
}

// ── Upgrade Requests ──────────────────────────────────────────

export const useUpgradeRequests = (params) =>
  useQuery({
    queryKey:        upgradeRequestKeys.list(params),
    queryFn:         () => getUpgradeRequests(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

export const useSubmitUpgradeRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: submitUpgradeRequest,
    onSuccess:  () => qc.invalidateQueries({ queryKey: upgradeRequestKeys.lists() }),
  })
}

export const useApproveUpgradeRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, payload }) => approveUpgradeRequest(requestId, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: upgradeRequestKeys.lists() })
      qc.invalidateQueries({ queryKey: subscriptionKeys.lists() })
      qc.invalidateQueries({ queryKey: subscriptionKeys.my() })
    },
  })
}

export const useRejectUpgradeRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, payload }) => rejectUpgradeRequest(requestId, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: upgradeRequestKeys.lists() }),
  })
}