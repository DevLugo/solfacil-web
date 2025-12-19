import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle2, AlertCircle } from 'lucide-react'
import type { RouteWithStats } from '../types'

interface RouteStatsCardProps {
  stats: Pick<RouteWithStats, 'totalActivos' | 'enCV' | 'alCorriente'>
}

/**
 * Displays route statistics in a grid layout with theme-aware badges
 * Shows Activos, Pagando (Al Corriente), and CV counts
 */
export function RouteStatsCard({ stats }: RouteStatsCardProps) {
  const cvPercentage = stats.totalActivos > 0
    ? Math.round((stats.enCV / stats.totalActivos) * 100)
    : 0

  return (
    <div className="space-y-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Activos */}
        <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-primary/10">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-2xl font-bold text-foreground">{stats.totalActivos}</span>
          <span className="text-xs text-muted-foreground">Activos</span>
        </div>

        {/* Al Corriente (Pagando) */}
        <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-400" />
          <span className="text-2xl font-bold text-foreground">{stats.alCorriente}</span>
          <span className="text-xs text-muted-foreground">Pagando</span>
        </div>

        {/* CV */}
        <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-2xl font-bold text-foreground">{stats.enCV}</span>
          <span className="text-xs text-muted-foreground">CV</span>
        </div>
      </div>

      {/* CV Percentage Indicator */}
      {stats.totalActivos > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Cartera Vencida</span>
            <Badge
              variant={cvPercentage > 20 ? 'destructive' : cvPercentage > 10 ? 'secondary' : 'default'}
              className="text-xs"
            >
              {cvPercentage}%
            </Badge>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${
                cvPercentage > 20
                  ? 'bg-destructive'
                  : cvPercentage > 10
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(cvPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
