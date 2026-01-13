'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, gql } from '@apollo/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Receipt, MapPin } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

// GraphQL query for expenses (current and previous week)
const GET_EXPENSES_COMPARISON = gql`
  query GetExpensesComparison(
    $routeIds: [ID!]!
    $currentWeekStart: DateTime!
    $currentWeekEnd: DateTime!
    $previousWeekStart: DateTime!
    $previousWeekEnd: DateTime!
  ) {
    currentWeek: transactionsSummaryByLocation(
      routeIds: $routeIds
      startDate: $currentWeekStart
      endDate: $currentWeekEnd
    ) {
      executiveSummary {
        totalExpenses
      }
      localities {
        expenses {
          source
          sourceLabel
          amount
        }
      }
    }
    previousWeek: transactionsSummaryByLocation(
      routeIds: $routeIds
      startDate: $previousWeekStart
      endDate: $previousWeekEnd
    ) {
      executiveSummary {
        totalExpenses
      }
      localities {
        expenses {
          source
          sourceLabel
          amount
        }
      }
    }
  }
`

interface Route {
  id: string
  name: string
}

interface ExpensesDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  routes: Route[]
  allRouteIds: string[]
  weekStart: string
  weekEnd: string
  previousWeekStart: string
  previousWeekEnd: string
  weekLabel?: string
  initialRouteId?: string | null
}

interface AggregatedExpense {
  source: string
  sourceLabel: string
  amount: number
  percentage: number
  previousAmount: number
  changePercent: number | null
}

// Mapping expense sources to readable labels
const EXPENSE_LABELS: Record<string, string> = {
  GASOLINE: 'Gasolina',
  GASOLINE_TOKA: 'Gasolina Toka',
  NOMINA_SALARY: 'Nómina',
  EXTERNAL_SALARY: 'Salario Externo',
  VIATIC: 'Viáticos',
  TRAVEL_EXPENSES: 'Gastos de Viaje',
  GENERAL_EXPENSE: 'Gastos Generales',
  OFFICE_SUPPLIES: 'Suministros Oficina',
  MAINTENANCE: 'Mantenimiento',
  COMMUNICATION: 'Comunicación',
  UTILITIES: 'Servicios',
  OTHER: 'Otros',
}

// Get label for expense source
function getExpenseLabel(source: string, originalLabel?: string): string {
  return EXPENSE_LABELS[source] || originalLabel || source
}

// Aggregate expenses from localities
function aggregateExpenses(
  localities: { expenses?: { source: string; sourceLabel: string; amount: string }[] }[]
): Map<string, { amount: number; label: string }> {
  const expenseMap = new Map<string, { amount: number; label: string }>()

  localities.forEach((locality) => {
    locality.expenses?.forEach((expense) => {
      const amount = parseFloat(expense.amount || '0')
      const existing = expenseMap.get(expense.source)

      if (existing) {
        existing.amount += amount
      } else {
        expenseMap.set(expense.source, {
          amount,
          label: getExpenseLabel(expense.source, expense.sourceLabel),
        })
      }
    })
  })

  return expenseMap
}

