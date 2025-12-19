import { USER_ROLES, UserRoleType, ROLE_LABELS as SHARED_ROLE_LABELS } from '@solufacil/shared'

// Reusable role groups
export const ROLE_GROUPS = {
  ADMIN_ONLY: [USER_ROLES.ADMIN] as UserRoleType[],
  ADMIN_AND_DATA_ENTRY: [USER_ROLES.ADMIN, USER_ROLES.CAPTURA] as UserRoleType[],
  ADMIN_AND_REVIEWER: [USER_ROLES.ADMIN, USER_ROLES.DOCUMENT_REVIEWER] as UserRoleType[],
  OPERATIONAL: [USER_ROLES.ADMIN, USER_ROLES.NORMAL, USER_ROLES.CAPTURA] as UserRoleType[],
  ALL: [
    USER_ROLES.ADMIN,
    USER_ROLES.NORMAL,
    USER_ROLES.CAPTURA,
    USER_ROLES.DOCUMENT_REVIEWER,
  ] as UserRoleType[],
}

// Route permissions - single source of truth
export const ROUTE_PERMISSIONS: Record<string, UserRoleType[]> = {
  '/dashboard': ROLE_GROUPS.ADMIN_ONLY,
  '/historial-clientes': ROLE_GROUPS.ALL,
  '/transacciones': ROLE_GROUPS.ADMIN_AND_DATA_ENTRY,
  '/listados/generar': ROLE_GROUPS.OPERATIONAL,
  '/documentos/cargar': ROLE_GROUPS.ADMIN_AND_REVIEWER,
  '/reportes/financiero': ROLE_GROUPS.ADMIN_ONLY,
  '/reportes/cartera': ROLE_GROUPS.ADMIN_ONLY,
  '/reportes/limpieza-cartera': ROLE_GROUPS.ADMIN_ONLY,
  '/administrar/rutas': ROLE_GROUPS.ADMIN_ONLY,
  '/administrar/lideres/nuevo': ROLE_GROUPS.ADMIN_AND_DATA_ENTRY,
  '/administrar/gastos': ROLE_GROUPS.ADMIN_ONLY,
  '/administrar/cartera-muerta': ROLE_GROUPS.ADMIN_ONLY,
  '/administrar/usuarios': ROLE_GROUPS.ADMIN_ONLY,
  '/administrar/usuarios-telegram': ROLE_GROUPS.ADMIN_ONLY,
  '/administrar/notificaciones-telegram': ROLE_GROUPS.ADMIN_ONLY,
}

// Role labels for UI - re-exported from shared
export const ROLE_LABELS = SHARED_ROLE_LABELS

// Home page by role
export const HOME_PAGE_BY_ROLE: Record<UserRoleType, string> = {
  [USER_ROLES.ADMIN]: '/dashboard',
  [USER_ROLES.CAPTURA]: '/transacciones',
  [USER_ROLES.NORMAL]: '/historial-clientes',
  [USER_ROLES.DOCUMENT_REVIEWER]: '/documentos/cargar',
}

// Get home page for a role
export function getHomePage(role: UserRoleType): string {
  return HOME_PAGE_BY_ROLE[role] || '/dashboard'
}

// Check if a role has access to a route
export function hasAccess(role: UserRoleType | undefined, route: string): boolean {
  if (!role) return false

  const allowedRoles = ROUTE_PERMISSIONS[route]

  // If route is not configured, only ADMIN has access
  if (!allowedRoles) return role === USER_ROLES.ADMIN

  return allowedRoles.includes(role)
}

// Get allowed roles for a route (used by sidebar)
export function getAllowedRoles(route: string): UserRoleType[] | undefined {
  return ROUTE_PERMISSIONS[route]
}

// Backward compatibility aliases (deprecated)
export const ROLES = ROLE_GROUPS
export const PERMISOS_RUTAS = ROUTE_PERMISSIONS
export const ETIQUETAS_ROL = ROLE_LABELS
export const PAGINA_INICIO_POR_ROL = HOME_PAGE_BY_ROLE
export const obtenerPaginaInicio = getHomePage
export const tieneAcceso = hasAccess
export const obtenerRolesRuta = getAllowedRoles
export const canAccess = hasAccess
