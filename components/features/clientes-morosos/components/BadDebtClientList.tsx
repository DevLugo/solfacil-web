'use client'

import { useRef, useCallback, useEffect } from 'react'
import { Loader2, AlertCircle, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { BadDebtClientCard } from './BadDebtClientCard'
import type { BadDebtClientItem } from '../types'

interface BadDebtClientListProps {
  clients: BadDebtClientItem[]
  loading: boolean
  hasMore: boolean
  loadMore: () => void
  error?: Error
}

function ClientCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-start gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-2 w-full" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    </div>
  )
}

export function BadDebtClientList({
  clients,
  loading,
  hasMore,
  loadMore,
  error,
}: BadDebtClientListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Ref for the sentinel element at the bottom
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return

      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      // Create new observer
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      })

      // Observe the sentinel
      if (node) {
        observerRef.current.observe(node)
      }
    },
    [loading, hasMore, loadMore]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-destructive">Error al cargar</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {error.message || 'Ocurrió un error al cargar los clientes morosos.'}
        </p>
      </div>
    )
  }

  // Initial loading state
  if (loading && clients.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <ClientCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Empty state
  if (!loading && clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          No hay clientes morosos
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          No se encontraron clientes con cartera vencida o excluidos por limpieza
          de portafolio.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Client cards */}
      {clients.map((client) => (
        <BadDebtClientCard key={client.id} client={client} />
      ))}

      {/* Sentinel element for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading more indicator */}
      {loading && clients.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Cargando más...
          </span>
        </div>
      )}

      {/* End of list */}
      {!hasMore && clients.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Mostrando {clients.length} clientes morosos
        </div>
      )}
    </div>
  )
}
