/**
 * Configuración y constantes de API
 *
 * IMPORTANTE: Las variables NEXT_PUBLIC_* se reemplazan en build time.
 * Estos valores se "bake in" durante el build de Vercel.
 */

// Derivar URL base del API desde NEXT_PUBLIC_GRAPHQL_URL (quitar /graphql)
// o usar NEXT_PUBLIC_API_URL si está definido
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  if (process.env.NEXT_PUBLIC_GRAPHQL_URL) {
    return process.env.NEXT_PUBLIC_GRAPHQL_URL.replace(/\/graphql$/, '')
  }
  return 'http://localhost:4000'
}

// URL base de la API - se resuelve en build time
export const API_BASE_URL = resolveApiBaseUrl()

// Función helper para construir URLs de API
export function getApiBaseUrl(): string {
  return API_BASE_URL
}
