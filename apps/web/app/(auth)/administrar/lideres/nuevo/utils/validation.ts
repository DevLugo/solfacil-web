import type { LocationFormData } from '../types'

/**
 * Validates location form data and returns missing field names
 */
export function validateLocationFormData(
  locationFormData: LocationFormData,
  routeId: string
): string[] {
  const missingFields: string[] = []

  if (!routeId) missingFields.push('Ruta')
  if (!locationFormData.name?.trim()) missingFields.push('Nombre de la Localidad')
  if (!locationFormData.municipalityId) missingFields.push('Municipio')

  return missingFields
}

/**
 * Converts a date string (YYYY-MM-DD) to ISO DateTime format
 */
export function convertDateToISO(dateString: string): string {
  return new Date(dateString + 'T00:00:00.000Z').toISOString()
}
