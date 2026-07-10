// src/features/user/components/ResetPasswordDialog.jsx
// Admin action: set a new password for any user in scope.
// Does NOT require the current password (unlike self-service change-password).
// Backend: PATCH /users/:userId/reset-password  body: { newPassword }

import { useState }              from 'react'
import { Loader2, KeyRound }     from 'lucide-react'
import Modal                     from '@/components/shared/Modal'
import FormField, { Input }      from '@/components/shared/FormField'
import { useResetUserPassword }  from '../hooks/useUsers'
import useToast                  from '@/hooks/useToast'
import { cn }                    from '@/lib/utils'

const ResetPasswordDialog = ({ open, onClose, user }) => {
  const toast   = useToast()
  const mutation = useResetUserPassword()
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                 = useState('')

  const handleClose = () => { setNewPassword(''); setConfirmPassword(''); setError(''); onClose() }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }

    mutation.mutate(
      { userId: user._id, newPassword },
      {
        onSuccess: () => {
          toast.success('Password reset', `Password for ${user.name} has been updated.`)
          handleClose()
        },
        onError: (err) => {
          toast.error('Reset failed', err?.response?.data?.message ?? 'Please try again.')
        },
      }
    )
  }

  if (!user) return null

  return (
    <Modal open={open} onClose={handleClose} title="Reset Password" size="sm"
      description={`Set a new password for ${user.name}. The user will need to be informed out-of-band.`}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 text-sm">
            <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <FormField label="New Password" error={error && !confirmPassword ? error : undefined} required>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError('') }}
              placeholder="Min 8 characters"
              disabled={mutation.isPending}
              error={!!error}
            />
          </FormField>

          <FormField label="Confirm Password" error={confirmPassword && error ? error : undefined} required>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
              placeholder="Repeat new password"
              disabled={mutation.isPending}
              error={!!error}
            />
          </FormField>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button type="button" onClick={handleClose} disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending}
            className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors disabled:opacity-60')}>
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mutation.isPending ? 'Resetting…' : 'Reset Password'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ResetPasswordDialog