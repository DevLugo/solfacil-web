'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Calendar,
  MapPin,
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Wallet,
  PiggyBank,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GET_FINANCIAL_REPORT_ANNUAL, GET_ROUTES } from '@/graphql/queries/reports'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

// Types
interface Route {
  id: string
  name: string
}

interface MonthlyFinancialData {
  month: string
  totalExpenses: string
  generalExpenses: string
  nomina: string
  comissions: string
  nominaInterna: string
  salarioExterno: string
  viaticos: string
  travelExpenses: string
  tokaGasolina: string
  cashGasolina: string
  totalGasolina: string
  badDebtAmount: string
  incomes: string
  operationalProfit: string
  profitPercentage: string
  gainPerPayment: string
  activeWeeks: number
  weeklyAverageProfit: string
  weeklyAverageExpenses: string
  weeklyAverageIncome: string
  loanDisbursements: string
  carteraActiva: number
  carteraVencida: number
  carteraMuerta: string
  renovados: number
  totalIncomingCash: string
  capitalReturn: string
  profitReturn: string
  operationalCashUsed: string
  totalInvestment: string
  availableCash: string
  paymentsCount: number
}

interface AnnualFinancialReport {
  routes: Route[]
  year: number
  months: string[]
  data: MonthlyFinancialData[]
  annualWeeklyAverageProfit: string
  annualWeeklyAverageExpenses: string
  annualWeeklyAverageIncome: string
  totalActiveWeeks: number
}

// Utility functions
function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (numValue === 0) return '-'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue)
}

function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (numValue === 0) return '-'
  return `${numValue.toFixed(1)}%`
}

function getValueColor(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400'
  if (value < 0) return 'text-red-600 dark:text-red-400'
  return 'text-muted-foreground'
}

// Loading skeleton
function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// Month names
const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

