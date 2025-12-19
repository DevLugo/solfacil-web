import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, MapPin } from 'lucide-react'
import { MoveLocalitiesPanel } from './MoveLocalitiesPanel'
import { useMoveLocalities } from '../hooks/useMoveLocalities'
import type { RouteWithStats, LocalityInfo } from '../types'

interface LocalityListProps {
  route: RouteWithStats
  otherRoutes: RouteWithStats[]
  onBack: () => void
}

/**
 * Shows localities within a route with multi-select functionality
 * Allows moving selected localities to another route
 */
export function LocalityList({ route, otherRoutes, onBack }: LocalityListProps) {
  const {
    selectedLocalities,
    targetRouteId,
    isMoving,
    toggleLocality,
    setTargetRouteId,
    handleMove,
    clearSelection,
  } = useMoveLocalities(route)

  // Build locality info for selected items
  const selectedLocalityInfo: LocalityInfo[] = useMemo(() => {
    return route.employees
      .filter((emp) => selectedLocalities.has(emp.id))
      .map((emp) => {
        const locality = emp.personalData?.addresses[0]?.location
        const hasMissingData = !emp.personalData

        return {
          employeeId: emp.id,
          employeeName: hasMissingData
            ? `⚠️ Missing Data (ID: ${emp.id.substring(0, 8)}...)`
            : emp.personalData?.fullName ?? 'No name',
          localityId: locality?.id ?? '',
          localityName: locality?.name ?? 'No locality',
        }
      })
  }, [route.employees, selectedLocalities])

  if (route.employees.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium text-foreground">No localities in this route</p>
            <p className="text-sm text-muted-foreground">
              This route has no assigned leaders
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" onClick={onBack} size="sm" className="shrink-0">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-foreground truncate">{route.routeName}</h2>
            <p className="text-sm text-muted-foreground">
              {route.employees.length} {route.employees.length === 1 ? 'locality' : 'localities'}
            </p>
          </div>
        </div>

        {selectedLocalities.size > 0 && (
          <Badge variant="secondary" className="text-sm shrink-0">
            {selectedLocalities.size} selected
          </Badge>
        )}
      </div>

      {/* Move Panel */}
      {selectedLocalities.size > 0 && (
        <MoveLocalitiesPanel
          count={selectedLocalities.size}
          sourceRoute={route}
          targetRoutes={otherRoutes}
          targetRouteId={targetRouteId}
          onTargetChange={setTargetRouteId}
          onMove={handleMove}
          onCancel={clearSelection}
          selectedLocalities={selectedLocalityInfo}
          isMoving={isMoving}
        />
      )}

      {/* Localities List */}
      <div className="grid gap-3 max-w-full">
        {route.employees.map((employee) => {
          const locality = employee.personalData?.addresses[0]?.location
          const isSelected = selectedLocalities.has(employee.id)
          const hasMissingData = !employee.personalData

          return (
            <Card
              key={employee.id}
              className={`transition-all max-w-full overflow-hidden ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : hasMissingData
                  ? 'border-destructive/50 bg-destructive/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <CardContent className="flex items-center gap-3 p-4 max-w-full">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleLocality(employee.id)}
                  disabled={isMoving}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                />

                <div className="flex-1 min-w-0 overflow-hidden">
                  {hasMissingData ? (
                    <>
                      <p className="font-medium text-destructive truncate">
                        ⚠️ Missing Personal Data
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        Employee ID: {employee.id}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground truncate">
                        {locality?.name ?? 'No locality'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        Leader: {employee.personalData?.fullName ?? 'No name'}
                      </p>
                    </>
                  )}
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="text-muted-foreground">
                      👥 {employee.activos}
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      ✓ {employee.alCorriente}
                    </span>
                    <span className="text-destructive">
                      ⚠ {employee.enCV}
                    </span>
                  </div>
                </div>

                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
