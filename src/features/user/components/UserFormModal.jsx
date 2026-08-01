// src/features/user/components/UserFormModal.jsx
// Create + Edit user accounts.
//
// CREATE: name, email, password, role (manager|cashier|viewer), outletId
//   - All creatable roles require outletId (outlet-scoped by design)
//   - Role is locked after creation — immutable per backend contract
//   - tenant_admin cannot create another tenant_admin (backend 403 — display as error)
//   - Plan limit enforced by backend (409 if maxAdmins exceeded)
//
// EDIT: name, email, outletId only
//   - role: NOT shown — cannot be changed
//   - password: NOT shown — use ResetPasswordDialog instead

import { useEffect, useState }           from 'react'
import { useForm, Controller }           from 'react-hook-form'
import { zodResolver }                   from '@hookform/resolvers/zod'
import { z }                             from 'zod'
import { Loader2 }                       from 'lucide-react'

import Modal                             from '@/components/shared/Modal'
import FormField, { Input }              from '@/components/shared/FormField'
import AsyncSearchSelect                 from '@/components/shared/AsyncSearchSelect'
import { useCreateUser, useUpdateUser }  from '../hooks/useUsers'
import { useOutlets }                    from '@/features/outlets/hooks/useOutlets'
import useToast                          from '@/hooks/useToast'
import useDebounce                       from '@/hooks/useDebounce'
import useEntityMap                      from '@/hooks/useEntityMap'
import { CREATABLE_ROLES }               from './UserRoleBadge'
import { cn }                            from '@/lib/utils'

const OBJECT_ID_RE = /^[a-f\d]{24}$/i
const EMAIL_RE     = /^\S+@\S+\.\S+$/

const createSchema = z.object({
  name:     z.string().min(2, 'Nama harus terdiri minimal 2 karakter.').max(100),
  email:    z.string().regex(EMAIL_RE, 'Masukkan alamat email yang valid'),
  password: z.string().min(8, 'Kata sandi harus terdiri minimal 8 karakter.'),
  role:     z.enum(CREATABLE_ROLES, { errorMap: () => ({ message: 'Pilih role' }) }),
  outletId: z.string().regex(OBJECT_ID_RE, 'Pilih outlet'),
})

const editSchema = z.object({
  name:     z.string().min(2, 'Nama harus terdiri minimal 2 karakter.').max(100).optional().or(z.literal('')),
  email:    z.string().regex(EMAIL_RE, 'Masukkan alamat email yang valid').optional().or(z.literal('')),
  outletId: z.string().regex(OBJECT_ID_RE).optional().or(z.literal('')),
})

const cleanPayload = (data) =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null))

const getCreateDefaults = () => ({ name: '', email: '', password: '', role: '', outletId: '' })
const getEditDefaults   = (u)  => ({
  name:     u?.name     ?? '',
  email:    u?.email    ?? '',
  outletId: u?.outletId?.toString?.() ?? u?.outletId ?? '',
})

const ROLE_LABELS = { manager: 'Manajer', cashier: 'Kasir', viewer: 'Pengawas' }

