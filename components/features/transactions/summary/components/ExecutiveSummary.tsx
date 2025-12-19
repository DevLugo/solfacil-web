'use client'

import { DollarSign, TrendingUp, Wallet, Building2, CreditCard, Receipt } from 'lucide-react'
import { StatCard } from './StatCard'
import type { ExecutiveSummaryData } from '../types'

interface ExecutiveSummaryProps {
  data: ExecutiveSummaryData
}

export function ExecutiveSummary({ data }: ExecutiveSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        title="Total Cobrado"
        value={data.totalPaymentsReceived}
        icon={<DollarSign className="h-6 w-6 text-white" />}
        gradient="green"
        subtitle={`${data.paymentCount} pagos`}
      />
      <StatCard
        title="Efectivo"
        value={data.totalCashPayments}
        icon={<Wallet className="h-6 w-6 text-white" />}
        gradient="green"
      />
      <StatCard
        title="Banco"
        value={data.totalBankPayments}
        icon={<Building2 className="h-6 w-6 text-white" />}
        gradient="blue"
      />
      <StatCard
        title="Comisiones"
        value={data.totalCommissions}
        icon={<TrendingUp className="h-6 w-6 text-white" />}
        gradient="purple"
      />
      <StatCard
        title="Préstamos"
        value={data.totalLoansGranted}
        icon={<CreditCard className="h-6 w-6 text-white" />}
        gradient="blue"
        subtitle={`${data.loansGrantedCount} préstamos`}
      />
      <StatCard
        title="Gastos"
        value={data.totalExpenses}
        icon={<Receipt className="h-6 w-6 text-white" />}
        gradient="purple"
        subtitle={`${data.expenseCount} gastos`}
      />
    </div>
  )
}
