'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Filter,
  RefreshCw,
  Skull,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

// GraphQL Queries
const GET_DEAD_DEBT_MONTHLY_SUMMARY = gql`
  query DeadDebtMonthlySummary(
    $year: Int!
    $routeId: ID
    $localities: [String!]
    $weeksSinceLoanMin: Int
    $weeksWithoutPaymentMin: Int
    $badDebtStatus: DeadDebtStatus
  ) {
    deadDebtMonthlySummary(
      year: $year
      routeId: $routeId
      localities: $localities
      weeksSinceLoanMin: $weeksSinceLoanMin
      weeksWithoutPaymentMin: $weeksWithoutPaymentMin
      badDebtStatus: $badDebtStatus
    ) {
      year
      yearTotals {
        totalLoans
        totalPendingAmount
        totalBadDebtCandidate
      }
      routesInfo {
        id
        name
      }
      monthlySummary {
        month {
          year
          month
          name
          startDate
          endDate
        }
        evaluationPeriod {
          from
          to
          description
        }
        criteria {
          weeksSinceLoanMin
          weeksWithoutPaymentMin
          badDebtStatus
        }
        summary {
          totalLoans
          totalPendingAmount
          totalBadDebtCandidate
        }
        loans {
          id
          amountGived
          signDate
          pendingAmountStored
          badDebtDate
          badDebtCandidate
          weeksSinceLoan
          weeksWithoutPayment
          borrower {
            fullName
            clientCode
          }
          lead {
            fullName
            locality
            route
          }
        }
      }
    }
    routes {
      id
      name
    }
  }
`

const MARK_LOANS_AS_DEAD_DEBT = gql`
  mutation MarkLoansAsDeadDebt($loanIds: [ID!]!, $deadDebtDate: DateTime!) {
    markLoansAsDeadDebt(loanIds: $loanIds, deadDebtDate: $deadDebtDate) {
      success
      message
      count
    }
  }
`

// Types
interface DeadDebtLoan {
  id: string
  amountGived: string
  signDate: string
  pendingAmountStored: string
  badDebtDate: string | null
  badDebtCandidate: string
  weeksSinceLoan: number
  weeksWithoutPayment: number
  borrower: {
    fullName: string
    clientCode: string
  }
  lead: {
    fullName: string
    locality: string
    route: string
  }
}

interface MonthSummary {
  month: {
    year: number
    month: number
    name: string
    startDate: string
    endDate: string
  }
  evaluationPeriod: {
    from: string
    to: string
    description: string
  }
  summary: {
    totalLoans: number
    totalPendingAmount: string
    totalBadDebtCandidate: string
  }
  loans: DeadDebtLoan[]
}

interface Route {
  id: string
  name: string
}

// Helper to get last day of month
function getLastDayOfMonth(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().split('T')[0]
}