const UserFormModal = ({ open, onClose, user = null }) => {
  const isEdit = Boolean(user)
  const toast  = useToast()

  const [outletSearch, setOutletSearch] = useState('')
  const debouncedOutletSearch           = useDebounce(outletSearch, 300)
  const { outletMap }                   = useEntityMap()

  const { data: outletsData, isLoading: outletsLoading } = useOutlets(
    { search: debouncedOutletSearch, isActive: true, limit: 20 },
    { enabled: open }
  )
  const outlets = outletsData?.data ?? []

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(user) : getCreateDefaults(),
  })

  const selectedRole = watch('role')

  useEffect(() => {
    if (!open) return
    reset(isEdit ? getEditDefaults(user) : getCreateDefaults())
    setOutletSearch('')
  }, [open, isEdit, user, reset])

  const currentOutletName = isEdit && user
    ? outletMap.get(user.outletId?.toString?.() ?? user.outletId)?.name ?? '—'
    : null

  const onSubmit = (data) => {
    if (isEdit) {
      const { outletId, ...rest } = data
      const payload = cleanPayload(rest)
      if (outletId) payload.outletId = outletId
      else if (outletId === '') payload.outletId = null

      updateMutation.mutate({ userId: user._id, payload }, {
        onSuccess: () => { toast.success('Pengguna diperbarui'); onClose() },
        onError:   (err) => {
          const msg = err?.response?.data?.message ?? 'Coba lagi!'
          toast.error(err?.response?.status === 409 ? 'Email sudah digunakan' : 'Update gagal!', msg)
        },
      })
    } else {
      createMutation.mutate(data, {
        onSuccess: () => { toast.success('Pengguna Dibuat', `${data.name} Sekarang bisa masuk.`); onClose() },
        onError:   (err) => {
          const status = err?.response?.status
          const msg    = err?.response?.data?.message ?? 'Coba lagi!'
          // Backend returns 403 for both role-escalation and plan-limit
          // rejections (checkPlanLimit never returns 429) — distinguish
          // using the message text, which is the only differentiator.
          const isPlanLimit = status === 403 && /plan limit reached/i.test(msg)
          const title  = status === 409 ? 'Email sudah digunakan'
                       : isPlanLimit     ? 'Batas rencana telah tercapai'
                       : status === 403  ? 'Izin ditolak'
                       : 'Gagal membuat pengguna'
          toast.error(title, msg)
        },
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Create User'}
      description={
        isEdit
          ? 'Perbarui nama, email, atau penugasan outlet. Role tidak dapat diubah setelah pembuatan.'
          : 'Buat akun login. Semua role (manajer, kasir, pengawas) memerlukan outlet.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          <FormField label="Full Name" error={errors.name?.message} required>
            <Input {...register('name')} placeholder="e.g. Budi Santoso" error={!!errors.name} disabled={isPending} />
          </FormField>

          <FormField label="Email" error={errors.email?.message} required>
            <Input {...register('email')} type="email" placeholder="e.g. budi@example.com" error={!!errors.email} disabled={isPending} />
          </FormField>

          {/* Password — create only */}
          {!isEdit && (
            <FormField label="Password" error={errors.password?.message} required>
              <Input {...register('password')} type="password" placeholder="Minimal 8 karakter" error={!!errors.password} disabled={isPending} />
            </FormField>
          )}

          {/* Role — create only (immutable after) */}
          {!isEdit && (
            <FormField label="Role" error={errors.role?.message} required>
              <select
                {...register('role')}
                disabled={isPending}
                className={cn(
                  'w-full h-10 px-3 rounded-md border bg-background text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                  'disabled:opacity-50 transition-colors',
                  errors.role ? 'border-destructive' : 'border-input'
                )}
              >
                <option value="">Select a role…</option>
                {CREATABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </FormField>
          )}

          {/* Edit: show current role read-only */}
          {isEdit && user && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium text-foreground capitalize">{user.role?.replace('_', ' ') ?? '—'}</span>
            </div>
          )}

          {/* Outlet selector */}
          <FormField
            label="Outlet"
            error={errors.outletId?.message}
            required={!isEdit}
          >
            <Controller
              control={control}
              name="outletId"
              render={({ field }) => (
                <AsyncSearchSelect
                  value={field.value}
                  onChange={field.onChange}
                  items={outlets}
                  getLabel={(o) => o.name}
                  getValue={(o) => o._id}
                  onSearchChange={setOutletSearch}
                  isLoading={outletsLoading}
                  placeholder={isEdit && currentOutletName ? currentOutletName : 'Mencari outlet...'}
                  error={!!errors.outletId}
                  disabled={isPending}
                  emptyMessage={debouncedOutletSearch ? `Tidak ada outlet yang cocok "${debouncedOutletSearch}"` : 'Tidak ditemukan outlet aktif.'}
                />
              )}
            />
          </FormField>

        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50">
            Batal
          </button>
          <button type="submit" disabled={isPending}
            className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors disabled:opacity-60')}>
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending ? (isEdit ? 'Menyimpan…' : 'Membuat…') : (isEdit ? 'Simpan Perubahan' : 'Membuat Pengguna')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UserFormModal