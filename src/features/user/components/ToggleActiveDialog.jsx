// src/features/user/components/ToggleActiveDialog.jsx
// Confirm toggling a user account's isActive flag.
// Backend prevents self-deactivation (400) — surfaced if somehow triggered.

import { Loader2, UserX, UserCheck } from 'lucide-react'
import Modal                         from '@/components/shared/Modal'
import { useToggleUserActive }       from '../hooks/useUsers'
import useToast                      from '@/hooks/useToast'
import { cn }                        from '@/lib/utils'

const ToggleActiveDialog = ({ open, onClose, user }) => {
  const toast     = useToast()
  const mutation  = useToggleUserActive()

  const isActivating = !user?.isActive // flipping from inactive → active

  const handleConfirm = () => {
    if (!user) return
    mutation.mutate(user._id, {
      onSuccess: (updated) => {
        toast.success(updated.isActive ? 'User activated' : 'User deactivated',
          `${user.name}'s account is now ${updated.isActive ? 'active' : 'inactive'}.`)
        onClose()
      },
      onError: (err) => {
        toast.error('Action failed', err?.response?.data?.message ?? 'Please try again.')
      },
    })
  }

  if (!user) return null

  return (
    <Modal open={open} onClose={onClose} size="sm"
      title={isActivating ? 'Activate Account' : 'Deactivate Account'}>
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
            isActivating ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-amber-100 dark:bg-amber-950/40'
          )}>
            {isActivating
              ? <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              : <UserX     className="w-5 h-5 text-amber-600  dark:text-amber-400" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isActivating ? 'Activate' : 'Deactivate'}{' '}
              <span className="font-semibold">{user.name}</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isActivating
                ? 'This user will be able to log in again.'
                : 'This user will be immediately unable to log in. Their data is preserved.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={mutation.isPending}
            className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-60',
              isActivating
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white')}>
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mutation.isPending
              ? (isActivating ? 'Activating…' : 'Deactivating…')
              : (isActivating ? 'Activate'   : 'Deactivate')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ToggleActiveDialog