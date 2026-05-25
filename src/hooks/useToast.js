// src/hooks/useToast.js
import { create } from 'zustand'

let toastId = 0

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ type = 'success', title, description, duration = 4000 }) => {
    const id = ++toastId
    set((s) => ({
      toasts: [...s.toasts, { id, type, title, description }],
    }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

const useToast = () => {
  const addToast = useToastStore((s) => s.addToast)
  return {
    success: (title, description) => addToast({ type: 'success', title, description }),
    error:   (title, description) => addToast({ type: 'error',   title, description }),
    info:    (title, description) => addToast({ type: 'info',    title, description }),
  }
}

export default useToast