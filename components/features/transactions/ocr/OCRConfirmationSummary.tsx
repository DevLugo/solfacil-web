'use client'

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DollarSign,
  Wallet,
  Building2,
  CreditCard,
  Receipt,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'

/** Safely parse any value to number (GraphQL Decimal comes as string) */
const num = (v: unknown): number => Number(v) || 0

// ─── Types ───

interface Account {
  id: string
  name: string
  type: string
  amount: string
  accountBalance: string
}

interface ClientPayment {
  clientId: string
  clientName: string
  abonoEsperado: number
  abonoReal: number | null
  paid: boolean
  paymentMethod: string
  comission: number | null
  resolvedLoanId: string | null
  matchConfidence: string
  matchMethod: string
}

interface PaymentData {
  localityName: string
  leaderName: string
  resolvedLeaderId: string | null
  cobranzaTotal: number
  comisionTotal: number
  cashTotal: number
  bankTotal: number
  falcoAmount: number | null
  clientPayments: ClientPayment[]
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
  isNewClient: boolean
  isRenewal: boolean
  localityName: string | null
}

interface ExpenseData {
  expenseType: string
  amount: number
  resolvedSourceType: string
  resolvedAccountId: string | null
}

interface CrossValidation {
  inicialEfectivo: number | null
  finalEfectivo: number | null
  fichaDeposito: number | null
  totalColocado: number | null
  totalCuota: number | null
  totalGastos: number | null
  extracobranza: number | null
  expectedCashTotal: number | null
  cashCountTotal: number | null
  cashDifference: number | null
  registroDiarioTotal: number | null
}

interface OCRConfirmationSummaryProps {
  payments: PaymentData[]
  loans: LoanData[]
  expenses: ExpenseData[]
  hasErrors: boolean
  sourceAccountId: string | null
  accounts: Account[]
  crossValidation: CrossValidation | null
}

// ─── Helper: Compute account impacts ───

interface DetailLine {
  label: string
  amount: number
  group: string
}

interface AccountImpact {
  accountId: string
  accountName: string
  accountType: string
  currentBalance: number
  delta: number
  projectedBalance: number
  details: DetailLine[]
}

