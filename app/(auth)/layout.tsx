'use client'

import * as React from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AuthGuard } from '@/components/auth/auth-guard'
import { TransactionProvider } from '@/components/features/transactions/transaction-context'
import { cn } from '@/lib/utils'

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobile, setIsMobile] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  // Detect mobile and load desktop preference
  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setMobileMenuOpen(false)
      } else {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        if (saved !== null) {
          setSidebarCollapsed(saved === 'true')
        }
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Persist desktop sidebar preference
  React.useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed))
    }
  }, [sidebarCollapsed, isMobile])

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  const handleCloseMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <AuthGuard>
      <TransactionProvider>
        <div className="min-h-screen bg-background">
          {/* Sidebar */}
          <Sidebar
            isCollapsed={sidebarCollapsed}
            isMobile={isMobile}
            isOpen={mobileMenuOpen}
            onClose={handleCloseMobileMenu}
          />

          {/* Header */}
          <Header
            onToggleSidebar={handleToggleSidebar}
            sidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
          />

          {/* Main content */}
          <main
            className={cn(
              'min-h-screen pt-16 transition-all duration-300',
              isMobile ? 'pl-0' : (sidebarCollapsed ? 'pl-16' : 'pl-64')
            )}
          >
            <div className="container mx-auto p-6">{children}</div>
          </main>
        </div>
      </TransactionProvider>
    </AuthGuard>
  )
}