export function ExpensesDetailModal({
  open,
  onOpenChange,
  routes,
  allRouteIds,
  weekStart,
  weekEnd,
  previousWeekStart,
  previousWeekEnd,
  weekLabel = 'Semana Actual',
  initialRouteId,
}: ExpensesDetailModalProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all')

  // Reset to initial route when modal opens
  useEffect(() => {
    if (open) {
      setSelectedRouteId(initialRouteId || 'all')
    }
  }, [open, initialRouteId])

  // Determine which route IDs to query
  const queryRouteIds = useMemo(() => {
    if (selectedRouteId === 'all') {
      return allRouteIds
    }
    return [selectedRouteId]
  }, [selectedRouteId, allRouteIds])

  // Fetch expenses data for both weeks
  const { data, loading } = useQuery(GET_EXPENSES_COMPARISON, {
    variables: {
      routeIds: queryRouteIds,
      currentWeekStart: weekStart,
      currentWeekEnd: weekEnd,
      previousWeekStart,
      previousWeekEnd,
    },
    skip: !open || queryRouteIds.length === 0,
    fetchPolicy: 'cache-and-network',
  })

  const totalExpenses = parseFloat(
    data?.currentWeek?.executiveSummary?.totalExpenses || '0'
  )
  const previousTotalExpenses = parseFloat(
    data?.previousWeek?.executiveSummary?.totalExpenses || '0'
  )
  const currentLocalities = data?.currentWeek?.localities || []
  const previousLocalities = data?.previousWeek?.localities || []

  // Check if we have previous week data (check if any locality has expenses)
  const hasPreviousWeekData = useMemo(() => {
    if (previousTotalExpenses > 0) return true
    // Also check if any locality has expenses array with items
    return previousLocalities.some((loc: { expenses?: unknown[] }) =>
      loc.expenses && loc.expenses.length > 0
    )
  }, [previousTotalExpenses, previousLocalities])

  // Calculate total change percent (only if we have previous data)
  const totalChangePercent = useMemo(() => {
    // Si no hay datos de semana anterior, no mostrar cambio
    if (!hasPreviousWeekData || previousTotalExpenses === 0) {
      return null
    }
    return ((totalExpenses - previousTotalExpenses) / previousTotalExpenses) * 100
  }, [totalExpenses, previousTotalExpenses, hasPreviousWeekData])

  // Aggregate expenses by source type with comparison
  const aggregatedExpenses = useMemo<AggregatedExpense[]>(() => {
    const currentMap = aggregateExpenses(currentLocalities)
    const previousMap = aggregateExpenses(previousLocalities)

    // Get all unique sources from both weeks
    const allSources = new Set([...currentMap.keys(), ...previousMap.keys()])

    const result: AggregatedExpense[] = []
    allSources.forEach((source) => {
      const current = currentMap.get(source)
      const previous = previousMap.get(source)

      const currentAmount = current?.amount || 0
      const previousAmount = previous?.amount || 0

      // Only include if there's a current amount
      if (currentAmount > 0) {
        let changePercent: number | null = null
        // Solo calcular cambio si hay datos de semana anterior
        if (hasPreviousWeekData && previousAmount > 0) {
          changePercent = ((currentAmount - previousAmount) / previousAmount) * 100
        }
        // Si hay datos de semana anterior pero este tipo de gasto no existía, es "nuevo"
        // Usamos Infinity como marcador especial para "Nuevo"
        else if (hasPreviousWeekData && previousAmount === 0) {
          changePercent = Infinity // Marcador para "Nuevo"
        }
        // Si no hay datos de semana anterior, dejamos null

        result.push({
          source,
          sourceLabel: current?.label || previous?.label || source,
          amount: currentAmount,
          percentage: totalExpenses > 0 ? (currentAmount / totalExpenses) * 100 : 0,
          previousAmount,
          changePercent,
        })
      }
    })

    // Sort by amount descending
    return result.sort((a, b) => b.amount - a.amount)
  }, [currentLocalities, previousLocalities, totalExpenses, hasPreviousWeekData])

  const handleRouteChange = (value: string) => {
    setSelectedRouteId(value)
  }

  const selectedRouteName = selectedRouteId === 'all'
    ? 'Todas las rutas'
    : routes.find(r => r.id === selectedRouteId)?.name || 'Ruta'

  // Format dates for display
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
    return `${startDate.toLocaleDateString('es-MX', options)} - ${endDate.toLocaleDateString('es-MX', options)}`
  }

  const currentWeekRange = formatDateRange(weekStart, weekEnd)
  const previousWeekRange = formatDateRange(previousWeekStart, previousWeekEnd)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span>Detalle de Gastos - {weekLabel}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Actual: {currentWeekRange} | Anterior: {previousWeekRange}
          </p>
        </DialogHeader>

        {/* Route Filter */}
        <div className="flex items-center gap-2 py-2 border-b">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrar por ruta:</span>
          <Select value={selectedRouteId} onValueChange={handleRouteChange}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Seleccionar ruta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">Todas las rutas</span>
              </SelectItem>
              {routes.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {route.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
          <div>
            <span className="text-sm text-muted-foreground">Total Gastos</span>
            {selectedRouteId !== 'all' && (
              <p className="text-xs text-muted-foreground">{selectedRouteName}</p>
            )}
          </div>
          {loading ? (
            <Skeleton className="h-7 w-32" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{formatCurrency(totalExpenses)}</span>
              {totalChangePercent !== null ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-medium',
                    totalChangePercent > 0
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : totalChangePercent < 0
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : ''
                  )}
                >
                  {totalChangePercent > 0 ? '+' : ''}{totalChangePercent.toFixed(0)}% vs sem. ant.
                </Badge>
              ) : !hasPreviousWeekData ? (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Sin datos sem. ant.
                </Badge>
              ) : null}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : aggregatedExpenses.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Gasto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-[140px]">% del Total</TableHead>
                <TableHead className="text-right w-[100px]">vs Sem. Ant.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregatedExpenses.map((expense) => (
                <TableRow key={expense.source}>
                  <TableCell className="font-medium">
                    {expense.sourceLabel}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={expense.percentage}
                        className="h-2 flex-1"
                      />
                      <span className="text-xs font-mono w-10 text-right">
                        {expense.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {expense.changePercent === Infinity ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-100 text-blue-700 border-blue-300"
                      >
                        Nuevo
                      </Badge>
                    ) : expense.changePercent !== null ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-mono',
                          expense.changePercent > 0
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : expense.changePercent < 0
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : ''
                        )}
                      >
                        {expense.changePercent > 0 ? '+' : ''}{expense.changePercent.toFixed(0)}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">Sin gastos registrados</p>
            <p className="text-xs">No hay gastos para el periodo seleccionado</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
