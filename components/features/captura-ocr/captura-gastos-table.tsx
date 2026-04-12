'use client'

import { Plus, Trash2, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExpenseTypeCombobox } from '@/components/features/transactions/gastos/components/ExpenseTypeCombobox'
import {
  EXPENSE_TO_ACCOUNT_TYPE,
  EXPENSE_ALLOWED_ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
} from '@/components/features/transactions/gastos/constants'
import { formatCurrency } from '@/lib/utils'
import { useCapturaOcr } from './captura-ocr-context'
import type { CapturaGasto } from './types'

// Account type options available for gastos in captura
const ACCOUNT_TYPE_OPTIONS = [
  { value: 'EMPLOYEE_CASH_FUND', label: ACCOUNT_TYPE_LABELS.EMPLOYEE_CASH_FUND },
  { value: 'PREPAID_GAS', label: ACCOUNT_TYPE_LABELS.PREPAID_GAS },
  { value: 'TRAVEL_EXPENSES', label: ACCOUNT_TYPE_LABELS.TRAVEL_EXPENSES },
] as const

interface Props {
  jobId: string
  gastos: CapturaGasto[]
}

export function CapturaGastosTable({ jobId, gastos }: Props) {
  const { updateGasto, addGasto, removeGasto } = useCapturaOcr()

  const total = gastos.reduce((sum, g) => sum + (g.monto || 0), 0)

  const handleExpenseTypeChange = (index: number, value: string) => {
    // Auto-select account type based on expense type
    const allowedTypes = EXPENSE_ALLOWED_ACCOUNT_TYPES[value]

    const preferredAccountType = EXPENSE_TO_ACCOUNT_TYPE[value]
    const sourceAccountType = preferredAccountType || 'EMPLOYEE_CASH_FUND'

    // Verify it's in the allowed list (if there is one)
    const finalAccountType = allowedTypes && !allowedTypes.includes(sourceAccountType as never)
      ? allowedTypes[0]
      : sourceAccountType

    updateGasto(jobId, index, { expenseSource: value, sourceAccountType: finalAccountType })
  }

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Gastos del Dia
            {gastos.length > 0 && (
              <span className="text-muted-foreground font-normal">
                ({gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'} — {formatCurrency(total)})
              </span>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7"
            onClick={() => addGasto(jobId)}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {gastos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Sin gastos registrados en el PDF.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground w-[120px]">Monto</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Cuenta</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Descripcion</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground w-[120px]">Concepto OCR</th>
                  <th className="py-2 px-3 w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {gastos.map((gasto, index) => (
                  <GastoRow
                    key={index}
                    gasto={gasto}
                    index={index}
                    jobId={jobId}
                    onExpenseTypeChange={handleExpenseTypeChange}
                    onUpdate={updateGasto}
                    onRemove={removeGasto}
                  />
                ))}
              </tbody>
              {gastos.length > 1 && (
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="py-2 px-3">TOTAL</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {formatCurrency(total)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GastoRow({
  gasto,
  index,
  jobId,
  onExpenseTypeChange,
  onUpdate,
  onRemove,
}: {
  gasto: CapturaGasto
  index: number
  jobId: string
  onExpenseTypeChange: (index: number, value: string) => void
  onUpdate: (jobId: string, index: number, changes: Partial<CapturaGasto>) => void
  onRemove: (jobId: string, index: number) => void
}) {
  // Filter account type options based on expense type
  const allowedTypes = gasto.expenseSource ? EXPENSE_ALLOWED_ACCOUNT_TYPES[gasto.expenseSource] : undefined
  const accountOptions = allowedTypes
    ? ACCOUNT_TYPE_OPTIONS.filter(opt => (allowedTypes as string[]).includes(opt.value))
    : ACCOUNT_TYPE_OPTIONS

  return (
    <tr className="border-b last:border-b-0">
      <td className="py-1.5 px-3">
        <ExpenseTypeCombobox
          value={gasto.expenseSource || ''}
          onValueChange={(val) => onExpenseTypeChange(index, val)}
          placeholder="Tipo..."
          className="w-[160px]"
        />
      </td>
      <td className="py-1.5 px-3">
        <Input
          type="number"
          value={gasto.monto || ''}
          onChange={(e) => onUpdate(jobId, index, { monto: parseFloat(e.target.value) || 0 })}
          onWheel={(e) => e.currentTarget.blur()}
          className="w-[110px] text-right tabular-nums"
        />
      </td>
      <td className="py-1.5 px-3">
        <Select
          value={gasto.sourceAccountType || 'EMPLOYEE_CASH_FUND'}
          onValueChange={(val) => onUpdate(jobId, index, { sourceAccountType: val })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accountOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-1.5 px-3">
        <Input
          type="text"
          placeholder="Nombre, notas..."
          value={gasto.description || ''}
          onChange={(e) => onUpdate(jobId, index, { description: e.target.value.toUpperCase() })}
          className="w-full uppercase"
        />
      </td>
      <td className="py-1.5 px-3 text-xs text-muted-foreground truncate max-w-[120px]" title={gasto.concepto}>
        {gasto.concepto || '—'}
      </td>
      <td className="py-1.5 px-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onRemove(jobId, index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )
}
