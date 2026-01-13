'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin } from 'lucide-react'
import type { LocationCreated } from './types'

interface NewLocationsCardProps {
  locations: LocationCreated[]
  title?: string
}

export function NewLocationsCard({
  locations,
  title = 'Localidades Nuevas',
}: NewLocationsCardProps) {
  const description = locations.length > 0
    ? `${locations.length} este mes`
    : 'Sin nuevas este mes'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {locations.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 shrink-0">
                    <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{location.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {location.municipality.name}, {location.municipality.state.name}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {location.route && (
                    <Badge variant="outline" className="text-xs">{location.route.name}</Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(location.createdAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[100px] sm:h-[150px] text-muted-foreground">
            <Building2 className="h-8 w-8 sm:h-12 sm:w-12 mb-2 opacity-50" />
            <p className="text-sm">Sin localidades nuevas</p>
            <p className="text-xs">Este mes no se han abierto nuevas localidades</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
