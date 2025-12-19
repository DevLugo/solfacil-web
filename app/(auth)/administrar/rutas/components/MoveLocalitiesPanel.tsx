import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRight, X, Users, AlertCircle, CheckCircle2, MoveRight } from 'lucide-react'
import { MoveConfirmationModal } from './MoveConfirmationModal'
import type { RouteWithStats, LocalityInfo } from '../types'

interface MoveLocalitiesPanelProps {
  count: number
  sourceRoute: RouteWithStats
  targetRoutes: RouteWithStats[]
  targetRouteId: string
  onTargetChange: (routeId: string) => void
  onMove: () => Promise<void>
  onCancel: () => void
  selectedLocalities: LocalityInfo[]
  isMoving: boolean
}

/**
 * Panel for moving localities between routes
 * Shows clear visual indication of source → destination with KPIs
 */
export function MoveLocalitiesPanel({
  count,
  sourceRoute,
  targetRoutes,
  targetRouteId,
  onTargetChange,
  onMove,
  onCancel,
  selectedLocalities,
  isMoving,
}: MoveLocalitiesPanelProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const targetRoute = targetRoutes.find((r) => r.routeId === targetRouteId)

  // Calculate KPIs of selected localities
  const selectedEmployeeIds = new Set(selectedLocalities.map((l) => l.employeeId))
  const selectedKPIs = sourceRoute.employees
    .filter((emp) => selectedEmployeeIds.has(emp.id))
    .reduce(
      (acc, emp) => ({
        activos: acc.activos + emp.activos,
        enCV: acc.enCV + emp.enCV,
        alCorriente: acc.alCorriente + emp.alCorriente,
      }),
      { activos: 0, enCV: 0, alCorriente: 0 }
    )

  // Calculate projected KPIs after move
  const sourceAfterMove = {
    activos: sourceRoute.totalActivos - selectedKPIs.activos,
    enCV: sourceRoute.enCV - selectedKPIs.enCV,
    alCorriente: sourceRoute.alCorriente - selectedKPIs.alCorriente,
  }

  const targetAfterMove = targetRoute
    ? {
        activos: targetRoute.totalActivos + selectedKPIs.activos,
        enCV: targetRoute.enCV + selectedKPIs.enCV,
        alCorriente: targetRoute.alCorriente + selectedKPIs.alCorriente,
      }
    : null

  const handleConfirmMove = async () => {
    setShowConfirmModal(false)
    await onMove()
  }

  return (
    <>
      <Card className="border-primary bg-card max-w-full overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2 min-w-0">
              <MoveRight className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">Move Route Localities</span>
            </CardTitle>
            <Button
              onClick={onCancel}
              disabled={isMoving}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 max-w-full overflow-hidden">
          {/* Selection Info */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Badge variant="default" className="bg-primary text-primary-foreground">
              {count} {count === 1 ? 'locality' : 'localities'}
            </Badge>
            <span className="text-sm text-foreground">
              selected to move
            </span>
          </div>

          {/* Route Transfer Visual */}
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-start max-w-full overflow-hidden">
            {/* Source Route Card */}
            <div className="p-3 rounded-lg border border-border bg-muted/50 space-y-2 min-w-0 overflow-hidden">
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="font-semibold text-foreground truncate">{sourceRoute.routeName}</p>

              {/* Current KPIs */}
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-primary" />
                  <span className="text-foreground">{sourceRoute.totalActivos}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-foreground">{sourceRoute.alCorriente}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span className="text-foreground">{sourceRoute.enCV}</span>
                </div>
              </div>

              {/* Projected KPIs after move */}
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground mb-1">After move:</p>
                <div className="flex gap-2 text-xs font-medium">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-primary" />
                    <span className="text-primary">{sourceAfterMove.activos}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <span className="text-green-600 dark:text-green-400">{sourceAfterMove.alCorriente}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    <span className="text-destructive">{sourceAfterMove.enCV}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-primary" />
            </div>

            {/* Target Route Selector */}
            <div className="space-y-2 min-w-0 overflow-hidden">
              <p className="text-xs text-muted-foreground">Destination</p>
              <Select value={targetRouteId} onValueChange={onTargetChange}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select route..." />
                </SelectTrigger>
                <SelectContent>
                  {targetRoutes.map((route) => (
                    <SelectItem key={route.routeId} value={route.routeId}>
                      <div className="flex items-center gap-2">
                        <span>{route.routeName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({route.totalActivos} active)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Target Route KPIs */}
              {targetRoute && targetAfterMove && (
                <div className="p-3 rounded-lg border border-border bg-muted/50 space-y-2 min-w-0 overflow-hidden">
                  {/* Current KPIs */}
                  <div className="flex gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-primary" />
                      <span className="text-foreground">{targetRoute.totalActivos}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-foreground">{targetRoute.alCorriente}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-destructive" />
                      <span className="text-foreground">{targetRoute.enCV}</span>
                    </div>
                  </div>

                  {/* Projected KPIs after move */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">After move:</p>
                    <div className="flex gap-2 text-xs font-medium">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-primary" />
                        <span className="text-primary">{targetAfterMove.activos}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                        <span className="text-green-600 dark:text-green-400">{targetAfterMove.alCorriente}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-destructive" />
                        <span className="text-destructive">{targetAfterMove.enCV}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={() => setShowConfirmModal(true)}
            disabled={!targetRouteId || isMoving}
            className="w-full bg-primary text-primary-foreground"
          >
            {isMoving ? 'Moving...' : 'Confirm Move'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <MoveConfirmationModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        sourceRouteName={sourceRoute.routeName}
        targetRouteName={targetRoute?.routeName ?? ''}
        localities={selectedLocalities}
        onConfirm={handleConfirmMove}
        isLoading={isMoving}
      />
    </>
  )
}
