// src/features/user/hooks/useUsers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserActive,
  resetUserPassword,
} from '../api/userApi'

export const userKeys = {
  all:    () => ['users'],
  lists:  () => ['users', 'list'],
  list:   (params) => ['users', 'list', params],
}

export const useUsers = (params) =>
  useQuery({
    queryKey:        userKeys.list(params),
    queryFn:         () => getUsers(params),
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 2,
  })

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }) => updateUser(userId, payload),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
  })
}

export const useToggleUserActive = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleUserActive,
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
  })
}

export const useResetUserPassword = () =>
  useMutation({
    mutationFn: ({ userId, newPassword }) => resetUserPassword(userId, newPassword),
  })