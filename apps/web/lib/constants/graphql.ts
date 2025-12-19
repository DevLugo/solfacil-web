/**
 * Configuración y constantes de GraphQL
 */

export const GRAPHQL_CONFIG = {
  DEFAULT_FETCH_POLICY: 'cache-and-network' as const,
  PARTIAL_DATA_ERROR_POLICY: 'all' as const
} as const
