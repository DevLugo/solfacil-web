'use client'

import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  MapPin,
  Users,
  UserPlus,
  RefreshCw,
  UserMinus,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  UserCheck,
  UserX,
} from 'lucide-react'
import type {
  LocalityReport,
  LocalityBreakdownDetail,
  LocalityWeekData,
  WeekRange,
} from '../hooks'
import { formatDateShort } from '../utils'

interface LocalityWeeklyTableProps {
  report: LocalityReport | null
  loading?: boolean
  onLocalityClick?: (locality: LocalityBreakdownDetail, weekNumber?: number) => void
}

function WeekCell({ data, isCompleted }: { data: LocalityWeekData; isCompleted: boolean }) {
  // If week is not completed, show "En Curso" message
  if (!isCompleted) {
    return (
      <div className="space-y-1.5 min-w-[120px] opacity-50">
        <div className="flex items-center justify-center py-4">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
            En Curso
          </Badge>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Semana sin completar
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 min-w-[120px]">
      {/* Cartera */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Activos:</span>
        <span className="font-medium">{data.clientesActivos}</span>
      </div>

      {/* Movimientos */}
      <div className="flex flex-wrap gap-1 text-xs">
        {data.nuevos > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800">
            <UserPlus className="h-3 w-3 mr-0.5" />
            {data.nuevos}
          </Badge>
        )}
        {data.renovados > 0 && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
            <RefreshCw className="h-3 w-3 mr-0.5" />
            {data.renovados}
          </Badge>
        )}
        {data.finalizados > 0 && (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400 border-gray-200 dark:border-gray-800">
            <UserMinus className="h-3 w-3 mr-0.5" />
            {data.finalizados}
          </Badge>
        )}
      </div>

      {/* CV */}
      <div className="flex items-center gap-1">
        <Badge
          variant={data.clientesEnCV > 0 ? 'destructive' : 'secondary'}
          className={cn(
            'text-xs',
            data.clientesEnCV === 0 && 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
          )}
        >
          CV: {data.clientesEnCV}
        </Badge>
      </div>

      {/* Balance */}
      {data.balance !== 0 && (
        <div className="flex items-center gap-1 text-xs">
          {data.balance > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          <span
            className={cn(
              'font-medium',
              data.balance > 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {data.balance > 0 ? '+' : ''}{data.balance}
          </span>
        </div>
      )}
    </div>
  )
}

function SummaryCell({ summary }: { summary: LocalityBreakdownDetail['summary'] }) {
  // Fallback for backwards compatibility with NaN protection
  const cvPromedioRaw = summary.cvPromedio ?? summary.totalClientesEnCV ?? 0
  const cvPromedio = Number.isNaN(cvPromedioRaw) ? 0 : cvPromedioRaw
  const porcentajePagandoRaw = summary.porcentajePagando ?? 0
  const porcentajePagando = Number.isNaN(porcentajePagandoRaw) ? 0 : porcentajePagandoRaw

  return (
    <div className="space-y-1.5 min-w-[140px] bg-muted/30 rounded-md p-2">
      {/* Activos */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-bold">{summary.totalClientesActivos}</span>
      </div>

      {/* Movimientos del mes */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="flex items-center gap-1">
          <UserPlus className="h-3 w-3 text-green-600" />
          <span>{summary.totalNuevos}</span>
        </div>
        <div className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 text-blue-600" />
          <span>{summary.totalRenovados}</span>
        </div>
        <div className="flex items-center gap-1">
          <UserMinus className="h-3 w-3 text-gray-600" />
          <span>{summary.totalFinalizados}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Reint:</span>
          <span>{summary.totalReintegros}</span>
        </div>
      </div>

      {/* CV Promedio */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">CV Prom:</span>
        <Badge
          variant={cvPromedio > 0 ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {cvPromedio.toFixed(1)}
        </Badge>
      </div>

      {/* % Pagando */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">% Paga:</span>
        <span
          className={cn(
            'font-medium',
            porcentajePagando >= 80
              ? 'text-green-600'
              : porcentajePagando >= 60
                ? 'text-yellow-600'
                : 'text-red-600'
          )}
        >
          {porcentajePagando.toFixed(0)}%
        </span>
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between text-xs border-t pt-1">
        <span className="text-muted-foreground">Balance:</span>
        <span
          className={cn(
            'font-bold',
            summary.balance > 0
              ? 'text-green-600'
              : summary.balance < 0
                ? 'text-red-600'
                : 'text-muted-foreground'
          )}
        >
          {summary.balance > 0 ? '+' : ''}{summary.balance}
        </span>
      </div>
    </div>
  )
}

function LocalityRow({
  locality,
  weeks,
  onLocalityClick,
}: {
  locality: LocalityBreakdownDetail
  weeks: WeekRange[]
  onLocalityClick?: (locality: LocalityBreakdownDetail, weekNumber?: number) => void
}) {
  return (
    <TableRow className="hover:bg-muted/50">
      {/* Locality Name - clicking here opens modal with latest week */}
      <TableCell
        className="sticky left-0 bg-background z-10 border-r cursor-pointer hover:bg-muted"
        onClick={() => onLocalityClick?.(locality)}
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate max-w-[150px]">{locality.localityName}</p>
            {locality.routeName && locality.routeName !== locality.localityName && (
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                {locality.routeName}
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </TableCell>

      {/* Week Cells - clicking a specific week opens modal for that week */}
      {locality.weeklyData.map((weekData, idx) => (
        <TableCell
          key={weeks[idx]?.weekNumber ?? idx}
          className="border-r cursor-pointer hover:bg-muted/70"
          onClick={() => weekData.isCompleted && onLocalityClick?.(locality, weeks[idx]?.weekNumber)}
        >
          <WeekCell data={weekData} isCompleted={weekData.isCompleted} />
        </TableCell>
      ))}

      {/* Summary - clicking here opens modal with latest week */}
      <TableCell
        className="cursor-pointer hover:bg-muted/70"
        onClick={() => onLocalityClick?.(locality)}
      >
        <SummaryCell summary={locality.summary} />
      </TableCell>
    </TableRow>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}

function ConsolidatedSummary({ totals }: { totals: LocalityBreakdownDetail['summary'] }) {
  const cvPercentage = totals.totalClientesActivos > 0
    ? ((totals.totalClientesEnCV / totals.totalClientesActivos) * 100).toFixed(1)
    : '0.0'

  // Fallback for backwards compatibility with cached data
  const alCorrientePromedioRaw = totals.alCorrientePromedio ?? totals.totalClientesAlCorriente ?? 0
  const alCorrientePromedio = Number.isNaN(alCorrientePromedioRaw) ? 0 : alCorrientePromedioRaw
  const cvPromedioRaw = totals.cvPromedio ?? totals.totalClientesEnCV ?? 0
  const cvPromedio = Number.isNaN(cvPromedioRaw) ? 0 : cvPromedioRaw

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Clientes Activos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clientes Activos (Total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totals.totalClientesActivos}</div>
          <p className="text-xs text-muted-foreground mt-1">Última semana completada</p>
        </CardContent>
      </Card>

      {/* Al Corriente (Promedio) */}
      <Card className="border-green-200 dark:border-green-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            Al Corriente (Prom.)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {alCorrientePromedio.toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Promedio semanal ({(totals.porcentajePagando ?? 0).toFixed(1)}%)
          </p>
        </CardContent>
      </Card>

      {/* En CV (Promedio) */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UserX className="h-4 w-4 text-red-600" />
            En CV (Prom.)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">
            {cvPromedio.toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Promedio semanal ({cvPercentage}%)
          </p>
        </CardContent>
      </Card>

      {/* Renovados */}
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            Renovados (Total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            {totals.totalRenovados}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totals.totalFinalizados} no renovados
          </p>
        </CardContent>
      </Card>

      {/* Nuevos */}
      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-emerald-600" />
            Nuevos (Total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-emerald-600">
            {totals.totalNuevos}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Balance: {totals.balance > 0 ? '+' : ''}{totals.balance}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function LocalityWeeklyTable({
  report,
  loading,
  onLocalityClick,
}: LocalityWeeklyTableProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (loading) {
    return <TableSkeleton />
  }

  if (!report || report.localities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">Sin datos de localidades</h3>
        <p className="text-sm text-muted-foreground">
          No hay localidades con clientes activos en este período
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Consolidated Summary */}
      <ConsolidatedSummary totals={report.totals} />

      {/* Toggle Details Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowDetails(!showDetails)}
          className="gap-2"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              showDetails && 'rotate-180'
            )}
          />
          {showDetails ? 'Ocultar Detalles' : 'Ver Detalles por Localidad'}
        </Button>
      </div>

      {/* Detailed Table */}
      {showDetails && (
        <div className="overflow-auto max-h-[600px] border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-20">
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-30 border-r min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localidad
                  </div>
                </TableHead>
                {report.weeks.map((week) => (
                  <TableHead key={week.weekNumber} className="text-center border-r min-w-[140px]">
                    <div>
                      <p className="font-medium">Semana {week.weekNumber}</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {formatDateShort(week.start)} - {formatDateShort(week.end)}
                      </p>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[160px]">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    Resumen
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.localities.map((locality) => (
                <LocalityRow
                  key={locality.localityId}
                  locality={locality}
                  weeks={report.weeks}
                  onLocalityClick={onLocalityClick}
                />
              ))}
              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell className="sticky left-0 bg-muted/50 z-10 border-r">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-bold">TOTALES</span>
                  </div>
                </TableCell>
                {report.weeks.map((week, idx) => {
                  // Sum up data for this week across all localities
                  const weekTotals = report.localities.reduce(
                    (acc, loc) => {
                      const weekData = loc.weeklyData[idx]
                      if (weekData) {
                        acc.clientesActivos += weekData.clientesActivos
                        acc.clientesEnCV += weekData.clientesEnCV
                        acc.nuevos += weekData.nuevos
                        acc.renovados += weekData.renovados
                        acc.finalizados += weekData.finalizados
                        acc.balance += weekData.balance
                      }
                      return acc
                    },
                    {
                      clientesActivos: 0,
                      clientesEnCV: 0,
                      nuevos: 0,
                      renovados: 0,
                      finalizados: 0,
                      balance: 0,
                    }
                  )
                  return (
                    <TableCell key={week.weekNumber} className="border-r">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Activos:</span>
                          <span className="font-bold">{weekTotals.clientesActivos}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>CV:</span>
                          <span className="font-bold">{weekTotals.clientesEnCV}</span>
                        </div>
                      </div>
                    </TableCell>
                  )
                })}
                <TableCell>
                  <SummaryCell summary={report.totals} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
