/**
 * Types for Route Management
 */

export interface RouteWithStats {
  routeId: string
  routeName: string
  totalActivos: number
  enCV: number
  alCorriente: number
  employees: EmployeeWithLocality[]
}

export interface EmployeeWithLocality {
  id: string
  type: string
  activos: number
  enCV: number
  alCorriente: number
  personalData?: {
    id: string
    fullName: string
    addresses: Array<{
      id: string
      location: {
        id: string
        name: string
      } | null
    }>
  } | null
}

export interface LocalityInfo {
  employeeId: string
  employeeName: string
  localityId: string
  localityName: string
}
