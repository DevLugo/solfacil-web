import { CheckSquare, Square, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LocalityCheckbox } from './LocalityCheckbox'

interface LocalityWithLeader {
  id: string
  name: string
  leaderName: string
  leaderId: string
}

interface LocalityGridProps {
  localities: LocalityWithLeader[]
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
  loading?: boolean
}

export function LocalityGrid({
  localities,
  selected,
  onToggle,
  onSelectAll,
  onSelectNone,
  loading
}: LocalityGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            2
          </span>
          Seleccionar Localidades
        </CardTitle>
        <CardDescription>
          Selecciona las localidades para las cuales deseas generar PDFs de cobranza
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : localities.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No hay localidades disponibles para esta ruta
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Botones de selección */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onSelectAll}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Seleccionar Todas
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onSelectNone}
                disabled={selected.size === 0}
              >
                <Square className="h-4 w-4 mr-2" />
                Ninguna
              </Button>
              {selected.size > 0 && (
                <div className="flex items-center text-sm text-muted-foreground ml-2">
                  <span className="font-medium">{selected.size}</span>
                  <span className="ml-1">
                    {selected.size === 1 ? 'localidad seleccionada' : 'localidades seleccionadas'}
                  </span>
                </div>
              )}
            </div>

            {/* Grid de localidades */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {localities.map((locality) => (
                <LocalityCheckbox
                  key={locality.id}
                  locality={locality}
                  checked={selected.has(locality.id)}
                  onToggle={() => onToggle(locality.id)}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
