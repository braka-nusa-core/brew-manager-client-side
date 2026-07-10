// src/features/auth/components/ChangePasswordModal.jsx
// Self-service password change. Available to any logged-in user.
// Backend: PATCH /auth/change-password { currentPassword, newPassword }
//   401 → wrong current password
//   400 → newPassword equals currentPassword (or other validation)

import { useState }            from 'react'
import { Loader2, Lock }       from 'lucide-react'
import Modal                   from '@/components/shared/Modal'
import FormField, { Input }    from '@/components/shared/FormField'
import { useChangePassword }   from '../hooks/useAuth'
import useToast                from '@/hooks/useToast'
import { cn }                  from '@/lib/utils'

const ChangePasswordModal = ({ open, onClose }) => {
  const toast    = useToast()
  const mutation = useChangePassword()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors,     setFieldErrors]     = useState({})

  const reset = () => {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setFieldErrors({})
  }

  const handleClose = () => { reset(); onClose() }

  const validate = () => {
    const errs = {}
    if (!currentPassword)          errs.current  = 'Current password is required'
    if (newPassword.length < 8)    errs.new      = 'Password must be at least 8 characters'
    if (newPassword === currentPassword && newPassword) errs.new = 'New password must differ from current'
    if (newPassword !== confirmPassword) errs.confirm = 'Passwords do not match'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})

    mutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success('Password changed', 'Your password has been updated successfully.')
          handleClose()
        },
        onError: (err) => {
          const status = err?.response?.status
          const msg    = err?.response?.data?.message ?? 'Please try again.'
          if (status === 401) {
            setFieldErrors({ current: 'Current password is incorrect' })
          } else {
            toast.error('Password change failed', msg)
          }
        },
      }
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Change Password" size="sm"
      description="Enter your current password and choose a new one.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">

          <FormField label="Current Password" error={fieldErrors.current} required>
            <Input type="password" value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setFieldErrors((p) => ({ ...p, current: undefined })) }}
              placeholder="Your current password"
              error={!!fieldErrors.current} disabled={mutation.isPending} />
          </FormField>

          <FormField label="New Password" error={fieldErrors.new} required>
            <Input type="password" value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((p) => ({ ...p, new: undefined })) }}
              placeholder="Min 8 characters"
              error={!!fieldErrors.new} disabled={mutation.isPending} />
          </FormField>

          <FormField label="Confirm New Password" error={fieldErrors.confirm} required>
            <Input type="password" value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirm: undefined })) }}
              placeholder="Repeat new password"
              error={!!fieldErrors.confirm} disabled={mutation.isPending} />
          </FormField>

        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button type="button" onClick={handleClose} disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending}
            className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors disabled:opacity-60')}>
            {mutation.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Changing…</>
              : <><Lock className="w-3.5 h-3.5" />Change Password</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ChangePasswordModal