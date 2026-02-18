'use client'

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

interface LoanWarning {
  code: string
  message: string
  field?: string | null
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
  warnings: LoanWarning[]
}

interface OCRLoanReviewProps {
  loans: LoanData[]
}

export function OCRLoanReview({ loans }: OCRLoanReviewProps) {
  if (loans.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No se encontraron altas de clientes en el PDF.</p>
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">Cliente</th>
            <th className="text-center px-3 py-2">Tipo</th>
            <th className="text-right px-3 py-2">Crédito</th>
            <th className="text-right px-3 py-2">Entregado</th>
            <th className="text-right px-3 py-2">Esperado</th>
            <th className="text-right px-3 py-2">Plazo</th>
            <th className="text-right px-3 py-2">Tasa est.</th>
            <th className="text-center px-3 py-2">Match</th>
            <th className="text-left px-3 py-2">Avisos</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan, idx) => {
            const deliveredMismatch = loan.expectedDeliveredAmount !== null &&
              Math.abs(loan.deliveredAmount - loan.expectedDeliveredAmount) > 1

            return (
              <tr key={idx} className={`border-t ${deliveredMismatch ? 'bg-red-50/50' : !loan.resolvedBorrowerId && !loan.isNewClient ? 'bg-yellow-50/50' : ''}`}>
                <td className="px-3 py-2 font-mono">{loan.numero}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{loan.clientName}</span>
                  {!loan.creditType && loan.isRenewal && (
                    <div className="text-xs text-blue-600 mt-0.5">Inferida como renovación</div>
                  )}
                </td>
                <td className="text-center px-3 py-2">
                  {loan.isRenewal ? (
                    <Badge variant="outline" className={`text-xs ${loan.creditType === 'R' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-50 text-blue-600 border-blue-300 border-dashed'}`}>
                      {loan.creditType === 'R' ? 'Renovación' : 'Renovación*'}
                    </Badge>
                  ) : loan.isNewClient ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Nuevo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">{loan.creditType || '?'}</Badge>
                  )}
                </td>
                <td className="text-right px-3 py-2 font-medium">{formatCurrency(loan.creditAmount)}</td>
                <td className={`text-right px-3 py-2 ${deliveredMismatch ? 'text-red-600 font-bold' : ''}`}>
                  {formatCurrency(loan.deliveredAmount)}
                </td>
                <td className="text-right px-3 py-2 text-muted-foreground">
                  {loan.expectedDeliveredAmount !== null ? (
                    <span className={deliveredMismatch ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(loan.expectedDeliveredAmount)}
                    </span>
                  ) : '—'}
                  {loan.previousLoanPending !== null && (
                    <div className="text-xs text-muted-foreground">
                      Deuda: {formatCurrency(loan.previousLoanPending)}
                    </div>
                  )}
                </td>
                <td className="text-right px-3 py-2">{loan.termWeeks}s</td>
                <td className="text-right px-3 py-2">
                  {loan.estimatedRate !== null ? `${(loan.estimatedRate * 100).toFixed(0)}%` : '—'}
                </td>
                <td className="text-center px-3 py-2">
                  {loan.resolvedBorrowerId || loan.isNewClient ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 inline" />
                  )}
                </td>
                <td className="px-3 py-2">
                  {loan.warnings.length > 0 && (
                    <div className="space-y-0.5">
                      {loan.warnings.map((w, i) => (
                        <div key={i} className={`text-xs flex items-center gap-1 ${w.code === 'DELIVERED_MISMATCH_RENEWAL' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {w.code === 'DELIVERED_MISMATCH_RENEWAL' ? (
                            <XCircle className="h-3 w-3 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                          )}
                          <span>{w.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {loan.isRenewal && !loan.resolvedPreviousLoanId && (
                    <div className="text-xs text-red-600 flex items-center gap-1">
                      <XCircle className="h-3 w-3 shrink-0" />
                      <span>Sin préstamo previo</span>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Summary */}
      <div className="px-4 py-2 bg-muted/30 border-t flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span>{loans.length} créditos</span>
        <span>{loans.filter(l => l.isRenewal).length} renovaciones</span>
        <span>{loans.filter(l => l.isNewClient).length} nuevos</span>
        <span>{loans.filter(l => l.isRenewal && !l.creditType).length} inferidas</span>
        <span>Total colocado: {formatCurrency(loans.reduce((sum, l) => sum + l.deliveredAmount, 0))}</span>
      </div>
    </div>
  )
}
