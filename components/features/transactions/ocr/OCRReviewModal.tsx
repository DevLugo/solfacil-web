'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useMutation, useLazyQuery } from '@apollo/client'
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Users,
  CreditCard,
  Receipt,
  DollarSign,
  Filter,
  Pencil,
  X,
  Undo2,
  Search,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { OCRConfirmationSummary, getBlockingIssues } from './OCRConfirmationSummary'
import { CONFIRM_OCR_BATCH } from '@/graphql/mutations/ocr'
import { SEARCH_CLIENTS_QUERY } from '@/graphql/queries/clients'

/** Safely parse any value to number (GraphQL Decimal comes as string) */
const num = (v: unknown): number => Number(v) || 0

// ─── Types ───

interface ClientPayment {
  clientId: string
  clientName: string
  abonoEsperado: number
  abonoReal: number | null
  paid: boolean
  paymentMethod: string
  comission: number | null
  notes: string | null
  resolvedLoanId: string | null
  resolvedBorrowerId: string | null
  matchConfidence: string
  matchMethod: string
  dbClientCode: string | null
  dbClientName: string | null
  dbPendingAmount: number | null
  dbExpectedPayment: number | null
  amountWarning: string | null
}

interface PaymentData {
  localityName: string
  leaderName: string
  resolvedLeaderId: string | null
  resolvedLeaderConfidence: string
  fecha: string
  cobranzaTotal: number
  comisionTotal: number
  cashTotal: number
  bankTotal: number
  falcoAmount: number | null
  clientPayments: ClientPayment[]
  warnings: Array<{ code: string; message: string }>
}

interface LoanData {
  numero: number
  clientName: string
  creditAmount: number
  deliveredAmount: number
  termWeeks: number
  creditType: string | null
  resolvedBorrowerId: string | null
  resolvedPreviousLoanId: string | null
  resolvedLoantypeId: string | null
  matchConfidence: string
  estimatedRate: number | null
  estimatedProfit: number | null
  estimatedTotalDebt: number | null
  isNewClient: boolean
  isRenewal: boolean
  previousLoanPending: number | null
  expectedDeliveredAmount: number | null
  localityName: string | null
  avalName: string | null
  avalAddress: string | null
  titularAddress: string | null
  titularPhone: string | null
  avalPhone: string | null
  warnings: Array<{ code: string; message: string; field?: string | null }>
}

interface ExpenseData {
  expenseType: string
  establishment: string | null
  amount: number
  date: string
  paymentMethod: string
  notes: string | null
  resolvedSourceType: string
  resolvedAccountId: string | null
  confidence: string
}

interface OCRResult {
  pagesProcessed: number
  overallConfidence: string
  rawJsonPages: string[]
  payments: PaymentData[]
  loans: LoanData[]
  expenses: ExpenseData[]
  crossValidation: any
  warnings: any[]
  errors: any[]
}

interface Account {
  id: string
  name: string
  type: string
  amount: string
  accountBalance: string
}

interface OCRReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: OCRResult | null
  routeId: string
  businessDate: Date
  accounts: Account[]
  onConfirmed?: () => void
}

interface PaymentOverride {
  resolvedBorrowerId: string
  resolvedLoanId: string
  dbClientName: string
  dbClientCode: string
}

// ─── Locality status helper ───

type LocalityStatus = 'ok' | 'warning' | 'error'

interface LocalityGroup {
  name: string
  status: LocalityStatus
  payment: PaymentData
  issues: string[]
  payingCount: number
  notPayingCount: number
  unmatchedCount: number
  loans: LoanData[]
}

function getLocalityStatus(payment: PaymentData): { status: LocalityStatus; issues: string[] } {
  const issues: string[] = []

  if (!payment.resolvedLeaderId) {
    issues.push('Líder no identificado')
  }

  const unmatched = payment.clientPayments.filter(cp => cp.paid && !cp.resolvedLoanId)
  if (unmatched.length > 0) {
    issues.push(`${unmatched.length} pago(s) sin match`)
  }

  if (payment.warnings.length > 0) {
    for (const w of payment.warnings) {
      issues.push(w.message)
    }
  }

  if (num(payment.falcoAmount) > 0) {
    issues.push(`FALCO: ${formatCurrency(num(payment.falcoAmount))}`)
  }

  const hasAmountWarnings = payment.clientPayments.some(cp => cp.amountWarning)
  if (hasAmountWarnings) {
    issues.push('Diferencias en montos de abono')
  }

  if (issues.some(i => i.includes('no identificado') || i.includes('sin match'))) {
    return { status: 'error', issues }
  }
  if (issues.length > 0) {
    return { status: 'warning', issues }
  }
  return { status: 'ok', issues }
}

function StatusIcon({ status }: { status: LocalityStatus }) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
  return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  if (confidence === 'alta') return <Badge variant="outline" className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 text-xs">Alta</Badge>
  if (confidence === 'media') return <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 text-xs">Media</Badge>
  return <Badge variant="outline" className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 text-xs">Baja</Badge>
}

