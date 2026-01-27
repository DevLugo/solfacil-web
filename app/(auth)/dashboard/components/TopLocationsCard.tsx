'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TopLocation } from './types'

interface TopLocationsCardProps {
  locations: TopLocation[]
  title?: string
  description?: string
}

export function TopLocationsCard({
  locations,
  title = 'Top Localidades CV Críticos',
  description = 'Localidades con más clientes críticos (3+ sem sin pago)',
}: TopLocationsCardProps) {

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          <span className="truncate">{title}</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {locations.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location, index) => (
              <div
                key={location.locationId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0',
                    index === 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                    index === 1 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' :
                    index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{location.locationName}</p>
                    {location.routeName && (
                      <p className="text-xs text-muted-foreground truncate">{location.routeName}</p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-red-100 text-red-700 border-red-300 font-bold shrink-0"
                >
                  {location.clientesEnCV} clientes
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[100px] sm:h-[150px] text-muted-foreground">
            <MapPin className="h-8 w-8 sm:h-12 sm:w-12 mb-2 opacity-50" />
            <p className="text-sm">Sin localidades con clientes criticos</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
