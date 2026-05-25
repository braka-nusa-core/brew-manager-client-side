// ============================================================
// router/index.jsx
// Central route definitions.
//
// Structure:
//   /login             → AuthLayout → LoginPage  (public)
//   /                  → ProtectedRoute
//     /dashboard       → DashboardLayout → DashboardPage
//     /employees       → DashboardLayout → (future)
//     /attendance      → DashboardLayout → (future)
//     /sales           → DashboardLayout → (future)
//     /expenses        → DashboardLayout → (future)
//     /payroll         → DashboardLayout → (future)
//     /outlets         → DashboardLayout → (future)
//     /settings        → DashboardLayout → (future)
//   *                  → NotFoundPage
//
// Future modules are scaffolded as placeholder pages.
// This ensures the sidebar navigation links work immediately.
// ============================================================

import { createBrowserRouter, Navigate } from 'react-router-dom'

import ProtectedRoute   from './ProtectedRoute'
import AuthLayout       from '@/layouts/AuthLayout'
import DashboardLayout  from '@/layouts/DashboardLayout'
import LoginPage        from '@/pages/LoginPage'
import DashboardPage    from '@/pages/DashboardPage'
import NotFoundPage     from '@/pages/NotFoundPage'
import PlaceholderPage  from '@/pages/PlaceholderPage'
import EmployeesPage from '../pages/EmployeesPage'
import AttendancePage from '../pages/AttendancePage'
import SalesPage from '../pages/SalesPage'
import ExpensesPage from '../pages/ExpensesPage'
import PayrollPage from '../pages/PayrollPage'

const router = createBrowserRouter([
  // ── Public: Auth ────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },

  // ── Protected: Dashboard ─────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          // Redirect root to dashboard
          { path: '/', element: <Navigate to="/dashboard" replace /> },

          { path: '/dashboard',  element: <DashboardPage /> },
          { path: '/employees',  element: <EmployeesPage/> },
          { path: '/attendance', element: <AttendancePage/> },
          { path: '/sales',      element: <SalesPage/> },
          { path: '/expenses',   element: <ExpensesPage/> },
          { path: '/payroll',    element: <PayrollPage/> },
          { path: '/outlets',    element: <PlaceholderPage title="Outlets" /> },
          { path: '/settings',   element: <PlaceholderPage title="Settings" /> },
        ],
      },
    ],
  },

  // ── 404 ──────────────────────────────────────────────────
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
