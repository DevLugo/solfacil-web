'use client'

import * as React from 'react'
import { useQuery } from '@apollo/client'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { TrendingUp, CalendarIcon, RefreshCw, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  GET_ROUTES_FOR_AUDIT,
  PROFIT_AUDIT_REPORT,
  ProfitAuditReport,
  RouteOption,
} from './queries'
import { AuditSummaryCards } from './components/audit-summary-cards'
import { AuditMonthTable } from './components/audit-month-table'
import { AuditDetailTable } from './components/audit-detail-table'
import { ApplyFixDialog } from './components/apply-fix-dialog'

export default function ValidarProfitsPage() {
  // Default: last 6 months
  const today = new Date()
  const [fromDate, setFromDate] = React.useState<Date>(startOfMonth(subMonths(today, 5)))
  const [toDate, setToDate] = React.useState<Date>(endOfMonth(today))
  const [routeId, setRouteId] = React.useState<string | undefined>(undefined)
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)
  const [fixDialogOpen, setFixDialogOpen] = React.useState(false)

  const routesQuery = useQuery<{ routes: RouteOption[] }>(GET_ROUTES_FOR_AUDIT)
  const routes = routesQuery.data?.routes ?? []

  const reportQuery = useQuery<{ profitAuditReport: ProfitAuditReport }>(PROFIT_AUDIT_REPORT, {
    variables: {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      routeId: routeId ?? null,
    },
    fetchPolicy: 'cache-and-network',
  })

  const report = reportQuery.data?.profitAuditReport

  const handleRefetch = () => {
    reportQuery.refetch()
  }

  const handleFixCompleted = () => {
    reportQuery.refetch()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Validar Profits de Abonos/Créditos</CardTitle>
              <CardDescription>
                Detecta inconsistencias en <code>Loan.profitAmount</code> y distribución de
                ganancia en <code>AccountEntry</code>, y aplica correcciones de forma masiva.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Desde</label>
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !fromDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate
                      ? format(fromDate, 'dd/MM/yyyy', { locale: es })
                      : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(d) => {
                      if (d) {
                        setFromDate(d)
                        setFromOpen(false)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hasta</label>
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !toDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(d) => {
                      if (d) {
                        setToDate(d)
                        setToOpen(false)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ruta</label>
              <Select
                value={routeId ?? 'all'}
                onValueChange={(v) => setRouteId(v === 'all' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las rutas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las rutas</SelectItem>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium opacity-0">Acciones</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefetch}
                  disabled={reportQuery.loading}
                  className="flex-1"
                >
                  <RefreshCw
                    className={cn('h-4 w-4 mr-2', reportQuery.loading && 'animate-spin')}
                  />
                  Refrescar
                </Button>
                <Button
                  onClick={() => setFixDialogOpen(true)}
                  disabled={!report || report.totalLoans === 0}
                  className="flex-1"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Aplicar fix
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <AuditSummaryCards report={report} loading={reportQuery.loading} />

      {/* Desglose por mes */}
      <AuditMonthTable buckets={report?.byMonth ?? []} loading={reportQuery.loading} />

      {/* Detalle */}
      <AuditDetailTable fromDate={fromDate} toDate={toDate} routeId={routeId} />

      {/* Diálogo de aplicación */}
      <ApplyFixDialog
        open={fixDialogOpen}
        onOpenChange={setFixDialogOpen}
        fromDate={fromDate}
        toDate={toDate}
        routeId={routeId}
        totalLoans={report?.totalLoans ?? 0}
        totalDifference={report?.totalDifference ?? 0}
        totalAffectedEntries={report?.totalAffectedEntries ?? 0}
        onCompleted={handleFixCompleted}
      />
    </div>
  )
}
