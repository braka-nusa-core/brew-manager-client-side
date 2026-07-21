// src/pages/AccessDeniedPage.jsx
// Rendered by ProtectedRoute instead of the requested page's own
// content when the current role lacks the required permission.
// Mirrors NotFoundPage.jsx's visual pattern for consistency.

import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

const AccessDeniedPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-8">
    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-5">
      <ShieldAlert className="w-8 h-8 text-destructive" />
    </div>
    <h1 className="text-2xl font-semibold text-foreground mb-2">Akses Ditolak</h1>
    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
      Anda tidak memiliki izin untuk mengakses halaman ini. Jika menurut Anda ini adalah kesalahan,
      hubungi admin tenant Anda.
    </p>
    <Link
      to="/dashboard"
      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-brand-950 font-medium text-sm rounded-md transition-colors"
    >
      Kembali ke dasbor
    </Link>
  </div>
)

export default AccessDeniedPage