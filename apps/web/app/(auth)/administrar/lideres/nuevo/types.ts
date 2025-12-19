/**
 * Tipos para la funcionalidad de crear nuevo líder
 */

export interface LeaderFormData {
  fullName: string
  birthDate: string
  phone: string
  locationId: string
  routeId: string
  replaceExisting: boolean
}

export interface LocationFormData {
  name: string
  municipalityId: string
}

export interface Route {
  id: string
  name: string
}

export interface Municipality {
  id: string
  name: string
  state: {
    id: string
    name: string
  }
}

export interface Location {
  id: string
  name: string
  municipality: Municipality
}

export interface ExistingLeader {
  id: string
  fullName: string
  locationName: string
}
