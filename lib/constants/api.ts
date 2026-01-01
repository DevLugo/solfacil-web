/**
 * Configuración y constantes de API
 */

/**
 * Obtiene la URL base de la API de forma dinámica
 * Prioridad: NEXT_PUBLIC_API_URL > mismo origen que la web
 * IMPORTANTE: Llamar esta función dentro de handlers/callbacks, no en nivel de módulo
 */
export function getApiBaseUrl(): string {
  // Si hay una URL configurada, usarla
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // En el browser, usar el mismo origen (asume API en mismo dominio)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Fallback para SSR/desarrollo
  return 'http://localhost:4000'
}

/**
 * Construye una URL de API completa con parámetros opcionales
 * IMPORTANTE: Llamar esta función dentro de handlers/callbacks, no en nivel de módulo
 */
export function buildApiUrl(endpoint: string, params?: URLSearchParams): string {
  const queryString = params ? `?${params.toString()}` : ''
  return `${getApiBaseUrl()}${endpoint}${queryString}`
}
