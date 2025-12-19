'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Route {
  id: string
  name: string
}

interface RouteSelectorProps {
  routes: Route[]
  selectedRouteIds: string[]
  onSelectionChange: (routeIds: string[]) => void
}

export function RouteSelector({
  routes,
  selectedRouteIds,
  onSelectionChange,
}: RouteSelectorProps) {
  const handleToggle = (routeId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRouteIds, routeId])
    } else {
      onSelectionChange(selectedRouteIds.filter((id) => id !== routeId))
    }
  }

  const handleSelectAll = () => {
    if (selectedRouteIds.length === routes.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(routes.map((r) => r.id))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 pb-2 border-b">
        <Checkbox
          id="select-all"
          checked={selectedRouteIds.length === routes.length}
          onCheckedChange={handleSelectAll}
        />
        <Label htmlFor="select-all" className="text-sm font-medium">
          Seleccionar todas ({selectedRouteIds.length}/{routes.length})
        </Label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {routes.map((route) => (
          <div key={route.id} className="flex items-center space-x-2">
            <Checkbox
              id={`route-${route.id}`}
              checked={selectedRouteIds.includes(route.id)}
              onCheckedChange={(checked) => handleToggle(route.id, checked as boolean)}
            />
            <Label
              htmlFor={`route-${route.id}`}
              className="text-sm font-normal cursor-pointer"
            >
              {route.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
