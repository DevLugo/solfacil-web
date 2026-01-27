'use client'

import { Users, UserCheck, UserX, Skull, Receipt } from 'lucide-react'
import { KPICard } from './KPICard'

// Utility function to format currency without decimals
function formatCurrencyNoDecimals(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue)
}

interface DashboardKPIRowProps {
  // Clientes Activos
  clientesActivos: number
  clientesActivosVsPrev?: number
  // Pagando (Al Corriente)
  clientesAlCorriente: number
  clientesAlCorrienteVsPrev?: number
  // Cartera Vencida
  clientesEnCV: number
  clientesEnCVVsPrev?: number
  cvPercentage?: string
  // CV Criticos (3+ semanas sin pago)
  criticalClientsCount: number
  criticalClientsTotal: string
  // Gastos Semana
  totalExpenses: number
  expensesChangePercent?: number
  onExpensesClick?: () => void
}

export function DashboardKPIRow({
  clientesActivos,
  clientesActivosVsPrev,
  clientesAlCorriente,
  clientesAlCorrienteVsPrev,
  clientesEnCV,
  clientesEnCVVsPrev,
  cvPercentage,
  criticalClientsCount,
  criticalClientsTotal,
  totalExpenses,
  expensesChangePercent,
  onExpensesClick,
}: DashboardKPIRowProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Clientes Activos */}
      <KPICard
        title="Clientes Activos"
        value={clientesActivos}
        icon={Users}
        deltaVsPreviousWeek={clientesActivosVsPrev}
        variant="default"
      />

      {/* Pagando (Al Corriente) */}
      <KPICard
        title="Pagando"
        value={clientesAlCorriente}
        icon={UserCheck}
        deltaVsPreviousWeek={clientesAlCorrienteVsPrev}
        variant="success"
      />

      {/* Cartera Vencida */}
      <KPICard
        title="Cartera Vencida"
        value={clientesEnCV}
        icon={UserX}
        deltaVsPreviousWeek={clientesEnCVVsPrev}
        variant="danger"
        subtitle={cvPercentage}
      />

      {/* CV Criticos (3+ semanas sin pago) */}
      <KPICard
        title="CV Críticos (3+ sem)"
        value={criticalClientsCount}
        icon={Skull}
        variant="warning"
        subtitle={criticalClientsTotal !== '0' ? formatCurrencyNoDecimals(criticalClientsTotal) + ' pendiente' : undefined}
      />

      {/* Gastos Semana */}
      <KPICard
        title="Gastos Semana"
        value={totalExpenses}
        icon={Receipt}
        format="currency"
        deltaVsPreviousWeek={expensesChangePercent}
        variant="default"
        onViewMore={onExpensesClick}
      />
    </div>
  )
}
