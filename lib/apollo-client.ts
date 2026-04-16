'use client'

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  type NormalizedCacheObject,
  Observable,
  type FetchResult,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { RetryLink } from '@apollo/client/link/retry'
import { saveRedirectUrl } from '@/hooks/use-redirect-url'
import { toast } from '@/hooks/use-toast'

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql'

// Per-request timeout. Aborts stalled fetches (e.g. zombie HTTP/2 connections held open
// by Chrome/Cloudflare) so the RetryLink below can open a fresh connection.
const REQUEST_TIMEOUT_MS = 30_000

// Shared promise for refresh token to handle race conditions
let refreshPromise: Promise<boolean> | null = null

// Custom fetch that aborts requests exceeding REQUEST_TIMEOUT_MS.
// File uploads bypass Apollo (see uploadFileWithGraphQL) and keep their own longer timeout.
const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  // Chain any externally-provided signal with our timeout signal
  if (init?.signal) {
    if (init.signal.aborted) controller.abort()
    else init.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId)
  })
}

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: 'include',
  fetch: fetchWithTimeout,
})

// Retry on transient network failures (timeouts, aborted stalled connections, 5xx).
// Does NOT retry on GraphQL errors (those are handled by errorLink).
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3_000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      if (!error) return false
      // AbortError -> our timeout fired, likely a stalled HTTP/2 stream
      if (error.name === 'AbortError') return true
      // TypeError "Failed to fetch" -> network layer issues
      if (error.name === 'TypeError') return true
      // 5xx status codes
      const status = (error as { statusCode?: number }).statusCode
      if (typeof status === 'number' && status >= 500 && status < 600) return true
      return false
    },
  },
})

const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

