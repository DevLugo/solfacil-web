'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { obtenerPaginaInicio } from '@/lib/permissions'
import { UserRoleType } from '@solufacil/shared'

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && user) {
      const rol = user.role as UserRoleType
      const paginaInicio = obtenerPaginaInicio(rol)
      router.replace(paginaInicio)
    }
  }, [user, isLoading, router])

  // Mostrar loading mientras se determina el rol
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  )
}
