import LoginForm from '@/features/auth/components/LoginForm'

/**
 * Login page — rendered inside AuthLayout.
 * This page is a layout orchestrator only.
 * All form logic lives in LoginForm.
 */
const LoginPage = () => (
  <div className="bg-card border border-border rounded-xl shadow-sm p-8">
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-foreground">
        Selamat Datang Kembali!
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Masuk ke workspace Anda
      </p>
    </div>

    <LoginForm />
  </div>
)

export default LoginPage
