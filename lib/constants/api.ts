/**
 * Configuración y constantes de API
 */

/**
 * Obtiene la URL base de la API de forma dinámica
 * Prioridad: NEXT_PUBLIC_API_URL > mismo origen que la web
 */
function getApiBaseUrl(): string {
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

export const API_CONFIG = {
  get BASE_URL() {
    return getApiBaseUrl()
  },
  ENDPOINTS: {
    GENERAR_LISTADOS: '/api/generar-listados',
    EXPORT_CLIENT_HISTORY: '/api/export-client-history-pdf'
  }
} as const

/**
 * Construye una URL de API completa con parámetros opcionales
 */
export function buildApiUrl(endpoint: string, params?: URLSearchParams): string {
  const queryString = params ? `?${params.toString()}` : ''
  return `${API_CONFIG.BASE_URL}${endpoint}${queryString}`
}