// KPI Card Component
function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  loading,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  variant?: 'default' | 'warning' | 'danger' | 'success'
  loading?: boolean
}) {
  const variants = {
    default: 'bg-card',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  }

  const iconColors = {
    default: 'text-muted-foreground',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
  }

  if (loading) {
    return (
      <Card className={cn('border', variants[variant])}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border', variants[variant])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <Icon className={cn('h-8 w-8', iconColors[variant])} />
        </div>
      </CardContent>
    </Card>
  )
}

// Month Card Component
function MonthCard({
  monthData,
  selectedLoans,
  onSelectLoan,
  onSelectAllMonth,
  onMarkMonth,
  isMarking,
}: {
  monthData: MonthSummary
  selectedLoans: Set<string>
  onSelectLoan: (loanId: string) => void
  onSelectAllMonth: (loans: DeadDebtLoan[]) => void
  onMarkMonth: (monthData: MonthSummary) => void
  isMarking: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const hasLoans = monthData.loans.length > 0
  const allSelected = hasLoans && monthData.loans.every(loan => selectedLoans.has(loan.id))
  const someSelected = hasLoans && monthData.loans.some(loan => selectedLoans.has(loan.id))

  const selectedInMonth = monthData.loans.filter(loan => selectedLoans.has(loan.id))
  const selectedTotal = selectedInMonth.reduce((sum, loan) => sum + parseFloat(loan.badDebtCandidate), 0)

  return (
    <Card className={cn(
      'transition-all',
      hasLoans && 'hover:shadow-md',
      someSelected && 'ring-2 ring-primary/50'
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChevronDown className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )} />
                <div>
                  <CardTitle className="text-lg">{monthData.month.name}</CardTitle>
                  <CardDescription>
                    {monthData.summary.totalLoans} créditos
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-sm text-muted-foreground">Deuda Pendiente</p>
                  <p className="font-semibold">{formatCurrency(parseFloat(monthData.summary.totalPendingAmount))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cartera Muerta</p>
                  <p className="font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(parseFloat(monthData.summary.totalBadDebtCandidate))}
                  </p>
                </div>
                {hasLoans && (
                  <Badge variant={monthData.summary.totalLoans > 0 ? 'destructive' : 'secondary'}>
                    {monthData.summary.totalLoans}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {hasLoans ? (
              <div className="space-y-4">
                {/* Selection summary */}
                {someSelected && (
                  <div className="bg-primary/10 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        {selectedInMonth.length} crédito(s) seleccionado(s)
                      </span>
                      <span className="text-muted-foreground">
                        ({formatCurrency(selectedTotal)} cartera muerta)
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`select-all-${monthData.month.month}`}
                      checked={allSelected}
                      onCheckedChange={() => onSelectAllMonth(monthData.loans)}
                    />
                    <Label htmlFor={`select-all-${monthData.month.month}`} className="text-sm">
                      Seleccionar todos
                    </Label>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onMarkMonth(monthData)}
                    disabled={isMarking || monthData.loans.length === 0}
                  >
                    {isMarking ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Skull className="h-4 w-4 mr-2" />
                    )}
                    Marcar Mes Completo
                  </Button>
                </div>

                {/* Loans table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Localidad / Ruta</TableHead>
                        <TableHead className="text-center">Sem. Crédito</TableHead>
                        <TableHead className="text-center">Sem. Sin Pago</TableHead>
                        <TableHead className="text-right">Pendiente</TableHead>
                        <TableHead className="text-right">Cartera Muerta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthData.loans.map((loan) => (
                        <TableRow
                          key={loan.id}
                          className={cn(
                            'cursor-pointer hover:bg-muted/50',
                            selectedLoans.has(loan.id) && 'bg-primary/5'
                          )}
                          onClick={() => onSelectLoan(loan.id)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedLoans.has(loan.id)}
                              onCheckedChange={() => onSelectLoan(loan.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{loan.borrower.fullName}</p>
                              <p className="text-xs text-muted-foreground">{loan.borrower.clientCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{loan.lead.locality}</p>
                              <p className="text-xs text-muted-foreground">{loan.lead.route}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{loan.weeksSinceLoan}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={loan.weeksWithoutPayment >= 8 ? 'destructive' : 'secondary'}>
                              {loan.weeksWithoutPayment}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(parseFloat(loan.pendingAmountStored))}
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(parseFloat(loan.badDebtCandidate))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>No hay créditos que cumplan los criterios en este mes</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default function CarteraMuertaPage() {
  // Hooks
  const { toast } = useToast()

  // State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [weeksSinceLoanMin, setWeeksSinceLoanMin] = useState<number | undefined>(17)
  const [weeksWithoutPaymentMin, setWeeksWithoutPaymentMin] = useState<number | undefined>(8)
  const [badDebtStatus, setBadDebtStatus] = useState<'ALL' | 'MARKED' | 'UNMARKED'>('UNMARKED')
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(undefined)
  const [selectedLoans, setSelectedLoans] = useState<Set<string>>(new Set())
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingMarkAction, setPendingMarkAction] = useState<{
    type: 'selected' | 'month' | 'all'
    monthData?: MonthSummary
    date?: string
  } | null>(null)

  // Query
  const { data, loading, error, refetch } = useQuery(GET_DEAD_DEBT_MONTHLY_SUMMARY, {
    variables: {
      year: selectedYear,
      routeId: selectedRouteId || null,
      weeksSinceLoanMin: weeksSinceLoanMin || null,
      weeksWithoutPaymentMin: weeksWithoutPaymentMin || null,
      badDebtStatus,
    },
    fetchPolicy: 'cache-and-network',
  })

  // Mutation
  const [markLoansAsDeadDebt, { loading: isMarking }] = useMutation(MARK_LOANS_AS_DEAD_DEBT, {
    onCompleted: (data) => {
      if (data.markLoansAsDeadDebt.success) {
        toast({
          title: 'Éxito',
          description: data.markLoansAsDeadDebt.message,
        })
        setSelectedLoans(new Set())
        refetch()
      } else {
        toast({
          title: 'Error',
          description: data.markLoansAsDeadDebt.message,
          variant: 'destructive',
        })
      }
      setConfirmDialogOpen(false)
      setPendingMarkAction(null)
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      setConfirmDialogOpen(false)
      setPendingMarkAction(null)
    },
  })

  // Computed values
  const monthlySummary = data?.deadDebtMonthlySummary?.monthlySummary || []
  const yearTotals = data?.deadDebtMonthlySummary?.yearTotals
  const routes = data?.routes || []

  // Get all loans from all months
  const allLoans = useMemo(() => {
    return monthlySummary.flatMap((m: MonthSummary) => m.loans)
  }, [monthlySummary])

  // Calculate selected totals
  const selectedTotals = useMemo(() => {
    const selectedLoansList = allLoans.filter((loan: DeadDebtLoan) => selectedLoans.has(loan.id))
    return {
      count: selectedLoansList.length,
      pendingAmount: selectedLoansList.reduce((sum: number, loan: DeadDebtLoan) =>
        sum + parseFloat(loan.pendingAmountStored), 0),
      badDebtCandidate: selectedLoansList.reduce((sum: number, loan: DeadDebtLoan) =>
        sum + parseFloat(loan.badDebtCandidate), 0),
    }
  }, [allLoans, selectedLoans])

  // Handlers
  const handleSelectLoan = (loanId: string) => {
    setSelectedLoans(prev => {
      const next = new Set(prev)
      if (next.has(loanId)) {
        next.delete(loanId)
      } else {
        next.add(loanId)
      }
      return next
    })
  }

  const handleSelectAllMonth = (loans: DeadDebtLoan[]) => {
    setSelectedLoans(prev => {
      const next = new Set(prev)
      const allSelected = loans.every(loan => prev.has(loan.id))
      if (allSelected) {
        loans.forEach(loan => next.delete(loan.id))
      } else {
        loans.forEach(loan => next.add(loan.id))
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedLoans.size === allLoans.length) {
      setSelectedLoans(new Set())
    } else {
      setSelectedLoans(new Set(allLoans.map((loan: DeadDebtLoan) => loan.id)))
    }
  }

  const handleMarkSelected = () => {
    if (selectedLoans.size === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona al menos un crédito',
        variant: 'destructive',
      })
      return
    }
    const now = new Date()
    setPendingMarkAction({
      type: 'selected',
      date: getLastDayOfMonth(now.getFullYear(), now.getMonth() + 1),
    })
    setConfirmDialogOpen(true)
  }

  const handleMarkMonth = (monthData: MonthSummary) => {
    setPendingMarkAction({
      type: 'month',
      monthData,
      date: getLastDayOfMonth(monthData.month.year, monthData.month.month),
    })
    setConfirmDialogOpen(true)
  }

  const handleMarkAll = () => {
    const now = new Date()
    setPendingMarkAction({
      type: 'all',
      date: getLastDayOfMonth(now.getFullYear(), now.getMonth() + 1),
    })
    setConfirmDialogOpen(true)
  }

  const handleConfirmMark = () => {
    if (!pendingMarkAction?.date) return

    let loanIds: string[] = []

    if (pendingMarkAction.type === 'selected') {
      loanIds = Array.from(selectedLoans)
    } else if (pendingMarkAction.type === 'month' && pendingMarkAction.monthData) {
      loanIds = pendingMarkAction.monthData.loans.map(loan => loan.id)
    } else if (pendingMarkAction.type === 'all') {
      loanIds = allLoans.map((loan: DeadDebtLoan) => loan.id)
    }

    if (loanIds.length === 0) {
      toast({
        title: 'Error',
        description: 'No hay créditos para marcar',
        variant: 'destructive',
      })
      return
    }

    markLoansAsDeadDebt({
      variables: {
        loanIds,
        deadDebtDate: new Date(pendingMarkAction.date).toISOString(),
      },
    })
  }

  // Get confirmation message
  const getConfirmMessage = () => {
    if (!pendingMarkAction) return { title: '', description: '', count: 0, amount: 0 }

    if (pendingMarkAction.type === 'selected') {
      return {
        title: 'Marcar créditos seleccionados',
        description: `¿Está seguro de marcar ${selectedTotals.count} crédito(s) como cartera muerta?`,
        count: selectedTotals.count,
        amount: selectedTotals.badDebtCandidate,
      }
    } else if (pendingMarkAction.type === 'month' && pendingMarkAction.monthData) {
      const total = parseFloat(pendingMarkAction.monthData.summary.totalBadDebtCandidate)
      return {
        title: `Marcar ${pendingMarkAction.monthData.month.name}`,
        description: `¿Está seguro de marcar todos los créditos de ${pendingMarkAction.monthData.month.name} como cartera muerta?`,
        count: pendingMarkAction.monthData.loans.length,
        amount: total,
      }
    } else if (pendingMarkAction.type === 'all') {
      return {
        title: 'Marcar todos los créditos',
        description: '¿Está seguro de marcar TODOS los créditos como cartera muerta?',
        count: allLoans.length,
        amount: parseFloat(yearTotals?.totalBadDebtCandidate || '0'),
      }
    }

    return { title: '', description: '', count: 0, amount: 0 }
  }

  const confirmMessage = getConfirmMessage()

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Skull className="h-6 w-6 text-red-600" />
            Cartera Muerta
          </h1>
          <p className="text-muted-foreground">
            Identifica y marca créditos irrecuperables
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedYear(prev => prev - 1)}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md min-w-[120px] justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{selectedYear}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedYear(prev => prev + 1)}
              disabled={selectedYear >= new Date().getFullYear()}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={loading}
            className="h-9 w-9"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Criterios de Filtrado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Semanas desde crédito (mínimo)</Label>
              <Input
                type="number"
                placeholder="Ej: 17"
                value={weeksSinceLoanMin || ''}
                onChange={(e) => setWeeksSinceLoanMin(e.target.value ? parseInt(e.target.value) : undefined)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Semanas sin pago (mínimo)</Label>
              <Input
                type="number"
                placeholder="Ej: 8"
                value={weeksWithoutPaymentMin || ''}
                onChange={(e) => setWeeksWithoutPaymentMin(e.target.value ? parseInt(e.target.value) : undefined)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Estado</Label>
              <Select value={badDebtStatus} onValueChange={(v) => setBadDebtStatus(v as 'UNMARKED' | 'MARKED' | 'ALL')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNMARKED">No marcados</SelectItem>
                  <SelectItem value="MARKED">Marcados</SelectItem>
                  <SelectItem value="ALL">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Ruta</Label>
              <Select
                value={selectedRouteId || 'all'}
                onValueChange={(v) => setSelectedRouteId(v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas las rutas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las rutas</SelectItem>
                  {routes.map((route: Route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive">Error al cargar datos: {error.message}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Créditos"
              value={yearTotals?.totalLoans || 0}
              subtitle={`Año ${selectedYear}`}
              icon={Users}
              loading={loading}
            />
            <KPICard
              title="Deuda Pendiente"
              value={formatCurrency(parseFloat(yearTotals?.totalPendingAmount || '0'))}
              subtitle="Monto total adeudado"
              icon={DollarSign}
              variant="warning"
              loading={loading}
            />
            <KPICard
              title="Cartera Muerta Estimada"
              value={formatCurrency(parseFloat(yearTotals?.totalBadDebtCandidate || '0'))}
              subtitle="Capital irrecuperable"
              icon={Skull}
              variant="danger"
              loading={loading}
            />
            <KPICard
              title="Seleccionados"
              value={selectedTotals.count}
              subtitle={formatCurrency(selectedTotals.badDebtCandidate)}
              icon={CheckCircle2}
              variant={selectedTotals.count > 0 ? 'success' : 'default'}
              loading={loading}
            />
          </div>

          {/* Selection Actions */}
          {(selectedLoans.size > 0 || allLoans.length > 0) && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      id="select-all"
                      checked={selectedLoans.size === allLoans.length && allLoans.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="font-medium">
                      Seleccionar todos ({allLoans.length} créditos)
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedLoans.size > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {selectedTotals.count} seleccionado(s) • {formatCurrency(selectedTotals.badDebtCandidate)}
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      onClick={handleMarkSelected}
                      disabled={selectedLoans.size === 0 || isMarking}
                    >
                      {isMarking ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Skull className="h-4 w-4 mr-2" />
                      )}
                      Marcar Seleccionados
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={handleMarkAll}
                      disabled={allLoans.length === 0 || isMarking}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Marcar Todos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Breakdown */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-6 w-32 bg-muted rounded" />
                      <div className="h-4 w-48 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {monthlySummary.map((monthData: MonthSummary) => (
                <MonthCard
                  key={`${monthData.month.year}-${monthData.month.month}`}
                  monthData={monthData}
                  selectedLoans={selectedLoans}
                  onSelectLoan={handleSelectLoan}
                  onSelectAllMonth={handleSelectAllMonth}
                  onMarkMonth={handleMarkMonth}
                  isMarking={isMarking}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {confirmMessage.title}
            </DialogTitle>
            <DialogDescription>
              {confirmMessage.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Créditos a marcar:</span>
                <span className="font-bold">{confirmMessage.count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cartera muerta:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(confirmMessage.amount)}
                </span>
              </div>
              {pendingMarkAction?.date && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fecha de marcado:</span>
                  <span className="font-medium">{pendingMarkAction.date}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-amber-600 dark:text-amber-400 mt-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Esta acción no se puede deshacer fácilmente
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false)
                setPendingMarkAction(null)
              }}
              disabled={isMarking}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmMark}
              disabled={isMarking}
            >
              {isMarking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
