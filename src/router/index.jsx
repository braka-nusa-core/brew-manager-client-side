// ============================================================
// router/index.jsx
// Central route definitions.
//
// Structure:
//   /login             → AuthLayout → LoginPage  (public)
//   /                  → ProtectedRoute (auth + permission guard)
//     /dashboard       → DashboardLayout → DashboardPage
//     /employees       → DashboardLayout → EmployeesPage
//     /attendance      → DashboardLayout → AttendancePage
//     /sales           → DashboardLayout → SalesPage
//     /expenses        → DashboardLayout → ExpensesPage
//     /payroll         → DashboardLayout → PayrollPage
//     /outlets         → DashboardLayout → OutletsPage
//     /products        → DashboardLayout → ProductsPage
//     /raw-materials   → DashboardLayout → RawMaterialsPage
//     /cup-records     → DashboardLayout → CupRecordsPage
//     /inventory        → DashboardLayout → InventoryDashboardPage
//     /inventory/list   → DashboardLayout → InventoryListPage
//     /inventory/products/:productId → DashboardLayout → InventoryProductDetailPage
//     /inventory/batches/:batchId    → DashboardLayout → InventoryBatchDetailPage
//     /inventory/adjustments         → DashboardLayout → InventoryAdjustmentPage
//     /inventory/adjustments/:adjustmentId → DashboardLayout → InventoryAdjustmentDetailPage
//     /production            → DashboardLayout → ProductionListPage
//     /production/:productionId → DashboardLayout → ProductionDetailPage
//     /bikes           → DashboardLayout → BikesPage
//     /bike-assignments→ DashboardLayout → BikeAssignmentsPage
//     /bike-maintenance→ DashboardLayout → BikeMaintenancePage
//     /users           → DashboardLayout → UsersPage
//     /settings        → DashboardLayout → SettingsPage
//   *                  → NotFoundPage
//
// Permission-aware routing (Sprint 4):
//   Which role can VIEW each of the routes above is defined in
//   router/routeAccess.js (ROUTE_PERMISSIONS), NOT here — this file
//   only defines the route TREE (paths → components). ProtectedRoute
//   reads routeAccess.js and renders AccessDeniedPage instead of the
//   requested route when the current role lacks the required
//   permission. Sidebar.jsx reads the same routeAccess.js to decide
//   which nav links to even show, so there is exactly one place
//   (routeAccess.js) that defines route-level access, consumed by
//   both the guard and the navigation — no duplicated role checks.
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
import InventoryDashboardPage from '../pages/InventoryDashboardPage'
import InventoryListPage      from '../pages/InventoryListPage'
import InventoryProductDetailPage from '../pages/InventoryProductDetailPage'
import InventoryBatchDetailPage   from '../pages/InventoryBatchDetailPage'
import InventoryAdjustmentPage       from '../pages/InventoryAdjustmentPage'
import InventoryAdjustmentDetailPage from '../pages/InventoryAdjustmentDetailPage'
import ProductionListPage      from '../pages/ProductionListPage'
import ProductionDashboardPage from '../pages/ProductionDashboardPage'
import ProductionDetailPage    from '../pages/ProductionDetailPage'
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
          { path: '/inventory',   element: <InventoryDashboardPage/> },
          { path: '/inventory/list', element: <InventoryListPage/> },
          { path: '/inventory/products/:productId', element: <InventoryProductDetailPage/> },
          { path: '/inventory/batches/:batchId', element: <InventoryBatchDetailPage/> },
          { path: '/inventory/adjustments', element: <InventoryAdjustmentPage/> },
          { path: '/inventory/adjustments/:adjustmentId', element: <InventoryAdjustmentDetailPage/> },
          { path: '/production', element: <ProductionListPage/> },
          { path: '/production/dashboard', element: <ProductionDashboardPage/> },
          { path: '/production/:productionId', element: <ProductionDetailPage/> },
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