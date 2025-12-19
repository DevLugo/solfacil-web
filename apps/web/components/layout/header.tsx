'use client'

import * as React from 'react'
import { Menu, Bell, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { ETIQUETAS_ROL } from '@/lib/permissions'
import { UserRoleType } from '@solufacil/shared'

interface HeaderProps {
  onToggleSidebar?: () => void
  sidebarCollapsed?: boolean
  isMobile?: boolean
}

export function Header({ onToggleSidebar, sidebarCollapsed = false, isMobile = false }: HeaderProps) {
  const { user, logout } = useAuth()

  const nombreUsuario = user?.employee?.personalData?.fullName || user?.email || 'Usuario'
  const etiquetaRol = user?.role ? ETIQUETAS_ROL[user.role as UserRoleType] : 'Usuario'

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300',
        isMobile ? 'left-0' : (sidebarCollapsed ? 'left-16' : 'left-64')
      )}
    >
      {/* Lado izquierdo */}
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="h-9 w-9"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Alternar sidebar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Lado derecho */}
      <div className="flex items-center gap-2">
        {/* Notificaciones */}
        

        {/* Cambio de tema */}
        <ThemeToggle />

        {/* Menu de usuario */}
        <div className="flex items-center gap-3 border-l pl-3 ml-1">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium">{nombreUsuario}</p>
            <p className="text-xs text-muted-foreground">{etiquetaRol}</p>
          </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src="" alt={nombreUsuario} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Cerrar sesión</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cerrar sesión</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  )
}
