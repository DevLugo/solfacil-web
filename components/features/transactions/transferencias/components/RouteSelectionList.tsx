'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { RouteWithBalance } from '../hooks/useBatchTransferData'

interface RouteSelectionListProps {
  routes: RouteWithBalance[]
  selectedRouteIds: Set<string>
  onRouteToggle: (routeId: string) => void
  onSelectAll: () => void
  emptyMessage?: string
  labelPrefix?: string
  height?: string
  renderRouteContent: (route: RouteWithBalance, isSelected: boolean) => ReactNode
}

export function RouteSelectionList({
  routes,
  selectedRouteIds,
  onRouteToggle,
  onSelectAll,
  emptyMessage = 'No hay rutas disponibles',
  labelPrefix = 'Seleccionar Rutas',
  height = 'h-[300px]',
  renderRouteContent,
}: RouteSelectionListProps) {
  const allSelected = selectedRouteIds.size === routes.length && routes.length > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {labelPrefix}
          {selectedRouteIds.size > 0 && ` (${selectedRouteIds.size} seleccionadas)`}
        </Label>
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
        </Button>
      </div>

      <ScrollArea className={`${height} rounded-md border p-4`}>
        {routes.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">{emptyMessage}</div>
        ) : (
          <div className="space-y-3">
            {routes.map((route) => {
              const isSelected = selectedRouteIds.has(route.id)
              return (
                <div
                  key={route.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onRouteToggle(route.id)}
                    />
                    <span className="font-medium truncate">{route.name}</span>
                  </div>
                  {renderRouteContent(route, isSelected)}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
