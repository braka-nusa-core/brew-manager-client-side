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
//     /products        → DashboardLayout → ProductsPage
//     /raw-materials   → DashboardLayout → RawMaterialsPage
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
import UsersPage        from '@/pages/UsersPage'
import SettingsPage     from '@/pages/SettingsPage'
import EmployeesPage from '../pages/EmployeesPage'
import AttendancePage from '../pages/AttendancePage'
import SalesPage from '../pages/SalesPage'
import ExpensesPage from '../pages/ExpensesPage'
import PayrollPage from '../pages/PayrollPage'
import OutletsPage from '../pages/OutletsPage'
import ProductsPage from '../pages/ProductsPage'
import RawMaterialsPage from '../pages/RawMaterialsPage'
import CupRecordsPage  from '../pages/CupRecordsPage'
import BikesPage       from '../pages/BikesPage'
import BikeAssignmentsPage from '../pages/BikeAssignmentsPage'
import BikeMaintenancePage from '../pages/BikeMaintenancePage'

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
          { path: '/outlets',    element: <OutletsPage/> },
          { path: '/products',   element: <ProductsPage/> },
          { path: '/raw-materials', element: <RawMaterialsPage/> },
          { path: '/cup-records', element: <CupRecordsPage/> },
          { path: '/bikes',             element: <BikesPage/> },
          { path: '/bike-assignments',  element: <BikeAssignmentsPage/> },
          { path: '/bike-maintenance',  element: <BikeMaintenancePage/> },
          { path: '/users',     element: <UsersPage/> },
          { path: '/settings',  element: <SettingsPage/> },
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