function MatchIcon({ cp }: { cp: ClientPayment }) {
  const { matchMethod: method, matchConfidence: confidence } = cp
  let icon: React.ReactNode
  let color: string

  if (method === 'unmatched') {
    icon = <XCircle className="h-3.5 w-3.5 text-red-500" />
    color = 'text-red-500'
  } else if (confidence === 'alta') {
    icon = <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
    color = 'text-green-500'
  } else {
    icon = <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
    color = 'text-yellow-500'
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">{icon}</span>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-semibold border-b pb-1 mb-1">
              {method === 'unmatched' ? 'Sin match' : method === 'clientCode' ? 'Match por código' : 'Match por nombre'}
              {method !== 'unmatched' && <span className="ml-1 opacity-70">({confidence})</span>}
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
              <span className="opacity-60">OCR código:</span>
              <span className="font-mono">{cp.clientId}</span>
              <span className="opacity-60">OCR nombre:</span>
              <span>{cp.clientName}</span>
              {cp.dbClientCode && (
                <>
                  <span className="opacity-60">DB código:</span>
                  <span className="font-mono">{cp.dbClientCode}</span>
                </>
              )}
              {cp.dbClientName && (
                <>
                  <span className="opacity-60">DB nombre:</span>
                  <span>{cp.dbClientName}</span>
                </>
              )}
              {cp.dbExpectedPayment != null && (
                <>
                  <span className="opacity-60">DB esperado:</span>
                  <span>{formatCurrency(num(cp.dbExpectedPayment))}</span>
                </>
              )}
              {cp.dbPendingAmount != null && (
                <>
                  <span className="opacity-60">DB pendiente:</span>
                  <span>{formatCurrency(num(cp.dbPendingAmount))}</span>
                </>
              )}
            </div>
            {method === 'unmatched' && (
              <div className="text-red-400 pt-1 border-t mt-1">No se encontró en la base de datos</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Client Search Popover (for reassignment) ───

function ClientSearchPopover({
  routeId,
  onSelect,
  requireActiveLoan = false,
}: {
  routeId?: string
  onSelect: (client: { borrowerId: string; activeLoanIds: string[]; name: string; clientCode: string }) => void
  requireActiveLoan?: boolean
}) {
  const [term, setTerm] = useState('')
  const [searchClients, { data, loading }] = useLazyQuery(SEARCH_CLIENTS_QUERY, { fetchPolicy: 'network-only' })

  useEffect(() => {
    if (term.length >= 2) {
      const timer = setTimeout(() => {
        searchClients({ variables: { searchTerm: term, routeId: routeId || undefined, limit: 8 } })
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [term, routeId, searchClients])

  const results = (data?.searchClients || []) as Array<{
    id: string; borrowerId: string | null; name: string; clientCode: string
    activeLoans: number; activeLoanIds: string[]; pendingDebt: number
  }>

  return (
    <div className="w-64">
      <div className="flex items-center gap-2 border-b pb-2 mb-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar cliente..."
          className="flex-1 text-sm bg-transparent outline-none"
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {loading && <div className="text-xs text-center py-3 text-muted-foreground">Buscando...</div>}
        {!loading && term.length >= 2 && results.length === 0 && (
          <div className="text-xs text-center py-3 text-muted-foreground">Sin resultados</div>
        )}
        {!loading && term.length < 2 && (
          <div className="text-xs text-center py-3 text-muted-foreground">Escribe al menos 2 caracteres</div>
        )}
        {results.map((client) => {
          const disabled = requireActiveLoan && (!client.borrowerId || client.activeLoans === 0)
          return (
            <button
              key={client.id}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-xs',
                disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'
              )}
              onClick={() => {
                if (disabled) return
                onSelect({
                  borrowerId: client.borrowerId || client.id,
                  activeLoanIds: client.activeLoanIds || [],
                  name: client.name,
                  clientCode: client.clientCode,
                })
              }}
              disabled={disabled}
            >
              <div className="font-medium">{client.name}</div>
              <div className="text-muted-foreground flex gap-2">
                <span className="font-mono">{client.clientCode}</span>
                <span>{client.activeLoans} prstmo(s) activo(s)</span>
                {client.pendingDebt > 0 && <span>Deuda: {formatCurrency(client.pendingDebt)}</span>}
              </div>
              {disabled && <div className="text-red-500">Sin préstamo activo</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───

export function OCRReviewModal({
  open,
  onOpenChange,
  result,
  routeId,
  businessDate,
  accounts,
  onConfirmed,
}: OCRReviewModalProps) {
  const { toast } = useToast()
  const [sourceAccountId, setSourceAccountId] = useState<string>('')
  const [confirming, setConfirming] = useState(false)

  // Auto-select first cash fund account for loans source
  useEffect(() => {
    if (!sourceAccountId && accounts.length > 0) {
      const cashFund = accounts.find(a => a.type === 'EMPLOYEE_CASH_FUND')
      if (cashFund) setSourceAccountId(cashFund.id)
    }
  }, [accounts, sourceAccountId])
  const [expandedLocalities, setExpandedLocalities] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'ok' | 'issues'>('all')
  const [showConfirmPanel, setShowConfirmPanel] = useState(false)

  // ─── Edit overlay state ───
  const [paymentOverrides, setPaymentOverrides] = useState<Record<string, PaymentOverride>>({})
  const [deletedPayments, setDeletedPayments] = useState<Set<string>>(new Set())
  const [deletedLoans, setDeletedLoans] = useState<Set<number>>(new Set())
  const [editingPaymentKey, setEditingPaymentKey] = useState<string | null>(null)
  const [editingLoanIdx, setEditingLoanIdx] = useState<number | null>(null)

  const deletePayment = (key: string) => setDeletedPayments(prev => new Set(prev).add(key))
  const restorePayment = (key: string) => {
    setDeletedPayments(prev => { const n = new Set(prev); n.delete(key); return n })
    setPaymentOverrides(prev => { const n = { ...prev }; delete n[key]; return n })
  }
  const deleteLoan = (idx: number) => setDeletedLoans(prev => new Set(prev).add(idx))
  const restoreLoan = (idx: number) => {
    setDeletedLoans(prev => { const n = new Set(prev); n.delete(idx); return n })
  }

  const assignPaymentClient = (key: string, client: { borrowerId: string; activeLoanIds: string[]; name: string; clientCode: string }) => {
    setPaymentOverrides(prev => ({
      ...prev,
      [key]: {
        resolvedBorrowerId: client.borrowerId,
        resolvedLoanId: client.activeLoanIds[0],
        dbClientName: client.name,
        dbClientCode: client.clientCode,
      },
    }))
    setEditingPaymentKey(null)
  }

  const [confirmOCRBatch] = useMutation(CONFIRM_OCR_BATCH)

  // Map loans to localities using localityName from API (must be before early return)
  const { loansByLocality, unmatchedLoans } = useMemo(() => {
    if (!result) return { loansByLocality: new Map<string, LoanData[]>(), unmatchedLoans: [] as LoanData[] }

    const map = new Map<string, LoanData[]>()
    const unmatched: LoanData[] = []

    for (const loan of result.loans) {
      if (loan.localityName) {
        const arr = map.get(loan.localityName) || []
        arr.push(loan)
        map.set(loan.localityName, arr)
      } else {
        unmatched.push(loan)
      }
    }

    return { loansByLocality: map, unmatchedLoans: unmatched }
  }, [result?.loans])

  // Build locality groups (must be before early return to respect Rules of Hooks)
  const localities: LocalityGroup[] = useMemo(() => {
    if (!result) return []
    return result.payments.map(payment => {
      const { status, issues } = getLocalityStatus(payment)
      return {
        name: payment.localityName,
        status,
        payment,
        issues,
        payingCount: payment.clientPayments.filter(cp => cp.paid).length,
        notPayingCount: payment.clientPayments.filter(cp => !cp.paid).length,
        unmatchedCount: payment.clientPayments.filter(cp => cp.paid && !cp.resolvedLoanId).length,
        loans: loansByLocality.get(payment.localityName) || [],
      }
    })
  }, [result?.payments, loansByLocality])

  const filteredLocalities = useMemo(() => {
    if (filter === 'ok') return localities.filter(l => l.status === 'ok')
    if (filter === 'issues') return localities.filter(l => l.status !== 'ok')
    return localities
  }, [localities, filter])

  // ─── Effective data (original + edits applied) for validation & confirmation ───
  const effectivePayments: PaymentData[] = useMemo(() => {
    if (!result) return []
    return result.payments.map((p, pIdx) => ({
      ...p,
      clientPayments: p.clientPayments
        .map((cp, cpIdx) => {
          const key = `${pIdx}-${cpIdx}`
          if (deletedPayments.has(key)) return null
          const override = paymentOverrides[key]
          if (override) {
            return {
              ...cp,
              resolvedLoanId: override.resolvedLoanId,
              resolvedBorrowerId: override.resolvedBorrowerId,
              dbClientName: override.dbClientName,
              dbClientCode: override.dbClientCode,
              matchConfidence: 'alta' as string,
              matchMethod: 'manual' as string,
            }
          }
          return cp
        })
        .filter((cp): cp is ClientPayment => cp !== null),
    }))
  }, [result, paymentOverrides, deletedPayments])

  const effectiveLoans: LoanData[] = useMemo(() => {
    if (!result) return []
    return result.loans.filter((_, idx) => !deletedLoans.has(idx))
  }, [result, deletedLoans])

  if (!result) return null

  const okCount = localities.filter(l => l.status === 'ok').length
  const issueCount = localities.filter(l => l.status !== 'ok').length

  const hasErrors = result.errors.length > 0
  const totalPayingClients = result.payments.reduce(
    (sum, p) => sum + p.clientPayments.filter(cp => cp.paid).length, 0
  )
  const totalCobranza = result.payments.reduce((s, p) => s + num(p.cobranzaTotal), 0)
  const totalComisiones = result.payments.reduce((s, p) => s + num(p.comisionTotal), 0)

  const blockingIssues = getBlockingIssues(
    effectivePayments,
    effectiveLoans,
    hasErrors,
    effectiveLoans.length > 0 ? sourceAccountId || null : 'not-needed',
    result.expenses
  )
  const canConfirm = blockingIssues.length === 0

  const toggleLocality = (name: string) => {
    setExpandedLocalities(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const expandAll = () => {
    setExpandedLocalities(new Set(filteredLocalities.map(l => l.name)))
  }

  const collapseAll = () => {
    setExpandedLocalities(new Set())
  }

  // Build the batch input from OCR result data (applies edit overrides)
  function buildBatchInput() {
    const payments = effectivePayments
      .filter((p) => p.resolvedLeaderId)
      .map((p) => {
        const payingClients = (p.clientPayments || []).filter(
          (cp) => cp.paid && cp.resolvedLoanId
        )
        if (payingClients.length === 0) return null
        const paidTotal = payingClients.reduce(
          (s: number, cp) => s + num(cp.abonoReal ?? cp.abonoEsperado), 0
        )
        return {
          leadId: p.resolvedLeaderId,
          expectedAmount: p.cobranzaTotal.toString(),
          paidAmount: paidTotal.toString(),
          cashPaidAmount: p.cashTotal.toString(),
          bankPaidAmount: p.bankTotal.toString(),
          falcoAmount: p.falcoAmount ? p.falcoAmount.toString() : undefined,
          clientPayments: payingClients.map((cp) => ({
            loanId: cp.resolvedLoanId,
            amount: (cp.abonoReal ?? cp.abonoEsperado).toString(),
            comission: cp.comission ? cp.comission.toString() : '0',
            paymentMethod: cp.paymentMethod === 'MONEY_TRANSFER' ? 'MONEY_TRANSFER' : 'CASH',
          })),
        }
      })
      .filter(Boolean)

    const firstLeader = effectivePayments.find((p) => p.resolvedLeaderId)
    const loans = effectiveLoans
      .filter((l) => l.resolvedLoantypeId && (l.resolvedBorrowerId || l.isNewClient))
      .map((loan) => ({
        requestedAmount: loan.creditAmount.toString(),
        amountGived: loan.deliveredAmount.toString(),
        loantypeId: loan.resolvedLoantypeId,
        borrowerId: loan.resolvedBorrowerId || undefined,
        newBorrowerName: !loan.resolvedBorrowerId && loan.isNewClient ? loan.clientName : undefined,
        previousLoanId: loan.isRenewal ? loan.resolvedPreviousLoanId || undefined : undefined,
        leadId: firstLeader?.resolvedLeaderId || '',
      }))

    const expenses = result!.expenses
      .filter((e: any) => e.resolvedAccountId && e.amount > 0)
      .map((e: any) => ({
        amount: e.amount.toString(),
        expenseSource: e.resolvedSourceType,
        sourceAccountId: e.resolvedAccountId,
        description: [e.establishment, e.notes].filter(Boolean).join(' - ') || undefined,
      }))

    return { payments, loans, expenses }
  }

  const handleConfirm = async () => {
    if (!canConfirm) return
    setConfirming(true)
    try {
      const { payments, loans, expenses } = buildBatchInput()
      const { data } = await confirmOCRBatch({
        variables: {
          input: {
            routeId,
            businessDate: businessDate.toISOString(),
            sourceAccountId: sourceAccountId || undefined,
            payments,
            loans,
            expenses,
          },
        },
      })
      const r = data?.confirmOCRBatch
      toast({
        title: 'Captura completada',
        description: `${r?.paymentsCreated ?? 0} abonos, ${r?.loansCreated ?? 0} créditos y ${r?.expensesCreated ?? 0} gastos registrados.`,
      })
      setConfirming(false)
      onOpenChange(false)
      onConfirmed?.()
    } catch (error: any) {
      console.error('Error en confirmación OCR:', error)
      toast({
        title: 'Error al confirmar',
        description: error.message || 'Ocurrió un error. Ningún dato fue guardado.',
        variant: 'destructive',
      })
      setConfirming(false)
    }
  }

  const cashFundAccounts = accounts.filter(a => a.type === 'EMPLOYEE_CASH_FUND')

  return (
    <Dialog open={open} onOpenChange={confirming ? undefined : onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] p-0 flex flex-col gap-0">
        {/* ─── Fixed Header ─── */}
        <div className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogHeader>
            <DialogTitle>Resultado del OCR</DialogTitle>
            <DialogDescription>
              {result.pagesProcessed} páginas procesadas
            </DialogDescription>
          </DialogHeader>

          {/* Summary Stats */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <SummaryStat
              label="Localidades"
              value={String(result.payments.length)}
              icon={<Users className="h-3.5 w-3.5" />}
              detail={`${okCount} OK, ${issueCount} con problemas`}
              color={issueCount === 0 ? 'green' : 'yellow'}
            />
            <SummaryStat
              label="Cobranza"
              value={formatCurrency(totalCobranza)}
              icon={<DollarSign className="h-3.5 w-3.5" />}
              detail={`${totalPayingClients} pagos`}
              color="green"
            />
            <SummaryStat
              label="Comisiones"
              value={formatCurrency(totalComisiones)}
              icon={<DollarSign className="h-3.5 w-3.5" />}
              color="purple"
            />
            <SummaryStat
              label="Créditos"
              value={String(result.loans.length)}
              icon={<CreditCard className="h-3.5 w-3.5" />}
              detail={result.loans.length > 0 ? formatCurrency(result.loans.reduce((s, l) => s + num(l.deliveredAmount), 0)) : undefined}
              color="blue"
            />
            <SummaryStat
              label="Gastos"
              value={String(result.expenses.length)}
              icon={<Receipt className="h-3.5 w-3.5" />}
              detail={result.expenses.length > 0 ? formatCurrency(result.expenses.reduce((s, e) => s + num(e.amount), 0)) : undefined}
              color="purple"
            />
            <SummaryStat
              label="Confianza"
              value={result.overallConfidence}
              color={result.overallConfidence === 'alta' ? 'green' : result.overallConfidence === 'media' ? 'yellow' : 'red'}
            />
            <SummaryStat
              label="Validación"
              value={result.crossValidation?.isValid ? 'OK' : 'Diferencias'}
              color={result.crossValidation?.isValid ? 'green' : 'red'}
            />
          </div>

          {/* Filter bar */}
          <div className="mt-3 flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex gap-1">
              <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                Todas ({localities.length})
              </FilterButton>
              <FilterButton active={filter === 'ok'} onClick={() => setFilter('ok')} color="green">
                OK ({okCount})
              </FilterButton>
              <FilterButton active={filter === 'issues'} onClick={() => setFilter('issues')} color="red">
                Problemas ({issueCount})
              </FilterButton>
            </div>
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={expandAll}>
                Expandir todo
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={collapseAll}>
                Colapsar todo
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Scrollable Content ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="space-y-2">
            {/* Locality Cards */}
            {filteredLocalities.map((locality, locIdx) => {
              const expanded = expandedLocalities.has(locality.name)
              const p = locality.payment
              const localClientDeposits = p.clientPayments
                .filter((cp) => cp.paid && cp.paymentMethod === 'MONEY_TRANSFER')
                .reduce((s, cp) => s + num(cp.abonoReal ?? cp.abonoEsperado), 0)

              return (
                <div key={`${locality.name}-${locIdx}`} className="border rounded-lg overflow-hidden">
                  {/* Collapsed Header */}
                  <button
                    onClick={() => toggleLocality(locality.name)}
                    className={cn(
                      'w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors',
                      locality.status === 'error' && 'bg-red-50/50 dark:bg-red-950/30',
                      locality.status === 'warning' && 'bg-yellow-50/30 dark:bg-yellow-950/20',
                    )}
                  >
                    {expanded
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                    <StatusIcon status={locality.status} />
                    <span className="font-semibold text-sm">{locality.name}</span>
                    <span className="text-xs text-muted-foreground">{p.leaderName}</span>
                    <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{locality.payingCount}/{p.clientPayments.length} pagaron</span>
                      {locality.loans.length > 0 && (
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 text-xs">
                          {locality.loans.length} crédito{locality.loans.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {locality.unmatchedCount > 0 && (
                        <Badge variant="destructive" className="text-xs">{locality.unmatchedCount} sin match</Badge>
                      )}
                      {num(p.falcoAmount) > 0 && (
                        <Badge variant="destructive" className="text-xs">FALCO</Badge>
                      )}
                      {num(p.bankTotal) > 0 && (
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs">
                          Dep. líder: {formatCurrency(num(p.bankTotal))}
                        </Badge>
                      )}
                      {localClientDeposits > 0 && (
                        <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800 text-xs">
                          DP clientes: {formatCurrency(localClientDeposits)}
                        </Badge>
                      )}
                      <span className="font-medium text-foreground">{formatCurrency(num(p.cobranzaTotal))}</span>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expanded && (
                    <div className="border-t">
                      {/* Issues */}
                      {locality.issues.length > 0 && (
                        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950/30 text-sm space-y-0.5">
                          {locality.issues.map((issue, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Locality summary row */}
                      <div className="px-4 py-2 bg-muted/30 flex gap-4 text-xs text-muted-foreground flex-wrap border-b">
                        <span>Cobranza: <strong className="text-foreground">{formatCurrency(num(p.cobranzaTotal))}</strong></span>
                        <span>Comisión: <strong className="text-foreground">{formatCurrency(num(p.comisionTotal))}</strong></span>
                        <span>Efectivo líder: {formatCurrency(num(p.cashTotal))}</span>
                        <span className="text-blue-600 dark:text-blue-400">Depósito líder: {formatCurrency(num(p.bankTotal))}</span>
                        {localClientDeposits > 0 && (
                          <span className="text-cyan-600 dark:text-cyan-400">Depósitos clientes: {formatCurrency(localClientDeposits)}</span>
                        )}
                        {num(p.falcoAmount) > 0 && (
                          <span className="text-red-600 dark:text-red-400">FALCO: {formatCurrency(num(p.falcoAmount))}</span>
                        )}
                        {p.resolvedLeaderId ? (
                          <span className="ml-auto">Líder: <ConfidenceBadge confidence={p.resolvedLeaderConfidence} /></span>
                        ) : (
                          <span className="ml-auto"><Badge variant="destructive" className="text-xs">Sin líder</Badge></span>
                        )}
                      </div>

                      {/* ── Pagos sub-section ── */}
                      <div className="px-4 py-1.5 bg-muted/20 border-b flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">Pagos ({locality.payingCount}/{p.clientPayments.length})</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/20">
                            <tr>
                              <th className="text-left px-3 py-1.5 w-6"></th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium">ID</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium">Cliente</th>
                              <th className="text-right px-3 py-1.5 text-xs font-medium">Esperado</th>
                              <th className="text-right px-3 py-1.5 text-xs font-medium">Real</th>
                              <th className="text-center px-3 py-1.5 text-xs font-medium">Pagó</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium">Método</th>
                              <th className="text-right px-3 py-1.5 text-xs font-medium">Comisión</th>
                              <th className="text-left px-3 py-1.5 text-xs font-medium">Notas</th>
                              <th className="text-center px-3 py-1.5 text-xs font-medium w-16">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.clientPayments.map((cp, cIdx) => {
                              const pIdx = result!.payments.indexOf(p)
                              const payKey = `${pIdx}-${cIdx}`
                              const isDeleted = deletedPayments.has(payKey)
                              const override = paymentOverrides[payKey]

                              return (
                                <tr
                                  key={cIdx}
                                  className={cn(
                                    'border-t',
                                    isDeleted
                                      ? 'opacity-40'
                                      : !cp.paid ? 'bg-red-50/40 dark:bg-red-950/20' : cp.matchMethod === 'unmatched' ? 'bg-yellow-50/40 dark:bg-yellow-950/20' : '',
                                  )}
                                >
                                  <td className="px-3 py-1.5"><MatchIcon cp={cp} /></td>
                                  <td className={cn('px-3 py-1.5 font-mono text-xs', isDeleted && 'line-through')}>
                                    {override ? override.dbClientCode : cp.dbClientCode || cp.clientId || 'SIN-ID'}
                                  </td>
                                  <td className="px-3 py-1.5">
                                    {override && !isDeleted ? (
                                      <>
                                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{override.dbClientName}</span>
                                        <div className="text-[10px] text-muted-foreground line-through">{cp.clientName}</div>
                                      </>
                                    ) : cp.dbClientName && cp.matchMethod !== 'unmatched' ? (
                                      <>
                                        <span className={cn('text-xs', isDeleted && 'line-through')}>{cp.dbClientName}</span>
                                        {cp.dbClientName !== cp.clientName && (
                                          <div className="text-[10px] text-muted-foreground">{cp.clientName}</div>
                                        )}
                                      </>
                                    ) : (
                                      <span className={cn('text-xs', isDeleted && 'line-through')}>{cp.clientName}</span>
                                    )}
                                    {cp.amountWarning && !isDeleted && (
                                      <div className="text-[10px] text-yellow-600 dark:text-yellow-400">{cp.amountWarning}</div>
                                    )}
                                  </td>
                                  <td className={cn('text-right px-3 py-1.5 text-xs', isDeleted && 'line-through')}>{formatCurrency(num(cp.abonoEsperado))}</td>
                                  <td className={cn('text-right px-3 py-1.5 text-xs', isDeleted && 'line-through')}>{cp.abonoReal !== null ? formatCurrency(num(cp.abonoReal)) : '—'}</td>
                                  <td className="text-center px-3 py-1.5">
                                    {cp.paid
                                      ? <span className="text-green-600 dark:text-green-400 text-xs font-medium">Sí</span>
                                      : <span className="text-red-600 dark:text-red-400 text-xs font-medium">No</span>
                                    }
                                  </td>
                                  <td className="px-3 py-1.5 text-[10px]">{cp.paymentMethod}</td>
                                  <td className="text-right px-3 py-1.5 text-xs">{cp.comission !== null ? formatCurrency(num(cp.comission)) : '—'}</td>
                                  <td className="px-3 py-1.5 text-[10px] text-muted-foreground max-w-[120px] truncate">{cp.notes || ''}</td>
                                  <td className="text-center px-3 py-1.5">
                                    {isDeleted ? (
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => restorePayment(payKey)}>
                                        <Undo2 className="h-3 w-3" />
                                      </Button>
                                    ) : (
                                      <div className="flex items-center justify-center gap-0.5">
                                        {cp.paid && (
                                          <Popover
                                            open={editingPaymentKey === payKey}
                                            onOpenChange={(open) => setEditingPaymentKey(open ? payKey : null)}
                                          >
                                            <PopoverTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent side="left" align="start" className="p-3 w-auto">
                                              <ClientSearchPopover
                                                onSelect={(client) => assignPaymentClient(payKey, client)}
                                                requireActiveLoan
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => deletePayment(payKey)}>
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ── Créditos sub-section (inside locality) ── */}
                      {locality.loans.length > 0 && (
                        <>
                          <div className="px-4 py-1.5 bg-muted/20 border-t border-b flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">Créditos ({locality.loans.length})</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              Colocado: {formatCurrency(locality.loans.reduce((s, l) => s + num(l.deliveredAmount), 0))}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/20">
                                <tr>
                                  <th className="text-left px-3 py-1.5 text-xs font-medium">#</th>
                                  <th className="text-left px-3 py-1.5 text-xs font-medium">Cliente</th>
                                  <th className="text-center px-3 py-1.5 text-xs font-medium">Tipo</th>
                                  <th className="text-right px-3 py-1.5 text-xs font-medium">Crédito</th>
                                  <th className="text-right px-3 py-1.5 text-xs font-medium">Entregado</th>
                                  <th className="text-right px-3 py-1.5 text-xs font-medium">Plazo</th>
                                  <th className="text-right px-3 py-1.5 text-xs font-medium">Tasa</th>
                                  <th className="text-center px-3 py-1.5 text-xs font-medium">Match</th>
                                  <th className="text-left px-3 py-1.5 text-xs font-medium">Avisos</th>
                                  <th className="text-center px-3 py-1.5 text-xs font-medium w-16">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {locality.loans.map((loan, idx) => {
                                  const globalIdx = result!.loans.indexOf(loan)
                                  const isLoanDeleted = deletedLoans.has(globalIdx)
                                  const mismatch = loan.expectedDeliveredAmount !== null && Math.abs(num(loan.deliveredAmount) - num(loan.expectedDeliveredAmount)) > 1
                                  const hasAval = !!(loan.avalName || loan.titularAddress || loan.avalAddress)
                                  return (
                                    <React.Fragment key={idx}>
                                      <tr className={cn('border-t', isLoanDeleted ? 'opacity-40' : mismatch ? 'bg-red-50/50 dark:bg-red-950/20' : '')}>
                                        <td className={cn('px-3 py-1.5 font-mono text-xs', isLoanDeleted && 'line-through')}>{loan.numero}</td>
                                        <td className="px-3 py-1.5 text-xs">
                                          <span className={cn(isLoanDeleted && 'line-through')}>{loan.clientName}</span>
                                        </td>
                                        <td className="text-center px-3 py-1.5">
                                          {loan.isRenewal
                                            ? <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px]">R</Badge>
                                            : loan.isNewClient
                                            ? <Badge variant="outline" className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 text-[10px]">N</Badge>
                                            : <span className="text-[10px]">{loan.creditType || '?'}</span>
                                          }
                                        </td>
                                        <td className={cn('text-right px-3 py-1.5 text-xs font-medium', isLoanDeleted && 'line-through')}>{formatCurrency(num(loan.creditAmount))}</td>
                                        <td className={cn('text-right px-3 py-1.5 text-xs', isLoanDeleted ? 'line-through' : mismatch ? 'text-red-600 dark:text-red-400 font-bold' : '')}>{formatCurrency(num(loan.deliveredAmount))}</td>
                                        <td className="text-right px-3 py-1.5 text-xs">{loan.termWeeks}s</td>
                                        <td className="text-right px-3 py-1.5 text-xs">{loan.estimatedRate !== null ? `${(num(loan.estimatedRate) * 100).toFixed(0)}%` : '—'}</td>
                                        <td className="text-center px-3 py-1.5">
                                          {(loan.resolvedBorrowerId || loan.isNewClient)
                                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline" />
                                            : <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 inline" />
                                          }
                                        </td>
                                        <td className="px-3 py-1.5">
                                          {loan.warnings.map((w, i) => (
                                            <div key={i} className="text-[10px] text-yellow-600 dark:text-yellow-400">{w.message}</div>
                                          ))}
                                        </td>
                                        <td className="text-center px-3 py-1.5">
                                          {isLoanDeleted ? (
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => restoreLoan(globalIdx)}>
                                              <Undo2 className="h-3 w-3" />
                                            </Button>
                                          ) : (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => deleteLoan(globalIdx)}>
                                              <X className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </td>
                                      </tr>
                                      {hasAval && !isLoanDeleted && (
                                        <tr className="bg-muted/10">
                                          <td className="px-3 py-1" />
                                          <td colSpan={9} className="px-3 py-1">
                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
                                              {loan.avalName && (
                                                <span>Aval: <span className="text-foreground font-medium">{loan.avalName}</span></span>
                                              )}
                                              {loan.titularPhone && (
                                                <span>Tel. T: <span className="text-foreground">{loan.titularPhone}</span></span>
                                              )}
                                              {loan.avalPhone && (
                                                <span>Tel. A: <span className="text-foreground">{loan.avalPhone}</span></span>
                                              )}
                                              {loan.titularAddress && (
                                                <span>Dir. titular: <span className="text-foreground">{loan.titularAddress}</span></span>
                                              )}
                                              {loan.avalAddress && (
                                                <span>Dir. aval: <span className="text-foreground">{loan.avalAddress}</span></span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {filteredLocalities.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No hay localidades con el filtro seleccionado.
              </div>
            )}

            {/* ─── Créditos sin localidad (unmatched only) ─── */}
            {unmatchedLoans.length > 0 && (
              <SectionCollapsible title={`Créditos sin localidad asignada (${unmatchedLoans.length})`} icon={<CreditCard className="h-4 w-4" />} defaultOpen={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left px-3 py-1.5 text-xs font-medium">#</th>
                        <th className="text-left px-3 py-1.5 text-xs font-medium">Cliente</th>
                        <th className="text-center px-3 py-1.5 text-xs font-medium">Tipo</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium">Crédito</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium">Entregado</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium">Plazo</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium">Tasa</th>
                        <th className="text-center px-3 py-1.5 text-xs font-medium">Match</th>
                        <th className="text-left px-3 py-1.5 text-xs font-medium">Avisos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmatchedLoans.map((loan, idx) => {
                        const mismatch = loan.expectedDeliveredAmount !== null && Math.abs(num(loan.deliveredAmount) - num(loan.expectedDeliveredAmount)) > 1
                        return (
                          <tr key={idx} className={cn('border-t', mismatch ? 'bg-red-50/50 dark:bg-red-950/20' : '')}>
                            <td className="px-3 py-1.5 font-mono text-xs">{loan.numero}</td>
                            <td className="px-3 py-1.5 text-xs">{loan.clientName}</td>
                            <td className="text-center px-3 py-1.5">
                              {loan.isRenewal
                                ? <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px]">R</Badge>
                                : loan.isNewClient
                                ? <Badge variant="outline" className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 text-[10px]">N</Badge>
                                : <span className="text-[10px]">{loan.creditType || '?'}</span>
                              }
                            </td>
                            <td className="text-right px-3 py-1.5 text-xs font-medium">{formatCurrency(num(loan.creditAmount))}</td>
                            <td className={cn('text-right px-3 py-1.5 text-xs', mismatch ? 'text-red-600 dark:text-red-400 font-bold' : '')}>{formatCurrency(num(loan.deliveredAmount))}</td>
                            <td className="text-right px-3 py-1.5 text-xs">{loan.termWeeks}s</td>
                            <td className="text-right px-3 py-1.5 text-xs">{loan.estimatedRate !== null ? `${(num(loan.estimatedRate) * 100).toFixed(0)}%` : '—'}</td>
                            <td className="text-center px-3 py-1.5">
                              {(loan.resolvedBorrowerId || loan.isNewClient)
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline" />
                                : <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 inline" />
                              }
                            </td>
                            <td className="px-3 py-1.5">
                              {loan.warnings.map((w, i) => (
                                <div key={i} className="text-[10px] text-yellow-600 dark:text-yellow-400">{w.message}</div>
                              ))}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
                  Total colocado (sin localidad): {formatCurrency(unmatchedLoans.reduce((s, l) => s + num(l.deliveredAmount), 0))}
                </div>
              </SectionCollapsible>
            )}

            {/* ─── Gastos Section ─── */}
            {result.expenses.length > 0 && (
              <SectionCollapsible title={`Gastos (${result.expenses.length})`} icon={<Receipt className="h-4 w-4" />} defaultOpen={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left px-3 py-1.5 text-xs font-medium">Tipo</th>
                        <th className="text-left px-3 py-1.5 text-xs font-medium">Establecimiento</th>
                        <th className="text-right px-3 py-1.5 text-xs font-medium">Monto</th>
                        <th className="text-left px-3 py-1.5 text-xs font-medium">Fecha</th>
                        <th className="text-left px-3 py-1.5 text-xs font-medium">Método</th>
                        <th className="text-center px-3 py-1.5 text-xs font-medium">Confianza</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.expenses.map((exp, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-1.5 text-xs font-medium">{exp.expenseType}</td>
                          <td className="px-3 py-1.5 text-xs">{exp.establishment || '—'}</td>
                          <td className="text-right px-3 py-1.5 text-xs font-medium">{formatCurrency(num(exp.amount))}</td>
                          <td className="px-3 py-1.5 text-[10px]">{exp.date}</td>
                          <td className="px-3 py-1.5 text-[10px]">{exp.paymentMethod}</td>
                          <td className="text-center px-3 py-1.5">
                            {exp.confidence === 'alta'
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline" />
                              : <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 inline" />
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
                  Total: {formatCurrency(result.expenses.reduce((s, e) => s + num(e.amount), 0))}
                </div>
              </SectionCollapsible>
            )}

            {/* ─── Confirmation Panel ─── */}
            <SectionCollapsible
              title="Confirmación y Cuentas"
              icon={<DollarSign className="h-4 w-4" />}
              defaultOpen={false}
              forceOpen={showConfirmPanel}
              onToggle={setShowConfirmPanel}
            >
              <div className="p-4 space-y-4">
                {result.loans.length > 0 && (
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <label className="text-sm font-medium">Cuenta origen para créditos</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Los fondos para otorgar créditos se descontarán de esta cuenta.
                    </p>
                    <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                      <SelectTrigger className="w-full sm:w-[400px]">
                        <SelectValue placeholder="Seleccionar cuenta origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {cashFundAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} (Saldo: {formatCurrency(parseFloat(acc.accountBalance || acc.amount || '0'))})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <OCRConfirmationSummary
                  payments={effectivePayments}
                  loans={effectiveLoans}
                  expenses={result.expenses}
                  hasErrors={hasErrors}
                  sourceAccountId={effectiveLoans.length > 0 ? sourceAccountId || null : 'not-needed'}
                  accounts={accounts}
                  crossValidation={result.crossValidation}
                />
              </div>
            </SectionCollapsible>
          </div>
        </div>

        {/* ─── Fixed Footer ─── */}
        <div className="px-6 py-3 border-t flex items-center justify-between shrink-0 bg-background">
          <div className="text-sm text-muted-foreground">
            {confirming ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando operaciones...
              </span>
            ) : (
              <span>
                {totalPayingClients} pagos · {result.loans.length} créditos · {result.expenses.length} gastos
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                if (showConfirmPanel) {
                  handleConfirm()
                } else {
                  setShowConfirmPanel(true)
                }
              }}
              disabled={(!canConfirm && showConfirmPanel) || confirming}
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Confirmando...
                </>
              ) : showConfirmPanel ? (
                'Confirmar y Capturar'
              ) : (
                'Revisar y Confirmar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Reusable Sub-components ───

function SummaryStat({
  label,
  value,
  icon,
  detail,
  color,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  detail?: string
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple'
}) {
  const colorMap = {
    green: 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    blue: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    purple: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  }

  return (
    <div className={cn('rounded-lg border px-2.5 py-1.5', colorMap[color])}>
      <div className="flex items-center gap-1 text-[10px] font-medium opacity-70 mb-0.5">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold">{value}</div>
      {detail && <div className="text-[10px] opacity-70">{detail}</div>}
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  color?: 'green' | 'red'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
        active
          ? color === 'green'
            ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
            : color === 'red'
            ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
            : 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

function SectionCollapsible({
  title,
  icon,
  children,
  defaultOpen = false,
  forceOpen,
  onToggle,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  forceOpen?: boolean
  onToggle?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = forceOpen !== undefined ? forceOpen : internalOpen

  const toggle = () => {
    const next = !isOpen
    if (onToggle) onToggle(next)
    else setInternalOpen(next)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={toggle}
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        {isOpen
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        }
        {icon}
        <span className="font-semibold text-sm">{title}</span>
      </button>
      {isOpen && <div className="border-t">{children}</div>}
    </div>
  )
}
