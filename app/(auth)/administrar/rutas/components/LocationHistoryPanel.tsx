'use client'

import { useQuery } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { X, Plus, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { GET_LOCATION_ROUTE_HISTORY } from '@/graphql/queries/locationHistory'

interface LocationHistoryPanelProps {
  locationId: string
  locationName: string
  onClose: () => void
  onAddHistory: () => void
}

interface LocationRouteHistory {
  id: string
  locationId: string
  routeId: string
  route: {
    id: string
    name: string
  }
  startDate: string
  endDate: string | null
  createdAt: string
}

interface LocationRouteHistoryData {
  locationRouteHistory: LocationRouteHistory[]
}

export function LocationHistoryPanel({
  locationId,
  locationName,
  onClose,
  onAddHistory,
}: LocationHistoryPanelProps) {
  const { data, loading, error } = useQuery<LocationRouteHistoryData>(
    GET_LOCATION_ROUTE_HISTORY,
    {
      variables: { locationId },
      fetchPolicy: 'cache-and-network',
    }
  )

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] border-l bg-background shadow-lg">
      <Card className="h-full rounded-none border-0">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Historial de Asignaciones</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{locationName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col h-[calc(100%-5rem)] p-6">
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-px w-full" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-32 text-destructive">
                <p>Error al cargar el historial</p>
              </div>
            )}

            {!loading && !error && data?.locationRouteHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Clock className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No hay registros históricos</p>
              </div>
            )}

            {!loading && !error && data?.locationRouteHistory && (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[9px] top-0 bottom-0 w-px bg-border" />

                <div className="space-y-6">
                  {data.locationRouteHistory.map((history, index) => (
                    <div key={history.id} className="relative pl-8">
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{history.route.name}</h4>
                          {!history.endDate && (
                            <Badge variant="default" className="text-xs">
                              Actual
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {format(new Date(history.startDate), 'dd MMM yyyy', {
                              locale: es,
                            })}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span>
                            {history.endDate
                              ? format(new Date(history.endDate), 'dd MMM yyyy', {
                                  locale: es,
                                })
                              : 'Presente'}
                          </span>
                        </div>

                        {index < data.locationRouteHistory.length - 1 && (
                          <div className="h-px bg-border mt-4" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={onAddHistory}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar registro histórico
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
