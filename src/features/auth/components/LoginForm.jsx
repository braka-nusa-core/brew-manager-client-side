// ============================================================
// features/auth/components/LoginForm.jsx
// Login form — handles input, validation, and error display.
// Delegates submission to useLogin() hook.
// Zero API logic — all in authApi.js via useLogin.
// ============================================================

import { useState }   from 'react'
import { useLogin }   from '../hooks/useAuth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn }         from '@/lib/utils'

const LoginForm = () => {
  const loginMutation = useLogin()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((fe) => ({ ...fe, [name]: null }))
    }
  }

  const validate = () => {
    const errors = {}
    if (!form.email.trim())    errors.email    = 'Email wajib diisi!'
    else if (!/\S+@\S+\.\S+/.test(form.email))
                               errors.email    = 'Masukkan alamat email yang valid'
    if (!form.password.trim()) errors.password = 'Password wajib diisi!'
    return errors
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    loginMutation.mutate({ email: form.email.trim(), password: form.password })
  }

  // Extract server error message
  const serverError = loginMutation.error
    ? (loginMutation.error.response?.data?.message ?? 'Login gagal, coba lagi!')
    : null

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* Server error banner */}
      {serverError && (
        <div className="px-3 py-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive animate-fade-in">
          {serverError}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@perusahaan.com"
          value={form.email}
          onChange={handleChange}
          disabled={loginMutation.isPending}
          className={cn(
            'w-full h-10 px-3 rounded-md border bg-background text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            fieldErrors.email
              ? 'border-destructive focus:ring-destructive'
              : 'border-input'
          )}
        />
        {fieldErrors.email && (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            disabled={loginMutation.isPending}
            className={cn(
              'w-full h-10 pl-3 pr-10 rounded-md border bg-background text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors',
              fieldErrors.password
                ? 'border-destructive focus:ring-destructive'
                : 'border-input'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPwd
              ? <EyeOff className="w-4 h-4" />
              : <Eye    className="w-4 h-4" />
            }
          </button>
        </div>
        {fieldErrors.password && (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loginMutation.isPending}
        className={cn(
          'w-full h-10 flex items-center justify-center gap-2 rounded-md',
          'bg-brand-500 hover:bg-brand-600 text-brand-950 font-semibold text-sm',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed'
        )}
      >
        {loginMutation.isPending && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {loginMutation.isPending ? 'Masuk...' : 'Masuk'}
      </button>
    </form>
  )
}

export default LoginForm
