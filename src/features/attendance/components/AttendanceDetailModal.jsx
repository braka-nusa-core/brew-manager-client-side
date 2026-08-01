// src/features/attendance/components/AttendanceDetailModal.jsx
// Shows attendance record detail and allows editing status/notes.
// Only status and notes are mutable — backend enforces this.
// Delete action triggers hard-delete (correction flow).

import { useEffect, useState }       from 'react'
import { useForm }                   from 'react-hook-form'
import { zodResolver }               from '@hookform/resolvers/zod'
import { z }                         from 'zod'
import { Loader2, Trash2, Calendar, User, Building2, FileText } from 'lucide-react'

import Modal                         from '@/components/shared/Modal'
import FormField, { Select }         from '@/components/shared/FormField'
import AttendanceStatusBadge, { ATTENDANCE_STATUSES } from './AttendanceStatusBadge'
import { useUpdateAttendance, useDeleteAttendance } from '../hooks/useAttendance'
import useToast                      from '@/hooks/useToast'
import { cn }                        from '@/lib/utils'

// ── Zod schema ────────────────────────────────────────────────

const updateSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'leave', 'holiday'], {
    required_error: 'Status is required',
  }),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
})

// ── Helpers ───────────────────────────────────────────────────

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-GB', {
        weekday: 'long',
        day:     '2-digit',
        month:   'long',
        year:    'numeric',
      })
    : '—'

const formatDateTime = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleString('en-GB', {
        day:    '2-digit',
        month:  'short',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit',
      })
    : '—'

// ── Info Row ──────────────────────────────────────────────────

const InfoRow = ({ icon: Icon, label, value, children }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted shrink-0 mt-0.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children ?? (
        <p className="text-sm font-medium text-foreground mt-0.5 truncate">
          {value ?? '—'}
        </p>
      )}
    </div>
  </div>
)


const AttendanceDetailModal = ({ open, onClose, record, canManage }) => {
  const toast          = useToast()
  const updateMutation = useUpdateAttendance()
  const deleteMutation = useDeleteAttendance()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      status: record?.status ?? 'present',
      notes:  record?.notes  ?? '',
    },
  })

  // Re-populate when record changes or modal opens
  useEffect(() => {
    if (open && record) {
      reset({
        status: record.status ?? 'present',
        notes:  record.notes  ?? '',
      })
      setConfirmDelete(false)
    }
  }, [open, record, reset])

  const watchedStatus = watch('status')

  const onSubmit = (formData) => {
    if (!record) return

    const payload = {}
    if (formData.status !== record.status) payload.status = formData.status
    if ((formData.notes ?? '') !== (record.notes ?? '')) payload.notes = formData.notes || null

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save')
      return
    }

    updateMutation.mutate(
      { attendanceId: record._id, payload },
      {
        onSuccess: () => {
          toast.success('Jumlah kehadiran telah diperbarui.')
          onClose()
        },
        onError: (err) => {
          toast.error('Gagal diperbarui', err?.response?.data?.message ?? 'Silahkan coba lagi')
        },
      }
    )
  }

  const handleDelete = () => {
    if (!record) return
    deleteMutation.mutate(record._id, {
      onSuccess: () => {
        toast.success('Data berhasil dihapus', 'Kirim ulang untuk memperbaikinya.')
        onClose()
      },
      onError: (err) => {
        toast.error('Data gagal dihapus', err?.response?.data?.message ?? 'Silahkan coba lagi')
      },
    })
  }

  if (!record) return null

  const isPending = updateMutation.isPending || deleteMutation.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detail Kehadiran"
      description="Lihat atau perbarui catatan kehadiran ini."
      size="md"
    >
      <div className="space-y-5">

        {/* Read-only info section */}
        <div className="bg-muted/40 rounded-lg px-1 py-1">
          <InfoRow icon={User} label="Karyawan">
            <p className="text-sm font-medium text-foreground mt-0.5">
              {record.employeeId?.name ?? record.employeeId ?? '—'}
            </p>
          </InfoRow>

          <InfoRow icon={Calendar} label="Tanggal">
            <p className="text-sm font-medium text-foreground mt-0.5">
              {formatDate(record.date)}
            </p>
          </InfoRow>

          <InfoRow icon={Building2} label="Outlet">
            <p className="text-sm font-medium text-foreground mt-0.5">
              {record.outletId?.name ?? record.outletId ?? '—'}
            </p>
          </InfoRow>

          <InfoRow icon={FileText} label="Dibuat Pada">
            <p className="text-sm font-medium text-foreground mt-0.5">
              {formatDateTime(record.createdAt)}
            </p>
          </InfoRow>
        </div>

       
        {canManage ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-4">

              {/* Status selector */}
              <FormField label="Status" error={errors.status?.message} required>
                <Select
                  {...register('status')}
                  error={!!errors.status?.message}
                  disabled={isPending}
                >
                  {ATTENDANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </Select>

                {/* Live preview of selected status */}
                <div className="mt-2">
                  <AttendanceStatusBadge status={watchedStatus} />
                </div>
              </FormField>

              {/* Notes */}
              <FormField label="Catatan" error={errors.notes?.message}>
                <textarea
                  {...register('notes')}
                  placeholder="Catatan opsional (misalnya alasan tidak masuk, waktu terlambat…)"
                  disabled={isPending}
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border bg-background text-sm',
                    'placeholder:text-muted-foreground resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                    errors.notes?.message ? 'border-destructive' : 'border-input'
                  )}
                />
              </FormField>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-border">

              {/* Delete section */}
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-destructive font-medium">Konfirmasi hapus?</p>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isPending}
                      className="text-xs font-semibold text-destructive hover:underline disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? 'Menghapus…' : 'Ya, hapus'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>

              {/* Save / Cancel */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isPending || !isDirty}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md',
                    'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {updateMutation.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
                </button>
              </div>

            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Status</p>
              <AttendanceStatusBadge status={record.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Catatan</p>
              <p className="text-sm text-foreground">
                {record.notes || <span className="text-muted-foreground">Tidak ada catatan.</span>}
              </p>
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  )
}

export default AttendanceDetailModal