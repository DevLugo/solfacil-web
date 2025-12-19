'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Settings,
  Route,
  DollarSign,
  ListChecks,
  UserPlus,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  History,
  Upload,
  BarChart3,
  Bell,
  Users,
  Send,
  Skull,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { obtenerRolesRuta } from '@/lib/permissions'
import { USER_ROLES, UserRoleType } from '@solufacil/shared'

interface NavItem {
  titulo: string
  href?: string
  icono: React.ComponentType<{ className?: string }>
  hijos?: NavItem[]
}

// Navegacion obtiene roles automaticamente de permissions.ts via href
const navegacion: NavItem[] = [
  { titulo: 'Dashboard', href: '/dashboard', icono: LayoutDashboard },
  { titulo: 'Historial Clientes', href: '/historial-clientes', icono: History },
  { titulo: 'Operaciones del Día', href: '/transacciones', icono: CalendarDays },
  { titulo: 'Listados', href: '/listados/generar', icono: ListChecks },
  { titulo: 'Documentos', href: '/documentos/cargar', icono: Upload },
  {
    titulo: 'Reportes',
    icono: FileText,
    hijos: [
      { titulo: 'Financiero', href: '/reportes/financiero', icono: DollarSign },
      { titulo: 'Cartera', href: '/reportes/cartera', icono: Wallet },
    ],
  },
  {
    titulo: 'Administrar',
    icono: Settings,
    hijos: [
      { titulo: 'Usuarios', href: '/administrar/usuarios', icono: Users },
      { titulo: 'Usuarios Telegram', href: '/administrar/usuarios-telegram', icono: Send },
      { titulo: 'Rutas', href: '/administrar/rutas', icono: Route },
      { titulo: 'Nuevo Líder', href: '/administrar/lideres/nuevo', icono: UserPlus },
      { titulo: 'Gastos', href: '/administrar/gastos', icono: BarChart3 },
      { titulo: 'Cartera Muerta', href: '/administrar/cartera-muerta', icono: Skull },
      { titulo: 'Notificaciones', href: '/administrar/notificaciones-telegram', icono: Bell },
    ],
  },
]

// Verifica si un rol tiene acceso a un item de navegacion
function tieneAccesoItem(item: NavItem, rol: UserRoleType): boolean {
  if (item.href) {
    const rolesPermitidos = obtenerRolesRuta(item.href)
    // Si no hay roles definidos, solo ADMIN tiene acceso
    return rolesPermitidos ? rolesPermitidos.includes(rol) : rol === USER_ROLES.ADMIN
  }
  // Items sin href (padres) se muestran si tienen al menos un hijo visible
  return true
}

// Filtra la navegacion segun el rol del usuario
function filtrarNavegacion(items: NavItem[], rol: UserRoleType): NavItem[] {
  return items
    .filter((item) => tieneAccesoItem(item, rol))
    .map((item) => {
      if (item.hijos) {
        return {
          ...item,
          hijos: item.hijos.filter((hijo) => tieneAccesoItem(hijo, rol)),
        }
      }
      return item
    })
    .filter((item) => !item.hijos || item.hijos.length > 0)
}

interface SidebarProps {
  isCollapsed?: boolean
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({
  isCollapsed = false,
  isMobile = false,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname()
  const [itemsExpandidos, setItemsExpandidos] = React.useState<string[]>([])
  const { user } = useAuth()
  const rolUsuario = (user?.role as UserRoleType) || USER_ROLES.NORMAL

  const navegacionFiltrada = React.useMemo(
    () => filtrarNavegacion(navegacion, rolUsuario),
    [rolUsuario]
  )

  const alternarExpandido = (titulo: string) => {
    setItemsExpandidos((prev) =>
      prev.includes(titulo) ? prev.filter((item) => item !== titulo) : [...prev, titulo]
    )
  }

  const estaActivo = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const estaPadreActivo = (item: NavItem) => {
    if (item.href) return estaActivo(item.href)
    return item.hijos?.some((hijo) => estaActivo(hijo.href))
  }

  // En movil: sidebar siempre expandido, desliza dentro/fuera
  // En desktop: alterna entre colapsado (w-16) y expandido (w-64)
  const efectivamenteColapsado = isMobile ? false : isCollapsed

  const manejarClickEnlace = () => {
    if (isMobile && onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Fondo oscuro en movil */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300',
          efectivamenteColapsado ? 'w-16' : 'w-64',
          isMobile && !isOpen && '-translate-x-full',
          isMobile && isOpen && 'translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b px-4">
          <Link href="/" className="flex items-center" onClick={manejarClickEnlace}>
            {efectivamenteColapsado ? (
              <div className="relative flex h-9 w-9 items-center justify-center">
                <div className="absolute inset-0 rotate-45 rounded-lg bg-primary" />
                <svg
                  viewBox="0 0 24 24"
                  className="relative z-10 h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M6 18L18 6" />
                  <path d="M6 12L12 6" />
                </svg>
              </div>
            ) : (
              <>
                {/* Logo para modo claro */}
                <Image
                  src="/solufacil.png"
                  alt="Solufacil"
                  width={150}
                  height={45}
                  priority
                  className="h-9 w-auto dark:hidden"
                />
                {/* Logo para modo oscuro */}
                <Image
                  src="/solufacil_dark.png"
                  alt="Solufacil"
                  width={150}
                  height={45}
                  priority
                  className="h-9 w-auto hidden dark:block"
                />
              </>
            )}
          </Link>
        </div>

        {/* Navegacion */}
        <ScrollArea className="h-[calc(100vh-4rem)] py-4">
          <nav className="space-y-1 px-2">
            {navegacionFiltrada.map((item) => (
              <div key={item.titulo}>
                {item.hijos ? (
                  <div>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-start gap-3',
                        estaPadreActivo(item) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                      )}
                      onClick={() => alternarExpandido(item.titulo)}
                    >
                      <item.icono className="h-4 w-4" />
                      {!efectivamenteColapsado && (
                        <>
                          <span className="flex-1 text-left">{item.titulo}</span>
                          {itemsExpandidos.includes(item.titulo) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </>
                      )}
                    </Button>
                    {!efectivamenteColapsado && itemsExpandidos.includes(item.titulo) && (
                      <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                        {item.hijos.map((hijo) => (
                          <Link
                            key={hijo.href}
                            href={hijo.href!}
                            onClick={manejarClickEnlace}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                              estaActivo(hijo.href) &&
                                'bg-sidebar-primary text-sidebar-primary-foreground'
                            )}
                          >
                            <hijo.icono className="h-4 w-4" />
                            <span>{hijo.titulo}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href!}
                    onClick={manejarClickEnlace}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      estaActivo(item.href) && 'bg-sidebar-primary text-sidebar-primary-foreground'
                    )}
                  >
                    <item.icono className="h-4 w-4" />
                    {!efectivamenteColapsado && <span>{item.titulo}</span>}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  )
}
