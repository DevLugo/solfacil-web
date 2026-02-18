'use client'

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

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

interface OCRPaymentReviewProps {
  payments: PaymentData[]
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  if (confidence === 'alta') {
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Alta</Badge>
  }
  if (confidence === 'media') {
    return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Media</Badge>
  }
  return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Baja</Badge>
}

function MatchIcon({ method, confidence }: { method: string; confidence: string }) {
  if (method === 'unmatched') return <XCircle className="h-4 w-4 text-red-500" />
  if (confidence === 'alta') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (confidence === 'media') return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  return <AlertTriangle className="h-4 w-4 text-red-500" />
}

export function OCRPaymentReview({ payments }: OCRPaymentReviewProps) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No se encontraron listados de cobranza en el PDF.</p>
  }

  return (
    <div className="space-y-6">
      {payments.map((payment, pIdx) => (
        <div key={pIdx} className="border rounded-lg overflow-hidden">
          {/* Locality Header */}
          <div className="bg-muted/50 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{payment.localityName}</h4>
              <span className="text-sm text-muted-foreground">· {payment.leaderName}</span>
              {payment.resolvedLeaderId ? (
                <ConfidenceBadge confidence={payment.resolvedLeaderConfidence} />
              ) : (
                <Badge variant="destructive" className="text-xs">Sin match</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span>Cobranza: <strong>{formatCurrency(payment.cobranzaTotal)}</strong></span>
              <span>Comisión: <strong>{formatCurrency(payment.comisionTotal)}</strong></span>
              {payment.bankTotal > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  Depósito banco: {formatCurrency(payment.bankTotal)}
                </Badge>
              )}
              {payment.falcoAmount !== null && payment.falcoAmount > 0 && (
                <Badge variant="destructive" className="text-xs">FALCO: {formatCurrency(payment.falcoAmount)}</Badge>
              )}
            </div>
          </div>

          {/* Warnings */}
          {payment.warnings.length > 0 && (
            <div className="px-4 py-2 bg-yellow-50 border-b text-sm">
              {payment.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-1 text-yellow-700">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Client Payments Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 w-8"></th>
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Cliente</th>
                  <th className="text-right px-3 py-2">Esperado</th>
                  <th className="text-right px-3 py-2">Real</th>
                  <th className="text-center px-3 py-2">Pagó</th>
                  <th className="text-left px-3 py-2">Método</th>
                  <th className="text-right px-3 py-2">Comisión</th>
                  <th className="text-left px-3 py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {payment.clientPayments.map((cp, cIdx) => (
                  <tr key={cIdx} className={`border-t ${!cp.paid ? 'bg-red-50/50' : cp.matchMethod === 'unmatched' ? 'bg-yellow-50/50' : ''}`}>
                    <td className="px-3 py-2">
                      <MatchIcon method={cp.matchMethod} confidence={cp.matchConfidence} />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{cp.clientId}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span>{cp.clientName}</span>
                        {cp.matchMethod !== 'unmatched' && (
                          <ConfidenceBadge confidence={cp.matchConfidence} />
                        )}
                      </div>
                      {cp.amountWarning && (
                        <div className="text-xs text-yellow-600 mt-0.5">{cp.amountWarning}</div>
                      )}
                    </td>
                    <td className="text-right px-3 py-2">{formatCurrency(cp.abonoEsperado)}</td>
                    <td className="text-right px-3 py-2">
                      {cp.abonoReal !== null ? formatCurrency(cp.abonoReal) : '—'}
                    </td>
                    <td className="text-center px-3 py-2">
                      {cp.paid ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Sí</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">No</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">{cp.paymentMethod}</td>
                    <td className="text-right px-3 py-2">
                      {cp.comission !== null ? formatCurrency(cp.comission) : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{cp.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="px-4 py-2 bg-muted/30 border-t flex gap-4 text-xs text-muted-foreground">
            <span>Efectivo: {formatCurrency(payment.cashTotal)}</span>
            <span>Banco: {formatCurrency(payment.bankTotal)}</span>
            <span>{payment.clientPayments.filter(cp => cp.paid).length}/{payment.clientPayments.length} pagaron</span>
            <span>{payment.clientPayments.filter(cp => cp.matchMethod === 'unmatched').length} sin match</span>
          </div>
        </div>
      ))}
    </div>
  )
}
