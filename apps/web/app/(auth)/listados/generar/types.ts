/**
 * Tipos locales para la funcionalidad de generar listados
 */

/**
 * Localidad con información del líder responsable
 */
export interface LocalityWithLeader {
  id: string
  name: string
  leaderName: string
  leaderId: string
}

/**
 * Empleado con datos personales y direcciones
 * Representa la respuesta de GraphQL
 */
export interface Employee {
  id: string
  type: string
  personalData: {
    id: string
    fullName: string
    addresses: Array<{
      id: string
      location: {
        id: string
        name: string
      }
    }>
  }
}

/**
 * Datos de ruta para el selector
 */
export interface RouteData {
  id: string
  name: string
}
