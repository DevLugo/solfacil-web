'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WeeklyComparisonTableProps {
  currentWeek: {
    weekNumber: number
    clientesActivos: number
    clientesEnCV: number
    criticalClients?: number
  } | null
  previousWeek: {
    weekNumber: number
    clientesActivos: number
    clientesEnCV: number
    criticalClients?: number
  } | null
  monthStart: {
    clientesActivos: number
    clientesEnCV?: number
    criticalClients?: number
  } | null
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous
  if (delta === 0) return <span className="text-muted-foreground text-xs">-</span>

  const isPositive = delta > 0
  const colorClasses = isPositive
    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300'
    : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-300'

  return (
    <Badge variant="outline" className={cn('ml-1 sm:ml-2 text-[10px] sm:text-xs px-1 sm:px-2', colorClasses)}>
      {delta > 0 ? '+' : ''}{delta}
    </Badge>
  )
}

export function WeeklyComparisonTable({
  currentWeek,
  previousWeek,
  monthStart,
}: WeeklyComparisonTableProps) {
  if (!currentWeek) return null

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 shrink-0" />
          <span className="truncate">Comparacion Semanal</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-3 sm:p-6">
        <Table className="min-w-[320px] text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] sm:w-[140px] text-xs sm:text-sm">Metrica</TableHead>
              <TableHead className="text-center text-xs sm:text-sm whitespace-nowrap">
                S{currentWeek.weekNumber}
                <span className="hidden sm:inline text-xs text-muted-foreground ml-1">(actual)</span>
              </TableHead>
              {previousWeek && (
                <TableHead className="text-center text-xs sm:text-sm whitespace-nowrap">
                  S{previousWeek.weekNumber}
                </TableHead>
              )}
              {monthStart && (
                <TableHead className="text-center text-xs sm:text-sm whitespace-nowrap">Inicio</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium text-xs sm:text-sm">Activos</TableCell>
              <TableCell className="text-center font-bold text-xs sm:text-sm">{currentWeek.clientesActivos}</TableCell>
              {previousWeek && (
                <TableCell className="text-center text-xs sm:text-sm">
                  {previousWeek.clientesActivos}
                  <DeltaBadge current={currentWeek.clientesActivos} previous={previousWeek.clientesActivos} />
                </TableCell>
              )}
              {monthStart && (
                <TableCell className="text-center text-xs sm:text-sm">
                  {monthStart.clientesActivos}
                  <DeltaBadge current={currentWeek.clientesActivos} previous={monthStart.clientesActivos} />
                </TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-xs sm:text-sm">CV</TableCell>
              <TableCell className="text-center font-bold text-xs sm:text-sm">{currentWeek.clientesEnCV}</TableCell>
              {previousWeek && (
                <TableCell className="text-center text-xs sm:text-sm">
                  {previousWeek.clientesEnCV}
                  <DeltaBadge current={currentWeek.clientesEnCV} previous={previousWeek.clientesEnCV} />
                </TableCell>
              )}
              {monthStart?.clientesEnCV !== undefined && (
                <TableCell className="text-center text-xs sm:text-sm">
                  {monthStart.clientesEnCV}
                  <DeltaBadge current={currentWeek.clientesEnCV} previous={monthStart.clientesEnCV} />
                </TableCell>
              )}
            </TableRow>
            {currentWeek.criticalClients !== undefined && (
              <TableRow>
                <TableCell className="font-medium text-xs sm:text-sm">CV 4+</TableCell>
                <TableCell className="text-center font-bold text-red-600 dark:text-red-400 text-xs sm:text-sm">
                  {currentWeek.criticalClients}
                </TableCell>
                {previousWeek?.criticalClients !== undefined && (
                  <TableCell className="text-center text-xs sm:text-sm">
                    {previousWeek.criticalClients}
                    <DeltaBadge current={currentWeek.criticalClients} previous={previousWeek.criticalClients} />
                  </TableCell>
                )}
                {monthStart?.criticalClients !== undefined && (
                  <TableCell className="text-center text-xs sm:text-sm">
                    {monthStart.criticalClients}
                    <DeltaBadge current={currentWeek.criticalClients} previous={monthStart.criticalClients} />
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
