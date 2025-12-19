/**
 * Configuración y constantes de API
 */

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
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