function computeAccountImpacts(
  accounts: Account[],
  payments: PaymentData[],
  loans: LoanData[],
  expenses: ExpenseData[],
  sourceAccountId: string | null,
): AccountImpact[] {
  // Build delta map: accountId → { delta, details }
  const deltaMap = new Map<string, { delta: number; details: DetailLine[] }>()

  const ensureAccount = (id: string) => {
    if (!deltaMap.has(id)) {
      deltaMap.set(id, { delta: 0, details: [] })
    }
    return deltaMap.get(id)!
  }

  // Find account IDs by type
  const cashFundAccount = accounts.find((a) => a.type === 'EMPLOYEE_CASH_FUND')
  const bankAccount = accounts.find((a) => a.type === 'BANK')

  // 1. Payments → cash to EMPLOYEE_CASH_FUND, bank to BANK
  for (const p of payments) {
    if (!p.resolvedLeaderId) continue
    const payingClients = p.clientPayments.filter((cp) => cp.paid && cp.resolvedLoanId)
    if (payingClients.length === 0) continue

    const group = p.localityName

    // Cash payments
    if (cashFundAccount && num(p.cashTotal) > 0) {
      const entry = ensureAccount(cashFundAccount.id)
      entry.delta += num(p.cashTotal)
      entry.details.push({ label: 'Cobranza efectivo', amount: num(p.cashTotal), group })
    }

    // Bank payments
    if (bankAccount && num(p.bankTotal) > 0) {
      const entry = ensureAccount(bankAccount.id)
      entry.delta += num(p.bankTotal)
      entry.details.push({ label: 'Cobranza banco', amount: num(p.bankTotal), group })
    }

    // Commissions → DEBIT from EMPLOYEE_CASH_FUND
    const totalComission = payingClients.reduce((s, cp) => s + num(cp.comission), 0)
    if (cashFundAccount && totalComission > 0) {
      const entry = ensureAccount(cashFundAccount.id)
      entry.delta -= totalComission
      entry.details.push({ label: 'Comisiones', amount: -totalComission, group })
    }

    // FALCO → DEBIT from EMPLOYEE_CASH_FUND
    if (cashFundAccount && num(p.falcoAmount) > 0) {
      const entry = ensureAccount(cashFundAccount.id)
      entry.delta -= num(p.falcoAmount)
      entry.details.push({ label: 'FALCO', amount: -num(p.falcoAmount), group })
    }
  }

  // 2. Loans → DEBIT from sourceAccountId, grouped by locality
  if (sourceAccountId && loans.length > 0) {
    const readyLoans = loans.filter((l) => l.resolvedLoantypeId && (l.resolvedBorrowerId || l.isNewClient))
    // Group by locality
    const loansByLocality = new Map<string, LoanData[]>()
    for (const l of readyLoans) {
      const key = l.localityName || 'Sin localidad'
      const arr = loansByLocality.get(key) || []
      arr.push(l)
      loansByLocality.set(key, arr)
    }
    for (const [locality, localLoans] of loansByLocality) {
      const totalDelivered = localLoans.reduce((s, l) => s + num(l.deliveredAmount), 0)
      if (totalDelivered > 0) {
        const entry = ensureAccount(sourceAccountId)
        entry.delta -= totalDelivered
        entry.details.push({
          label: `Créditos (${localLoans.length})`,
          amount: -totalDelivered,
          group: locality,
        })
      }
    }
  }

  // 3. Expenses → DEBIT from resolvedAccountId
  for (const exp of expenses) {
    if (exp.resolvedAccountId && num(exp.amount) > 0) {
      const entry = ensureAccount(exp.resolvedAccountId)
      entry.delta -= num(exp.amount)
      entry.details.push({ label: exp.expenseType, amount: -num(exp.amount), group: 'Gastos' })
    }
  }

  // Build result for all accounts (even those with 0 delta)
  return accounts.map((acc) => {
    const impact = deltaMap.get(acc.id)
    const currentBalance = parseFloat(acc.accountBalance || acc.amount || '0')
    const delta = impact?.delta ?? 0
    return {
      accountId: acc.id,
      accountName: acc.name,
      accountType: acc.type,
      currentBalance,
      delta,
      projectedBalance: currentBalance + delta,
      details: impact?.details ?? [],
    }
  })
}

// ─── Stat Card (replicates summary/StatCard) ───

function MiniStatCard({
  title,
  value,
  icon,
  colorClass,
  subtitle,
}: {
  title: string
  value: number
  icon: React.ReactNode
  colorClass: string
  subtitle?: string
}) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between mb-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClass)}>
          {icon}
        </div>
      </div>
      <h3 className="text-xs font-medium text-muted-foreground mb-0.5">{title}</h3>
      <p className="text-lg font-bold">{formatCurrency(value)}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  )
}

// ─── Account Icon helper ───

function getAccountIcon(type: string) {
  if (type === 'BANK') return <Building2 className="h-4 w-4" />
  if (type === 'EMPLOYEE_CASH_FUND') return <Wallet className="h-4 w-4" />
  return <DollarSign className="h-4 w-4" />
}

// ─── Main Component ───