// Function to refresh tokens
async function refreshTokens(): Promise<boolean> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null

  if (!refreshToken) {
    return false
  }

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation RefreshToken($refreshToken: String!) {
            refreshToken(refreshToken: $refreshToken) {
              accessToken
              refreshToken
            }
          }
        `,
        variables: { refreshToken },
      }),
    })

    const result = await response.json()

    if (result.data?.refreshToken) {
      const { accessToken, refreshToken: newRefreshToken } = result.data.refreshToken
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefreshToken)
      return true
    }

    return false
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return false
  }
}

// Function to handle logout with redirect URL saving
function handleLogout() {
  if (typeof window === 'undefined') return

  // Save current URL for redirect after login
  const currentPath = window.location.pathname
  if (currentPath !== '/login' && !currentPath.startsWith('/login')) {
    saveRedirectUrl(currentPath)
  }

  // Clear tokens
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')

  // Redirect to login
  window.location.href = '/login'
}

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      // Handle authentication errors - attempt refresh before logging
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        // Return an observable that will retry the request after refresh
        return new Observable<FetchResult>((observer) => {
          let subscription: { unsubscribe: () => void } | null = null

          // If there's already a refresh in progress, wait for it
          const doRefresh = refreshPromise || (refreshPromise = refreshTokens().finally(() => {
            refreshPromise = null
          }))

          doRefresh.then((success) => {
            if (success) {
              // Retry the request with new token
              subscription = forward(operation).subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              })
            } else {
              // Refresh failed, show toast and logout
              if (typeof window !== 'undefined') {
                toast({
                  title: 'Sesión expirada',
                  description: 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.',
                  variant: 'destructive',
                })
              }
              handleLogout()
              observer.error(err)
            }
          }).catch(() => {
            // Error during refresh, show toast and logout
            if (typeof window !== 'undefined') {
              toast({
                title: 'Error de autenticación',
                description: 'No se pudo renovar la sesión. Por favor inicia sesión de nuevo.',
                variant: 'destructive',
              })
            }
            handleLogout()
            observer.error(err)
          })

          // Return cleanup function
          return () => {
            if (subscription) {
              subscription.unsubscribe()
            }
          }
        })
      }

      // Show toast for non-auth errors
      if (typeof window !== 'undefined') {
        toast({
          title: 'Error',
          description: err.message || 'Ha ocurrido un error. Por favor intenta de nuevo.',
          variant: 'destructive',
        })
      }

      // Log non-auth errors
      console.error(
        `[GraphQL error]: Message: ${err.message}, Location: ${err.locations}, Path: ${err.path}`
      )
    }
  }

  if (networkError) {
    // Show toast for network errors
    if (typeof window !== 'undefined') {
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servidor. Por favor verifica tu conexión.',
        variant: 'destructive',
      })
    }

    console.error(`[Network error]: ${networkError}`)
  }
})

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        loans: {
          keyArgs: ['status', 'routeId', 'leadId', 'locationId', 'borrowerId', 'fromDate', 'toDate', 'limit', 'offset'],
          merge(existing, incoming) {
            return incoming
          },
        },
        transactions: {
          keyArgs: ['where', 'orderBy'],
          merge(existing, incoming) {
            return incoming
          },
        },
        accounts: {
          merge(existing, incoming) {
            return incoming
          },
        },
        routes: {
          merge(existing, incoming) {
            return incoming
          },
        },
      },
    },
    Loan: {
      keyFields: ['id'],
    },
    Transaction: {
      keyFields: ['id'],
    },
    Account: {
      keyFields: ['id'],
    },
    Route: {
      keyFields: ['id'],
    },
    Employee: {
      keyFields: ['id'],
    },
    Borrower: {
      keyFields: ['id'],
    },
    PersonalData: {
      keyFields: ['id'],
    },
  },
})

let apolloClient: ApolloClient<NormalizedCacheObject> | undefined

function createApolloClient(): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    ssrMode: typeof window === 'undefined',
    link: from([errorLink, retryLink, authLink, httpLink]),
    cache,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  })
}

export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
  const _apolloClient = apolloClient ?? createApolloClient()

  // For SSG and SSR always create a new Apollo Client
  if (typeof window === 'undefined') return _apolloClient

  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient

  return _apolloClient
}

export function resetApolloClient(): void {
  apolloClient = undefined
}

/**
 * Upload a file using multipart/form-data with GraphQL
 * This bypasses Apollo Client's normal flow to handle file uploads properly
 * Uses XMLHttpRequest for upload progress tracking
 */
export async function uploadFileWithGraphQL(options: {
  file: File
  query: string
  variables: Record<string, unknown>
  operationName: string
  fileVariablePath?: string
  timeoutMs?: number
  onProgress?: (loaded: number, total: number) => void
}) {
  const { file, query, variables, operationName, timeoutMs = 300000, onProgress } = options
  const fileVariablePath = options.fileVariablePath || 'variables.input.file'

  function buildFormData(token: string | null) {
    const formData = new FormData()

    // Build operations JSON with null placeholder for the file
    const ops = { query, variables: JSON.parse(JSON.stringify(variables)), operationName }
    // Set the file placeholder to null at the correct path
    const pathParts = fileVariablePath.replace(/^variables\./, '').split('.')
    let target: any = ops.variables
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!target[pathParts[i]]) target[pathParts[i]] = {}
      target = target[pathParts[i]]
    }
    target[pathParts[pathParts.length - 1]] = null

    formData.append('operations', JSON.stringify(ops))
    formData.append('map', JSON.stringify({ '0': [fileVariablePath] }))
    formData.append('0', file)

    const headers: Record<string, string> = { 'apollo-require-preflight': 'true' }
    if (token) headers['authorization'] = `Bearer ${token}`

    return { formData, headers }
  }

  function doUpload(token: string | null): Promise<any> {
    const { formData, headers } = buildFormData(token)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', GRAPHQL_URL)
      xhr.withCredentials = true
      xhr.timeout = timeoutMs

      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value)
      }

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(e.loaded, e.total)
          }
        })
      }

      xhr.addEventListener('load', () => {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error(`Respuesta inválida del servidor (status ${xhr.status})`))
        }
      })

      xhr.addEventListener('timeout', () => {
        reject(new Error(
          `La subida tardó más de ${Math.round(timeoutMs / 60000)} minutos. ` +
          'Verifica tu conexión e intenta de nuevo.'
        ))
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Error de red al subir el archivo. Verifica tu conexión.'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('La subida fue cancelada.'))
      })

      xhr.send(formData)
    })
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  let result = await doUpload(token)

  // If UNAUTHENTICATED, try refreshing token and retry once
  if (result.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED') {
    const refreshed = await refreshTokens()
    if (refreshed) {
      const newToken = localStorage.getItem('accessToken')
      result = await doUpload(newToken)
    }
  }

  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'Upload failed')
  }

  return result.data
}
