'use client'

import { useMutation, useQuery, useApolloClient } from '@apollo/client'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { LOGIN_MUTATION, LOGOUT_MUTATION } from '@/graphql/mutations/auth'
import { ME_QUERY } from '@/graphql/queries/auth'

interface User {
  id: string
  email: string
  role: 'ADMIN' | 'NORMAL' | 'CAPTURA'
  employee?: {
    id: string
    personalData?: {
      fullName: string
    }
  }
}

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

interface LoginResult {
  login: AuthPayload
}

interface MeResult {
  me: User | null
}

export function useAuth() {
  const router = useRouter()
  const client = useApolloClient()

  const { data: meData, loading: meLoading, refetch: refetchMe } = useQuery<MeResult>(ME_QUERY, {
    skip: typeof window === 'undefined' || !localStorage.getItem('accessToken'),
    errorPolicy: 'ignore',
  })

  const [loginMutation, { loading: loginLoading, error: loginError }] = useMutation<LoginResult>(
    LOGIN_MUTATION
  )

  const [logoutMutation] = useMutation(LOGOUT_MUTATION)

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation({
        variables: { email, password },
      })

      if (result.data?.login) {
        const { accessToken, refreshToken } = result.data.login
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        // Refetch user data and redirect
        await refetchMe()
        router.push('/dashboard')

        return result.data.login
      }

      throw new Error('Login failed')
    },
    [loginMutation, refetchMe, router]
  )

  const logout = useCallback(async () => {
    try {
      await logoutMutation()
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      await client.resetStore()
      router.push('/login')
    }
  }, [logoutMutation, client, router])

  const isAuthenticated = !!meData?.me

  return {
    user: meData?.me ?? null,
    isAuthenticated,
    isLoading: meLoading,
    login,
    logout,
    loginLoading,
    loginError,
  }
}
