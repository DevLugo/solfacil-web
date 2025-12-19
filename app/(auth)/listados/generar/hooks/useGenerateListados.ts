import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { GET_ROUTES_FOR_PDF, GET_ROUTE_LOCALITIES } from '@/graphql/queries/generar-listados'
import { useToast } from '@/hooks/use-toast'

interface LocalityWithLeader {
  id: string
  name: string
  leaderName: string
  leaderId: string
}

interface Employee {
  id: string
  type: string
  personalData: {
    id: string
    fullName: string
    addresses: Array<{
      id: string
      location: {
        id: string
        name: string
      }
    }>
  }
}

/**
 * Hook principal para la página de generar listados
 * Maneja la selección de rutas, localidades y generación de PDFs
 */
export function useGenerateListados() {
  const { toast } = useToast()

  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [selectedLocalities, setSelectedLocalities] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [weekMode, setWeekMode] = useState<'current' | 'next'>('next')

  // Query para obtener todas las rutas
  const { data: routesData, loading: routesLoading, error: routesError } = useQuery(GET_ROUTES_FOR_PDF, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all' // Permite datos parciales incluso con errores
  })

  // Query para obtener localidades de la ruta seleccionada
  const { data: routeData, loading: localitiesLoading } = useQuery(GET_ROUTE_LOCALITIES, {
    variables: { routeId: selectedRouteId },
    skip: !selectedRouteId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all' // Permite datos parciales incluso con errores
  })

  /**
   * Extrae localidades únicas con información del líder responsable
   */
  const localities = useMemo(() => {
    if (!routeData?.route?.employees) return []

    const localitiesMap = new Map<string, LocalityWithLeader>()
    const employees = routeData.route.employees as Employee[]

    // Solo incluir líderes (LEAD) con datos válidos - igual que la implementación original
    const leaders = employees.filter(
      (emp) =>
        emp.type === 'LEAD' &&
        emp.personalData && // Verificar que personalData existe
        emp.personalData.addresses && // Verificar que addresses existe
        Array.isArray(emp.personalData.addresses) // Verificar que es un array
    )

    leaders.forEach((leader) => {
      const leaderName = leader.personalData?.fullName || 'Sin nombre'

      leader.personalData?.addresses?.forEach((address) => {
        if (address?.location && !localitiesMap.has(address.location.id)) {
          localitiesMap.set(address.location.id, {
            id: address.location.id,
            name: address.location.name,
            leaderName,
            leaderId: leader.id
          })
        }
      })
    })

    // Convertir a array y ordenar alfabéticamente
    return Array.from(localitiesMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [routeData])

  /**
   * Maneja el cambio de ruta seleccionada
   */
  const handleRouteChange = useCallback((routeId: string) => {
    setSelectedRouteId(routeId)
    setSelectedLocalities(new Set()) // Limpiar selección al cambiar de ruta
  }, [])

  /**
   * Toggle de selección de una localidad
   */
  const toggleLocality = useCallback((localityId: string) => {
    setSelectedLocalities((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(localityId)) {
        newSet.delete(localityId)
      } else {
        newSet.add(localityId)
      }
      return newSet
    })
  }, [])

  /**
   * Selecciona todas las localidades
   */
  const selectAll = useCallback(() => {
    if (localities.length === 0) return
    const allIds = new Set(localities.map((l) => l.id))
    setSelectedLocalities(allIds)
  }, [localities])

  /**
   * Deselecciona todas las localidades
   */
  const selectNone = useCallback(() => {
    setSelectedLocalities(new Set())
  }, [])

  /**
   * Genera PDFs para las localidades seleccionadas
   */
  const handleGeneratePDFs = useCallback(async () => {
    if (selectedLocalities.size === 0) {
      toast({
        title: 'Sin selección',
        description: 'Por favor selecciona al menos una localidad',
        variant: 'destructive'
      })
      return
    }

    if (!routeData?.route) {
      toast({
        title: 'Error',
        description: 'No se encontró información de la ruta',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)

    try {
      let successCount = 0
      let errorCount = 0

      for (const localityId of selectedLocalities) {
        const locality = localities.find((l) => l.id === localityId)
        if (!locality) continue

        try {
          const params = new URLSearchParams({
            localityId,
            routeId: selectedRouteId,
            localityName: locality.name,
            routeName: routeData.route.name,
            leaderName: locality.leaderName,
            leaderId: locality.leaderId,
            weekMode
          })

          // Abrir PDF en nueva pestaña (usar API URL del servidor)
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
          const url = `${apiUrl}/api/generar-listados?${params.toString()}`
          window.open(url, '_blank')
          successCount++

          // Pequeña pausa entre PDFs para evitar sobrecarga
          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`Error generando PDF para ${locality.name}:`, error)
          errorCount++
        }
      }

      // Mostrar resultado
      if (successCount > 0) {
        toast({
          title: 'PDFs generados',
          description: `Se ${successCount === 1 ? 'generó' : 'generaron'} ${successCount} PDF${successCount === 1 ? '' : 's'} correctamente${errorCount > 0 ? `. ${errorCount} fallaron.` : '.'}`
        })
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: 'Error',
          description: 'No se pudo generar ningún PDF. Por favor intenta de nuevo.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error en generación masiva de PDFs:', error)
      toast({
        title: 'Error',
        description: 'Ocurrió un error al generar los PDFs',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }, [selectedLocalities, selectedRouteId, routeData, localities, weekMode, toast])

  return {
    // Data
    routes: routesData?.routes || [],
    localities,
    selectedRouteId,
    selectedLocalities,
    weekMode,

    // Loading states
    routesLoading,
    localitiesLoading,
    isGenerating,

    // Errors
    routesError,

    // Actions
    setSelectedRouteId: handleRouteChange,
    setWeekMode,
    toggleLocality,
    selectAll,
    selectNone,
    handleGeneratePDFs
  }
}
