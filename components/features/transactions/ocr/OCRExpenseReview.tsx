'use client'

import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

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

interface OCRExpenseReviewProps {
  expenses: ExpenseData[]
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  GASOLINE: 'Gasolina',
  GASOLINE_TOKA: 'Gasolina TOKA',
  VIATIC: 'Viáticos',
  GENERAL_EXPENSE: 'Gasto general',
  TRAVEL_EXPENSES: 'Gastos de viaje',
  EMPLOYEE_EXPENSE: 'Gasto empleado',
  NOMINA_SALARY: 'Nómina',
  EXTERNAL_SALARY: 'Salario externo',
  BANK_EXPENSE: 'Gasto bancario',
  CAR_PAYMENT: 'Pago de vehículo',
  FALCO_LOSS: 'Pérdida FALCO',
  ASSET_ACQUISITION: 'Adquisición de activo',
  OTHER_EXPENSE: 'Otro gasto',
}

export function OCRExpenseReview({ expenses }: OCRExpenseReviewProps) {
  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No se encontraron gastos en el PDF.</p>
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-3 py-2">Tipo</th>
            <th className="text-left px-3 py-2">Establecimiento</th>
            <th className="text-right px-3 py-2">Monto</th>
            <th className="text-left px-3 py-2">Fecha</th>
            <th className="text-left px-3 py-2">Método</th>
            <th className="text-left px-3 py-2">Categoría</th>
            <th className="text-center px-3 py-2">Confianza</th>
            <th className="text-left px-3 py-2">Notas</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense, idx) => (
            <tr key={idx} className="border-t">
              <td className="px-3 py-2 font-medium">{expense.expenseType}</td>
              <td className="px-3 py-2">{expense.establishment || '—'}</td>
              <td className="text-right px-3 py-2 font-medium">{formatCurrency(expense.amount)}</td>
              <td className="px-3 py-2 text-xs">{expense.date}</td>
              <td className="px-3 py-2 text-xs">{expense.paymentMethod}</td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="text-xs">
                  {SOURCE_TYPE_LABELS[expense.resolvedSourceType] || expense.resolvedSourceType}
                </Badge>
              </td>
              <td className="text-center px-3 py-2">
                {expense.confidence === 'alta' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 inline" />
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{expense.notes || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="px-4 py-2 bg-muted/30 border-t flex gap-4 text-xs text-muted-foreground">
        <span>{expenses.length} gastos</span>
        <span>Total: {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}</span>
      </div>
    </div>
  )
}
