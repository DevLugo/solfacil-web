'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation } from '@apollo/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LOGIN_MUTATION } from '@/graphql/mutations/auth'
import { getRedirectUrl } from '@/hooks/use-redirect-url'
import { getHomePage } from '@/lib/permissions'
import { UserRoleType } from '@solufacil/shared'

interface LoginResult {
  login: {
    accessToken: string
    refreshToken: string
    user: {
      id: string
      email: string
      role: string
      employee?: {
        id: string
        personalData?: {
          fullName: string
        }
      }
    }
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState('')
  const [isNavigating, setIsNavigating] = React.useState(false)

  const [login, { loading: isLoading }] = useMutation<LoginResult>(LOGIN_MUTATION, {
    onCompleted: async (data) => {
      if (data.login) {
        localStorage.setItem('accessToken', data.login.accessToken)
        localStorage.setItem('refreshToken', data.login.refreshToken)
        setIsNavigating(true)
        // Redirect to saved URL or user's role-appropriate home page
        const userRole = data.login.user.role as UserRoleType
        const defaultHome = getHomePage(userRole)
        const redirectTo = getRedirectUrl() || defaultHome
        await router.push(redirectTo)
      }
    },
    onError: (err) => {
      console.error('Login error:', err)
      if (err.message.includes('Invalid credentials') || err.message.includes('not found')) {
        setError('Correo o contraseña incorrectos')
      } else if (err.message.includes('Network')) {
        setError('Error de conexión. Verifica que el servidor esté activo.')
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.')
      }
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    await login({
      variables: { email, password },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-gradient-primary opacity-10 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-gradient-secondary opacity-10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md overflow-hidden border-0 shadow-2xl">
        {/* Gradient top border - Naranja */}
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-primary" />

        <CardHeader className="space-y-1 text-center">
          {/* Logo real de Solufácil */}
          <div className="mx-auto mb-4">
            <Image
              src="/solufacil.png"
              alt="Solufácil"
              width={200}
              height={60}
              priority
              className="h-14 w-auto"
            />
          </div>

          <CardTitle className="text-2xl font-bold">
            Bienvenido
          </CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                disabled={isLoading || isNavigating}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="#"
                  className="text-xs text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  disabled={isLoading || isNavigating}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isNavigating}
            >
              {isLoading || isNavigating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Al ingresar, aceptas nuestros{' '}
              <Link href="#" className="text-primary hover:underline">
                Términos de Servicio
              </Link>{' '}
              y{' '}
              <Link href="#" className="text-primary hover:underline">
                Política de Privacidad
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
