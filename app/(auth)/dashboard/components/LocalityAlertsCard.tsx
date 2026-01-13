'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, MapPin, Users, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

export interface LocalityAlert {
  locationId: string
  locationName: string
  routeName: string | null
  metricType: 'CV' | 'CLIENTES'
  previousValue: number
  currentValue: number // Number of critical clients
  percentChange: number // CV change percentage at route level
  direction: 'UP' | 'DOWN'
  totalPending?: number // Total pending amount
}

interface LocalityAlertsCardProps {
  alerts: LocalityAlert[]
}

export function LocalityAlertsCard({ alerts }: LocalityAlertsCardProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localidades Criticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Sin localidades con clientes criticos</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3 bg-amber-50/50 dark:bg-amber-950/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Localidades Criticas
          <Badge variant="secondary" className="ml-auto">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground mb-3">
          Localidades con mas clientes en CV critico (3+ semanas sin pagar)
        </p>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.locationId}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users className="h-5 w-5 text-red-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{alert.locationName}</p>
                  {alert.routeName && (
                    <p className="text-xs text-muted-foreground truncate">{alert.routeName}</p>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="font-bold bg-red-100 text-red-700 border-red-300 whitespace-nowrap text-xs"
                  >
                    {alert.currentValue} clientes
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-medium whitespace-nowrap',
                      alert.percentChange === 0
                        ? 'bg-gray-100 text-gray-600 border-gray-300'
                        : alert.direction === 'UP'
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-green-100 text-green-700 border-green-300'
                    )}
                  >
                    {alert.percentChange !== 0 && (
                      alert.direction === 'UP' ? (
                        <TrendingUp className="h-3 w-3 mr-1 inline" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1 inline" />
                      )
                    )}
                    {alert.percentChange > 0 ? '+' : ''}{alert.percentChange}%
                  </Badge>
                </div>
                {alert.totalPending !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(alert.totalPending)} pendiente
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