export default function FinancialReportPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Available years
  const availableYears = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  // Fetch routes
  const { data: routesData, loading: routesLoading } = useQuery<{ routes: Route[] }>(GET_ROUTES)
  const routes = routesData?.routes || []

  // Fetch annual report
  const { data, loading, error, refetch } = useQuery<{ getFinancialReportAnnual: AnnualFinancialReport }>(
    GET_FINANCIAL_REPORT_ANNUAL,
    {
      variables: { routeIds: selectedRouteIds, year: selectedYear },
      skip: selectedRouteIds.length === 0,
      fetchPolicy: 'network-only',
    }
  )

  const report = data?.getFinancialReportAnnual

  // Calculate annual totals
  const annualTotals = useMemo(() => {
    if (!report?.data) return null

    const totals: Record<string, number> = {}
    const numericFields = [
      'totalExpenses', 'generalExpenses', 'nomina', 'comissions',
      'nominaInterna', 'salarioExterno', 'viaticos', 'travelExpenses',
      'tokaGasolina', 'cashGasolina', 'totalGasolina', 'badDebtAmount',
      'incomes', 'operationalProfit', 'loanDisbursements',
      'totalIncomingCash', 'capitalReturn', 'profitReturn',
      'operationalCashUsed', 'totalInvestment', 'availableCash'
    ]
    const countFields = ['activeWeeks', 'carteraActiva', 'carteraVencida', 'renovados', 'paymentsCount']

    numericFields.forEach(field => { totals[field] = 0 })
    countFields.forEach(field => { totals[field] = 0 })

    report.data.forEach((monthData) => {
      numericFields.forEach(field => {
        const value = parseFloat((monthData as unknown as Record<string, string>)[field] || '0')
        totals[field] += value
      })
      countFields.forEach(field => {
        totals[field] += (monthData as unknown as Record<string, number>)[field] || 0
      })
    })

    // Calculate salarios total
    totals.salarios = totals.nominaInterna + totals.salarioExterno + totals.viaticos

    // Calculate gastos operativos total
    totals.gastosOperativos = totals.generalExpenses + totals.comissions + totals.salarios + totals.travelExpenses

    // Calculate gastos totales
    totals.gastosTotales = totals.gastosOperativos + totals.badDebtAmount

    return totals
  }, [report?.data])

  // Chart data
  const chartData = useMemo(() => {
    if (!report?.data) return []
    return report.data.map((monthData, idx) => {
      const salarios = parseFloat(monthData.nominaInterna) + parseFloat(monthData.salarioExterno) + parseFloat(monthData.viaticos)
      const gastosOp = parseFloat(monthData.generalExpenses) + parseFloat(monthData.comissions) + salarios + parseFloat(monthData.travelExpenses)
      return {
        month: MONTH_NAMES[idx],
        ingresos: parseFloat(monthData.incomes),
        gastos: gastosOp + parseFloat(monthData.badDebtAmount),
        gananciaOperativa: parseFloat(monthData.operationalProfit),
        deudaMala: parseFloat(monthData.badDebtAmount),
        gasolina: parseFloat(monthData.totalGasolina),
        tokaGasolina: parseFloat(monthData.tokaGasolina),
        cashGasolina: parseFloat(monthData.cashGasolina),
        carteraActiva: monthData.carteraActiva,
        carteraVencida: monthData.carteraVencida,
      }
    })
  }, [report?.data])

  // Chart configs using CSS variables from globals.css (auto dark/light mode)
  const profitChartConfig: ChartConfig = {
    ingresos: {
      label: 'Ingresos',
      color: 'hsl(var(--chart-3))',  // Verde
    },
    gastos: {
      label: 'Gastos',
      color: 'hsl(var(--chart-6))',  // Rojo
    },
  }

  const trendChartConfig: ChartConfig = {
    gananciaOperativa: {
      label: 'Ganancia Operativa',
      color: 'hsl(var(--chart-2))',  // Azul
    },
  }

  const gasolinaChartConfig: ChartConfig = {
    tokaGasolina: {
      label: 'TOKA',
      color: 'hsl(var(--chart-1))',  // Naranja
    },
    cashGasolina: {
      label: 'Efectivo',
      color: 'hsl(var(--chart-4))',  // Amarillo
    },
  }

  const carteraChartConfig: ChartConfig = {
    carteraActiva: {
      label: 'Créditos Activos',
      color: 'hsl(var(--chart-3))',  // Verde
    },
    carteraVencida: {
      label: 'Cartera Vencida',
      color: 'hsl(var(--chart-6))',  // Rojo
    },
  }

  // Handle route selection
  const toggleRoute = (routeId: string) => {
    setSelectedRouteIds(prev =>
      prev.includes(routeId)
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    )
  }

  const selectAllRoutes = () => {
    setSelectedRouteIds(routes.map(r => r.id))
  }

  const clearRoutes = () => {
    setSelectedRouteIds([])
  }

  // Generate report
  const handleGenerateReport = async () => {
    if (selectedRouteIds.length === 0) return
    setIsGenerating(true)
    try {
      await refetch()
    } finally {
      setIsGenerating(false)
    }
  }

  // Get report title
  const getReportTitle = () => {
    if (!report) return ''
    if (report.routes.length === 1) {
      return `${report.routes[0].name} - ${report.year}`
    }
    if (report.routes.length === routes.length) {
      return `Todas las Rutas - ${report.year}`
    }
    return `${report.routes.length} Rutas Combinadas - ${report.year}`
  }

  if (routesLoading) {
    return <ReportSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reporte Financiero Anual</h1>
            <p className="text-muted-foreground">
              Análisis comparativo de gastos, ingresos y ganancias por mes
            </p>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuración del Reporte</CardTitle>
          <CardDescription>
            Selecciona las rutas y el año para generar el reporte financiero anual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-[1fr_200px_160px]">
            {/* Routes Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Rutas
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllRoutes}>
                    Todas
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearRoutes}>
                    Ninguna
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto rounded-md border p-3 bg-muted/30">
                {routes.map((route) => (
                  <label
                    key={route.id}
                    className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded p-1"
                  >
                    <Checkbox
                      checked={selectedRouteIds.includes(route.id)}
                      onCheckedChange={() => toggleRoute(route.id)}
                    />
                    <span className="truncate">{route.name}</span>
                  </label>
                ))}
              </div>
              {selectedRouteIds.length > 0 && (
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900">
                  {selectedRouteIds.length} ruta{selectedRouteIds.length !== 1 ? 's' : ''} seleccionada{selectedRouteIds.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Year Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Año
              </label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                disabled={selectedRouteIds.length === 0 || loading || isGenerating}
                className="w-full"
              >
                {(loading || isGenerating) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Generar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 py-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold">Error al cargar el reporte</h3>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(loading || isGenerating) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Generando reporte financiero...</p>
            <p className="text-sm text-muted-foreground">Esto puede tomar unos momentos</p>
          </CardContent>
        </Card>
      )}

      {/* Report Table */}
      {!loading && !isGenerating && report && annualTotals && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{getReportTitle()}</CardTitle>
                {report.routes.length > 1 && (
                  <Badge variant="secondary" className="mt-2 bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400">
                    Reporte combinado de {report.routes.length} rutas
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-primary text-primary-foreground">
                    <th className="sticky left-0 z-20 bg-primary text-left px-4 py-3 font-semibold min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                      CONCEPTO
                    </th>
                    {MONTH_NAMES.map((month) => (
                      <th key={month} className="text-center px-3 py-3 font-semibold min-w-[90px] border-l border-primary-foreground/20">
                        {month}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-bold min-w-[100px] bg-primary-foreground/10 border-l border-primary-foreground/20">
                      ANUAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* SECTION: EGRESOS OPERATIVOS */}
                  <tr className="bg-red-100 dark:bg-red-950/50">
                    <td colSpan={14} className="px-4 py-3 text-center font-bold text-red-800 dark:text-red-400 text-sm tracking-wide">
                      EGRESOS OPERATIVOS
                    </td>
                  </tr>

                  {/* Gastos Totales */}
                  <tr className="border-b hover:bg-muted/50">
                    <td className="sticky left-0 z-10 bg-background px-4 py-2 font-semibold shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      GASTOS TOTALES
                    </td>
                    {report.data.map((monthData, idx) => {
                      const salarios = parseFloat(monthData.nominaInterna) + parseFloat(monthData.salarioExterno) + parseFloat(monthData.viaticos)
                      const gastosOp = parseFloat(monthData.generalExpenses) + parseFloat(monthData.comissions) + salarios + parseFloat(monthData.travelExpenses)
                      const total = gastosOp + parseFloat(monthData.badDebtAmount)
                      return (
                        <td key={idx} className={cn('text-center px-2 py-2 font-semibold border-l', getValueColor(-total))}>
                          {formatCurrency(total)}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2 font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-l">
                      {formatCurrency(annualTotals.gastosTotales)}
                    </td>
                  </tr>

                  {/* Gastos Operativos */}
                  <tr className="border-b bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                    <td className="sticky left-0 z-10 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      Gastos Operativos
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className={cn('text-center px-2 py-2 font-medium border-l', getValueColor(-parseFloat(monthData.generalExpenses)))}>
                        {formatCurrency(monthData.generalExpenses)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-2 font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-l">
                      {formatCurrency(annualTotals.generalExpenses)}
                    </td>
                  </tr>

                  {/* Comisiones */}
                  <tr className="border-b bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                    <td className="sticky left-0 z-10 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      Comisiones
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className={cn('text-center px-2 py-2 font-medium border-l', getValueColor(-parseFloat(monthData.comissions)))}>
                        {formatCurrency(monthData.comissions)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-2 font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-l">
                      {formatCurrency(annualTotals.comissions)}
                    </td>
                  </tr>

                  {/* Salarios */}
                  <tr className="border-b bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                    <td className="sticky left-0 z-10 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      Salarios
                    </td>
                    {report.data.map((monthData, idx) => {
                      const total = parseFloat(monthData.nominaInterna) + parseFloat(monthData.salarioExterno) + parseFloat(monthData.viaticos)
                      return (
                        <td key={idx} className={cn('text-center px-2 py-2 font-medium border-l', getValueColor(-total))}>
                          {formatCurrency(total)}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2 font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-l">
                      {formatCurrency(annualTotals.salarios)}
                    </td>
                  </tr>

                  {/* Sub-items: Nómina */}
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/50 text-[10px]">
                    <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 pl-8 pr-4 py-1.5 text-muted-foreground shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      ├─ Nómina
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className="text-center px-2 py-1.5 text-muted-foreground border-l">
                        {formatCurrency(monthData.nominaInterna)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-1.5 bg-slate-100 dark:bg-slate-800/50 border-l">-</td>
                  </tr>

                  {/* Sub-items: Salario Externo */}
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/50 text-[10px]">
                    <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 pl-8 pr-4 py-1.5 text-muted-foreground shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      ├─ Salario Externo
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className="text-center px-2 py-1.5 text-muted-foreground border-l">
                        {formatCurrency(monthData.salarioExterno)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-1.5 bg-slate-100 dark:bg-slate-800/50 border-l">-</td>
                  </tr>

                  {/* Sub-items: Viáticos */}
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/50 text-[10px]">
                    <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 pl-8 pr-4 py-1.5 text-muted-foreground shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      └─ Viáticos
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className="text-center px-2 py-1.5 text-muted-foreground border-l">
                        {formatCurrency(monthData.viaticos)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-1.5 bg-slate-100 dark:bg-slate-800/50 border-l">-</td>
                  </tr>

                  {/* Connect (Travel Expenses) */}
                  <tr className="border-b bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                    <td className="sticky left-0 z-10 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      Connect
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className={cn('text-center px-2 py-2 font-medium border-l', getValueColor(-parseFloat(monthData.travelExpenses)))}>
                        {formatCurrency(monthData.travelExpenses)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-2 font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-l">
                      {formatCurrency(annualTotals.travelExpenses)}
                    </td>
                  </tr>

                  {/* Gasolina */}
                  <tr className="border-b bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                    <td className="sticky left-0 z-10 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      Gasolina
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className={cn('text-center px-2 py-2 font-medium border-l', getValueColor(-parseFloat(monthData.totalGasolina)))}>
                        {formatCurrency(monthData.totalGasolina)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-2 font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-l">
                      {formatCurrency(annualTotals.totalGasolina)}
                    </td>
                  </tr>

                  {/* Sub-items: TOKA */}
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/50 text-[10px]">
                    <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 pl-8 pr-4 py-1.5 text-muted-foreground shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      ├─ TOKA
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className="text-center px-2 py-1.5 text-muted-foreground border-l">
                        {formatCurrency(monthData.tokaGasolina)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-1.5 bg-slate-100 dark:bg-slate-800/50 border-l">-</td>
                  </tr>

                  {/* Sub-items: Efectivo */}
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/50 text-[10px]">
                    <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 pl-8 pr-4 py-1.5 text-muted-foreground shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      └─ Efectivo
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className="text-center px-2 py-1.5 text-muted-foreground border-l">
                        {formatCurrency(monthData.cashGasolina)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-1.5 bg-slate-100 dark:bg-slate-800/50 border-l">-</td>
                  </tr>

                  {/* Deuda Mala */}
                  <tr className="border-b bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                    <td className="sticky left-0 z-10 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      Deuda Mala
                    </td>
                    {report.data.map((monthData, idx) => {
                      const val = parseFloat(monthData.badDebtAmount)
                      return (
                        <td key={idx} className={cn('text-center px-2 py-2 font-medium border-l', val > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground')}>
                          {formatCurrency(monthData.badDebtAmount)}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2 font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-l">
                      {formatCurrency(annualTotals.badDebtAmount)}
                    </td>
                  </tr>

                  {/* SECTION: INGRESOS */}
                  <tr className="bg-green-100 dark:bg-green-950/50">
                    <td colSpan={14} className="px-4 py-3 text-center font-bold text-green-800 dark:text-green-400 text-sm tracking-wide">
                      INGRESOS
                    </td>
                  </tr>

                  {/* Ingresos por Cobranza */}
                  <tr className="border-b hover:bg-muted/50">
                    <td className="sticky left-0 z-10 bg-background px-4 py-2 font-semibold shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      INGRESOS POR COBRANZA
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className={cn('text-center px-2 py-2 font-semibold border-l', getValueColor(parseFloat(monthData.incomes)))}>
                        {formatCurrency(monthData.incomes)}
                      </td>
                    ))}
                    <td className="text-center px-2 py-2 font-bold bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-l">
                      {formatCurrency(annualTotals.incomes)}
                    </td>
                  </tr>

                  {/* SECTION: RESULTADOS FINANCIEROS */}
                  <tr className="bg-purple-100 dark:bg-purple-950/50">
                    <td colSpan={14} className="px-4 py-3 text-center font-bold text-purple-800 dark:text-purple-400 text-sm tracking-wide">
                      RESULTADOS FINANCIEROS
                    </td>
                  </tr>

                  {/* Ganancias Operativas */}
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50">
                    <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 font-bold shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      GANANCIAS OPERATIVAS
                    </td>
                    {report.data.map((monthData, idx) => {
                      const val = parseFloat(monthData.operationalProfit)
                      return (
                        <td key={idx} className={cn('text-center px-2 py-2.5 font-bold border-l', getValueColor(val))}>
                          {formatCurrency(val)}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2.5 font-bold bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-l">
                      {formatCurrency(annualTotals.operationalProfit)}
                    </td>
                  </tr>

                  {/* % Ganancia Operativa */}
                  <tr className="border-b bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50">
                    <td className="sticky left-0 z-10 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      % GANANCIA OPERATIVA
                    </td>
                    {report.data.map((monthData, idx) => {
                      const val = parseFloat(monthData.profitPercentage)
                      return (
                        <td key={idx} className={cn('text-center px-2 py-2 font-semibold border-l', getValueColor(val))}>
                          {formatPercent(val)}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2 font-bold bg-amber-100 dark:bg-amber-950/50 border-l">-</td>
                  </tr>

                  {/* Ganancia por Pago Recibido */}
                  <tr className="border-b bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-950/50">
                    <td className="sticky left-0 z-10 bg-cyan-50 dark:bg-cyan-950/30 px-4 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      GANANCIA POR PAGO
                    </td>
                    {report.data.map((monthData, idx) => {
                      const val = parseFloat(monthData.gainPerPayment)
                      return (
                        <td key={idx} className={cn('text-center px-2 py-2 font-semibold border-l', val > 0 ? 'text-teal-700 dark:text-teal-400' : 'text-muted-foreground')}>
                          {formatCurrency(val)}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2 font-bold bg-cyan-100 dark:bg-cyan-950/50 text-teal-700 dark:text-teal-400 border-l">
                      {(() => {
                        const avgGain = annualTotals.paymentsCount > 0
                          ? annualTotals.profitReturn / annualTotals.paymentsCount
                          : 0
                        return formatCurrency(avgGain)
                      })()}
                    </td>
                  </tr>

                  {/* SECTION: GANANCIA SEMANAL */}
                  <tr className="bg-blue-100 dark:bg-blue-950/50">
                    <td colSpan={14} className="px-4 py-3 text-center font-bold text-blue-800 dark:text-blue-400 text-sm tracking-wide">
                      GANANCIA SEMANAL (Promedio por Semanas Activas)
                    </td>
                  </tr>

                  {/* Semanas Activas */}
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/50">
                    <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      Semanas Activas
                    </td>
                    {report.data.map((monthData, idx) => (
                      <td key={idx} className="text-center px-2 py-2 text-slate-600 dark:text-slate-400 border-l">
                        {monthData.activeWeeks} sem
                      </td>
                    ))}
                    <td className="text-center px-2 py-2 font-bold bg-slate-100 dark:bg-slate-800/50 border-l">
                      {report.totalActiveWeeks} sem
                    </td>
                  </tr>

                  {/* Ganancia Semanal */}
                  <tr className="border-b bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50">
                    <td className="sticky left-0 z-10 bg-blue-50 dark:bg-blue-950/30 px-4 py-2.5 font-bold shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      GANANCIA SEMANAL
                    </td>
                    {report.data.map((monthData, idx) => {
                      const val = parseFloat(monthData.weeklyAverageProfit)
                      return (
                        <td key={idx} className={cn('text-center px-2 py-2.5 font-bold border-l border-blue-200 dark:border-blue-900', getValueColor(val))}>
                          {formatCurrency(val)}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2.5 font-bold bg-blue-100 dark:bg-blue-950/50 text-green-700 dark:text-green-400 border-l border-blue-300 dark:border-blue-900">
                      {formatCurrency(report.annualWeeklyAverageProfit)}
                    </td>
                  </tr>

                  {/* Gastos Semanales */}
                  <tr className="border-b bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50">
                    <td className="sticky left-0 z-10 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 font-bold shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      GASTOS SEMANALES
                    </td>
                    {report.data.map((monthData, idx) => {
                      const val = parseFloat(monthData.weeklyAverageExpenses)
                      return (
                        <td key={idx} className={cn('text-center px-2 py-2.5 font-bold border-l border-red-200 dark:border-red-900', getValueColor(-val))}>
                          {formatCurrency(val)}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2.5 font-bold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-l border-red-300 dark:border-red-900">
                      {formatCurrency(report.annualWeeklyAverageExpenses)}
                    </td>
                  </tr>

                  {/* Cobranza Semanal */}
                  <tr className="border-b bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50">
                    <td className="sticky left-0 z-10 bg-green-50 dark:bg-green-950/30 px-4 py-2.5 font-bold shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      COBRANZA SEMANAL
                    </td>
                    {report.data.map((monthData, idx) => {
                      const val = parseFloat(monthData.weeklyAverageIncome)
                      return (
                        <td key={idx} className={cn('text-center px-2 py-2.5 font-bold border-l border-green-200 dark:border-green-900', getValueColor(val))}>
                          {formatCurrency(val)}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2.5 font-bold bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-l border-green-300 dark:border-green-900">
                      {formatCurrency(report.annualWeeklyAverageIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      {!loading && !isGenerating && report && annualTotals && chartData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Ingresos vs Gastos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ingresos vs Gastos</CardTitle>
              <CardDescription>Comparación mensual</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={profitChartConfig} className="min-h-[300px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="var(--color-gastos)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Tendencia de Ganancias */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendencia de Ganancias</CardTitle>
              <CardDescription>Evolución de ganancia operativa</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={trendChartConfig} className="min-h-[300px] w-full">
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="gananciaOperativa"
                    stroke="var(--color-gananciaOperativa)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-gananciaOperativa)' }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gasolina por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gastos de Gasolina</CardTitle>
              <CardDescription>TOKA vs Efectivo</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={gasolinaChartConfig} className="min-h-[300px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="tokaGasolina" stackId="a" fill="var(--color-tokaGasolina)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="cashGasolina" stackId="a" fill="var(--color-cashGasolina)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Cartera Activa vs Vencida */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio de Créditos</CardTitle>
              <CardDescription>Activos vs Vencidos</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={carteraChartConfig} className="min-h-[300px] w-full">
                <AreaChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="carteraActiva"
                    stackId="1"
                    stroke="var(--color-carteraActiva)"
                    fill="var(--color-carteraActiva)"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="carteraVencida"
                    stackId="2"
                    stroke="var(--color-carteraVencida)"
                    fill="var(--color-carteraVencida)"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State - No routes selected */}
      {!loading && !isGenerating && !report && selectedRouteIds.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Selecciona Rutas</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Usa los checkboxes de arriba para seleccionar una o más rutas y generar el reporte financiero anual
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State - Routes selected but no data */}
      {!loading && !isGenerating && !report && selectedRouteIds.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generar Reporte</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Haz clic en &quot;Generar&quot; para crear el reporte financiero de las rutas seleccionadas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