export function OCRConfirmationSummary({
  payments,
  loans,
  expenses,
  hasErrors,
  sourceAccountId,
  accounts,
  crossValidation,
}: OCRConfirmationSummaryProps) {
  const accountImpacts = computeAccountImpacts(accounts, payments, loans, expenses, sourceAccountId)

  // Compute totals for stat cards
  const totalCashPayments = payments.reduce((s, p) => s + num(p.cashTotal), 0)
  const totalBankPayments = payments.reduce((s, p) => s + num(p.bankTotal), 0)
  const totalCobranza = totalCashPayments + totalBankPayments
  // Client deposits (DP): clients who paid via MONEY_TRANSFER (subset of cobranza)
  const totalClientDeposits = payments.reduce((s, p) => {
    return s + p.clientPayments
      .filter((cp) => cp.paid && cp.paymentMethod === 'MONEY_TRANSFER')
      .reduce((cs, cp) => cs + num(cp.abonoReal ?? cp.abonoEsperado), 0)
  }, 0)
  const totalComisiones = payments.reduce((s, p) => {
    const payingClients = p.clientPayments.filter((cp) => cp.paid && cp.resolvedLoanId)
    return s + payingClients.reduce((cs, cp) => cs + num(cp.comission), 0)
  }, 0)
  const totalLoansDelivered = loans
    .filter((l) => l.resolvedLoantypeId && (l.resolvedBorrowerId || l.isNewClient))
    .reduce((s, l) => s + num(l.deliveredAmount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + num(e.amount), 0)

  // Hoja de corte validation
  const cashFundAccount = accounts.find((a) => a.type === 'EMPLOYEE_CASH_FUND')
  const cashFundBalance = cashFundAccount
    ? parseFloat(cashFundAccount.accountBalance || cashFundAccount.amount || '0')
    : null
  const cashFundImpact = accountImpacts.find((a) => a.accountType === 'EMPLOYEE_CASH_FUND')

  const inicialEfectivo = crossValidation?.inicialEfectivo ?? null
  const finalEfectivo = crossValidation?.finalEfectivo ?? null

  const inicialMatch =
    inicialEfectivo !== null && cashFundBalance !== null
      ? Math.abs(inicialEfectivo - cashFundBalance) < 1
      : null
  const finalMatch =
    finalEfectivo !== null && cashFundImpact
      ? Math.abs(finalEfectivo - cashFundImpact.projectedBalance) < 1
      : null

  // Blocking issues
  const blockingIssues = getBlockingIssues(payments, loans, hasErrors, sourceAccountId, expenses)

  // Saldo warnings (non-blocking)
  const negativeAccounts = accountImpacts.filter((a) => a.projectedBalance < -0.01)

  return (
    <div className="space-y-4">
      {/* Blocking Issues */}
      {blockingIssues.length > 0 && (
        <div className="border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/50 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            No se puede confirmar
          </div>
          {blockingIssues.map((issue, i) => (
            <div key={i} className="text-sm text-red-600 dark:text-red-400 ml-5.5 pl-0.5">
              - {issue}
            </div>
          ))}
        </div>
      )}

      {blockingIssues.length === 0 && (
        <div className="border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-950/50 p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Listo para confirmar
          </div>
        </div>
      )}

      {/* Negative balance warning */}
      {negativeAccounts.length > 0 && (
        <div className="border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/50 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Saldo negativo proyectado
          </div>
          {negativeAccounts.map((acc) => (
            <div key={acc.accountId} className="text-sm text-amber-600 dark:text-amber-400 ml-5.5 pl-0.5">
              - {acc.accountName}: {formatCurrency(acc.projectedBalance)}
            </div>
          ))}
        </div>
      )}

      {/* Section 1: Account Balances — Before vs After */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-2">
          <h4 className="font-semibold text-sm">Cuentas — Antes vs Después</h4>
        </div>

        {/* Hoja de corte comparison */}
        {(inicialEfectivo !== null || finalEfectivo !== null) && (
          <div className="px-4 py-2 border-b bg-muted/40 text-xs space-y-1">
            {inicialEfectivo !== null && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-44">Hoja de corte — Inicial:</span>
                <span className="font-medium">{formatCurrency(inicialEfectivo)}</span>
                {cashFundBalance !== null && (
                  <>
                    <span className="text-muted-foreground">vs Caja actual:</span>
                    <span className="font-medium">{formatCurrency(cashFundBalance)}</span>
                    {inicialMatch !== null && (
                      inicialMatch ? (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 text-xs">Coincide</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Dif: {formatCurrency(inicialEfectivo - cashFundBalance!)}
                        </Badge>
                      )
                    )}
                  </>
                )}
              </div>
            )}
            {finalEfectivo !== null && cashFundImpact && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-44">Hoja de corte — Final:</span>
                <span className="font-medium">{formatCurrency(finalEfectivo)}</span>
                <span className="text-muted-foreground">vs Proyectado:</span>
                <span className="font-medium">{formatCurrency(cashFundImpact.projectedBalance)}</span>
                {finalMatch !== null && (
                  finalMatch ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Coincide</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Dif: {formatCurrency(finalEfectivo - cashFundImpact.projectedBalance)}
                    </Badge>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Cash formula breakdown from corte */}
        {crossValidation?.expectedCashTotal != null && crossValidation?.registroDiarioTotal != null && (
          <div className="px-4 py-2 border-b bg-muted/30 text-xs space-y-1">
            <div className="font-semibold text-muted-foreground mb-1">Caja esperada (Hoja de Corte)</div>
            <div className="flex justify-between max-w-xs">
              <span className="text-muted-foreground">+ Cobranza total</span>
              <span className="text-green-600 font-mono">{formatCurrency(num(crossValidation.registroDiarioTotal))}</span>
            </div>
            {num(crossValidation.totalCuota) > 0 && (
              <div className="flex justify-between max-w-xs">
                <span className="text-muted-foreground">- Cuota (comisiones)</span>
                <span className="text-red-600 font-mono">-{formatCurrency(num(crossValidation.totalCuota))}</span>
              </div>
            )}
            {num(crossValidation.totalColocado) > 0 && (
              <div className="flex justify-between max-w-xs">
                <span className="text-muted-foreground">- Colocaciones</span>
                <span className="text-red-600 font-mono">-{formatCurrency(num(crossValidation.totalColocado))}</span>
              </div>
            )}
            {num(crossValidation.totalGastos) > 0 && (
              <div className="flex justify-between max-w-xs">
                <span className="text-muted-foreground">- Gastos</span>
                <span className="text-red-600 font-mono">-{formatCurrency(num(crossValidation.totalGastos))}</span>
              </div>
            )}
            {num(crossValidation.extracobranza) > 0 && (
              <div className="flex justify-between max-w-xs">
                <span className="text-muted-foreground">+ Extracobranza</span>
                <span className="text-green-600 font-mono">{formatCurrency(num(crossValidation.extracobranza))}</span>
              </div>
            )}
            <div className="flex justify-between max-w-xs border-t pt-1 mt-1">
              <span className="font-semibold">= Efectivo esperado</span>
              <span className="font-bold font-mono">{formatCurrency(num(crossValidation.expectedCashTotal))}</span>
            </div>
            {crossValidation.cashCountTotal != null && (
              <div className="flex justify-between max-w-xs">
                <span className="text-muted-foreground">Conteo físico</span>
                <span className="font-mono">{formatCurrency(num(crossValidation.cashCountTotal))}</span>
              </div>
            )}
            {crossValidation.cashDifference != null && Math.abs(num(crossValidation.cashDifference)) > 0.5 && (
              <div className="flex justify-between max-w-xs">
                <span className="text-muted-foreground">Diferencia</span>
                <span className={cn('font-mono font-medium', num(crossValidation.cashDifference) > 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(num(crossValidation.cashDifference))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Account table */}
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-2">Cuenta</th>
              <th className="text-right px-4 py-2">Saldo Actual</th>
              <th className="text-center px-4 py-2 w-8"></th>
              <th className="text-left px-4 py-2">Movimientos</th>
              <th className="text-center px-4 py-2 w-8"></th>
              <th className="text-right px-4 py-2">Saldo Proyectado</th>
            </tr>
          </thead>
          <tbody>
            {accountImpacts.map((acc) => (
              <tr key={acc.accountId} className={cn('border-t', acc.delta !== 0 ? '' : 'text-muted-foreground')}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {getAccountIcon(acc.accountType)}
                    <span className="font-medium">{acc.accountName}</span>
                  </div>
                </td>
                <td className="text-right px-4 py-2 font-mono">{formatCurrency(acc.currentBalance)}</td>
                <td className="text-center px-4 py-1">
                  {acc.delta !== 0 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-auto" />}
                </td>
                <td className="px-4 py-2">
                  {acc.details.length > 0 ? (
                    <div className="space-y-1">
                      {(() => {
                        // Group details by group name, preserving order
                        const groups: { name: string; items: DetailLine[] }[] = []
                        for (const d of acc.details) {
                          const last = groups[groups.length - 1]
                          if (last && last.name === d.group) {
                            last.items.push(d)
                          } else {
                            groups.push({ name: d.group, items: [d] })
                          }
                        }
                        return groups.map((g, gi) => (
                          <div key={gi}>
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{g.name}</div>
                            {g.items.map((d, i) => (
                              <div key={i} className="flex justify-between gap-3 text-xs font-mono pl-2">
                                <span className="text-muted-foreground truncate">{d.label}</span>
                                <span className={cn('font-medium whitespace-nowrap', d.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                                  {d.amount > 0 ? '+' : ''}{formatCurrency(d.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))
                      })()}
                      <div className="flex justify-between gap-3 text-xs font-mono border-t pt-1 mt-1">
                        <span className="font-semibold">Neto</span>
                        <span className={cn('font-bold', acc.delta > 0 ? 'text-green-600' : acc.delta < 0 ? 'text-red-600' : '')}>
                          {acc.delta > 0 ? '+' : ''}{formatCurrency(acc.delta)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right text-muted-foreground">—</div>
                  )}
                </td>
                <td className="text-center px-4 py-1">
                  {acc.delta !== 0 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-auto" />}
                </td>
                <td className={cn('text-right px-4 py-2 font-mono font-bold', acc.projectedBalance < -0.01 ? 'text-red-600' : '')}>
                  {formatCurrency(acc.projectedBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section 2: Executive Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MiniStatCard
          title="Total Cobrado"
          value={totalCobranza}
          icon={<DollarSign className="h-4 w-4 text-white" />}
          colorClass="bg-gradient-to-br from-green-500 to-green-600"
          subtitle={`${payments.length} localidades`}
        />
        <MiniStatCard
          title="Efectivo Líder"
          value={totalCashPayments}
          icon={<Wallet className="h-4 w-4 text-white" />}
          colorClass="bg-gradient-to-br from-green-500 to-green-600"
          subtitle="En mano"
        />
        <MiniStatCard
          title="Depósito Líder"
          value={totalBankPayments}
          icon={<Building2 className="h-4 w-4 text-white" />}
          colorClass="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle="A banco"
        />
        {totalClientDeposits > 0 && (
          <MiniStatCard
            title="Depósitos Clientes"
            value={totalClientDeposits}
            icon={<Building2 className="h-4 w-4 text-white" />}
            colorClass="bg-gradient-to-br from-cyan-500 to-cyan-600"
            subtitle="Pagos DP"
          />
        )}
        <MiniStatCard
          title="Comisiones"
          value={totalComisiones}
          icon={<TrendingUp className="h-4 w-4 text-white" />}
          colorClass="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <MiniStatCard
          title="Préstamos"
          value={totalLoansDelivered}
          icon={<CreditCard className="h-4 w-4 text-white" />}
          colorClass="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle={`${loans.length} créditos`}
        />
        <MiniStatCard
          title="Gastos"
          value={totalExpenses}
          icon={<Receipt className="h-4 w-4 text-white" />}
          colorClass="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle={`${expenses.length} gastos`}
        />
      </div>

      {/* Section 3: Per-locality breakdown */}
      {payments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Desglose por Localidad</h4>
          {payments.map((p, idx) => {
            const payingClients = p.clientPayments.filter((cp) => cp.paid && cp.resolvedLoanId)
            const localComisions = payingClients.reduce((s, cp) => s + num(cp.comission), 0)
            const balanceEfectivo = num(p.cashTotal) - localComisions - num(p.falcoAmount)
            const balanceBanco = num(p.bankTotal)
            const localClientDeposits = p.clientPayments
              .filter((cp) => cp.paid && cp.paymentMethod === 'MONEY_TRANSFER')
              .reduce((s, cp) => s + num(cp.abonoReal ?? cp.abonoEsperado), 0)

            return (
              <Card key={idx} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {p.resolvedLeaderId ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium text-sm">{p.localityName}</span>
                    <span className="text-xs text-muted-foreground">({p.leaderName})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span>{payingClients.length} pagos</span>
                    <span className="font-medium">{formatCurrency(num(p.cobranzaTotal))}</span>
                  </div>
                </div>
                <div className={cn('grid gap-2 text-xs', localClientDeposits > 0 ? 'grid-cols-3' : 'grid-cols-2')}>
                  <div className="bg-muted/30 rounded p-2">
                    <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                      <Wallet className="h-3 w-3 text-green-600" />
                      <span>Efectivo Líder</span>
                    </div>
                    <span className={cn('font-bold', balanceEfectivo >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(balanceEfectivo)}
                    </span>
                    <div className="mt-1 space-y-0.5 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>+ Efectivo</span>
                        <span className="text-green-600">{formatCurrency(num(p.cashTotal))}</span>
                      </div>
                      {localComisions > 0 && (
                        <div className="flex justify-between">
                          <span>- Comisiones</span>
                          <span className="text-red-600">-{formatCurrency(localComisions)}</span>
                        </div>
                      )}
                      {num(p.falcoAmount) > 0 && (
                        <div className="flex justify-between">
                          <span>- FALCO</span>
                          <span className="text-red-600">-{formatCurrency(num(p.falcoAmount))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded p-2">
                    <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                      <Building2 className="h-3 w-3 text-blue-600" />
                      <span>Depósito Líder</span>
                    </div>
                    <span className="font-bold text-blue-600">{formatCurrency(balanceBanco)}</span>
                    {balanceBanco > 0 && (
                      <div className="mt-1 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>+ A banco</span>
                          <span className="text-blue-600">{formatCurrency(balanceBanco)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {localClientDeposits > 0 && (
                    <div className="bg-muted/30 rounded p-2">
                      <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                        <Building2 className="h-3 w-3 text-cyan-600" />
                        <span>Depósitos Clientes</span>
                      </div>
                      <span className="font-bold text-cyan-600">{formatCurrency(localClientDeposits)}</span>
                      <div className="mt-1 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Pagos DP</span>
                          <span className="text-cyan-600">{formatCurrency(localClientDeposits)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Blocking Issues (exported for modal to use) ───

export function getBlockingIssues(
  payments: PaymentData[],
  loans: LoanData[],
  hasErrors: boolean,
  sourceAccountId: string | null,
  expenses?: ExpenseData[],
): string[] {
  const issues: string[] = []
  if (hasErrors) {
    issues.push('Hay errores de validación')
  }

  const totalUnmatched = payments.reduce(
    (s, p) => s + p.clientPayments.filter((cp) => cp.paid && !cp.resolvedLoanId).length,
    0
  )
  if (totalUnmatched > 0) {
    issues.push(`${totalUnmatched} pago(s) sin match`)
  }

  const loansNotReady = loans.filter((l) => !l.resolvedLoantypeId || (!l.resolvedBorrowerId && !l.isNewClient))
  if (loansNotReady.length > 0) {
    issues.push(`${loansNotReady.length} crédito(s) sin resolver`)
  }

  if (loans.length > 0 && !sourceAccountId) {
    issues.push('Falta cuenta origen para créditos')
  }

  // BUG#2: Loans need a leadId — if no payment has a resolvedLeaderId, we can't assign loans
  if (loans.length > 0 && !payments.some((p) => p.resolvedLeaderId)) {
    issues.push('No hay líder identificado para asignar créditos')
  }

  const paymentsWithoutLeader = payments.filter((p) => !p.resolvedLeaderId)
  if (paymentsWithoutLeader.length > 0) {
    issues.push(`${paymentsWithoutLeader.length} localidad(es) sin líder`)
  }

  // BUG#4: Expenses without resolvedAccountId can't be properly debited
  if (expenses) {
    const expensesWithoutAccount = expenses.filter((e) => !e.resolvedAccountId && num(e.amount) > 0)
    if (expensesWithoutAccount.length > 0) {
      issues.push(`${expensesWithoutAccount.length} gasto(s) sin cuenta asignada`)
    }
  }

  return issues
}
