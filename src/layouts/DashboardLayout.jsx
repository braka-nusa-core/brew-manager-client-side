// ============================================================
// layouts/DashboardLayout.jsx
// Main shell layout: sidebar (left) + navbar (top) + content.
//
// Features:
//   - Collapsible sidebar with localStorage persistence
//   - Mobile sidebar as overlay drawer
//   - Responsive: sidebar hidden on mobile, toggle via hamburger
// ============================================================

import { useState, useEffect } from 'react'
import { Outlet }              from 'react-router-dom'
import Sidebar                 from '@/components/shared/Sidebar'
import Navbar                  from '@/components/shared/Navbar'
import { cn }                  from '@/lib/utils'
import { X }                   from 'lucide-react'

const COLLAPSED_KEY = 'sidebar_collapsed'

const DashboardLayout = () => {
  const [collapsed,    setCollapsed]    = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === 'true'
  )
  const [mobileOpen,  setMobileOpen]  = useState(false)

  // Persist collapse preference
  const handleToggleCollapse = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSED_KEY, String(!c))
      return !c
    })
  }

  // Close mobile drawer on route change / resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop Sidebar ────────────────────────────────── */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar collapsed={collapsed} onToggle={handleToggleCollapse} />
      </div>

      {/* ── Mobile Sidebar Overlay ─────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed left-0 top-0 h-full z-40 flex lg:hidden">
            <div className="relative">
              <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
              {/* Close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-3 p-1 rounded-md text-sidebar-foreground hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Main Content ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar onMobileMenuToggle={() => setMobileOpen((o) => !o)} />

        {/* Page area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
