'use client'

import { useState } from 'react'
import { useLazyQuery } from '@apollo/client'
import {
  User,
  Phone,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Trash2,
  History,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LoanDocumentPhotos } from '@/components/features/historial-clientes/components/LoanDocumentPhotos'
import { PaymentHistoryModal } from '@/components/features/historial-clientes/components/PaymentHistoryModal'
import { GET_LOAN_HISTORY_DETAIL_QUERY } from '@/graphql/queries/clients'
import type { LoanHistoryDetail } from '@/components/features/historial-clientes/types'
import type { BadDebtClientItem } from '../types'

interface BadDebtClientCardProps {
  client: BadDebtClientItem
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

export function BadDebtClientCard({ client }: BadDebtClientCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [loanDetail, setLoanDetail] = useState<LoanHistoryDetail | null>(null)

  const [fetchLoanDetail, { loading: loadingLoan }] = useLazyQuery(
    GET_LOAN_HISTORY_DETAIL_QUERY,
    {
      fetchPolicy: 'cache-first',
      onCompleted: (data) => {
        if (data?.getLoanHistoryDetail) {
          setLoanDetail(data.getLoanHistoryDetail)
          setShowHistoryModal(true)
        }
      },
    }
  )

  const handleShowHistory = () => {
    if (loanDetail) {
      setShowHistoryModal(true)
    } else {
      fetchLoanDetail({ variables: { loanId: client.loanId } })
    }
  }

  const pendingAmount = parseFloat(client.pendingDebt)
  const paidAmount = parseFloat(client.totalPaid)
  const requestedAmount = parseFloat(client.amountRequested)

  // Calculate payment progress
  const totalDue = parseFloat(client.totalAmountDue)
  const progressPercent = totalDue > 0 ? (paidAmount / totalDue) * 100 : 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-3">
        {/* Header row: Name + Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="rounded-full p-2 bg-destructive/10 flex-shrink-0">
              <User className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">
                {client.clientName}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {client.clientCode && (
                  <span className="font-mono">{client.clientCode}</span>
                )}
                {client.clientPhone && (
                  <span className="flex items-center gap-0.5">
                    <Phone className="h-3 w-3" />
                    {client.clientPhone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              'text-[10px] flex-shrink-0',
              client.isFromCleanup
                ? 'border-warning text-warning bg-warning/10'
                : 'border-destructive text-destructive bg-destructive/10'
            )}
          >
            {client.isFromCleanup ? (
              <>
                <Trash2 className="h-3 w-3 mr-0.5" />
                Limpieza
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-0.5" />
                Cartera Vencida
              </>
            )}
          </Badge>
        </div>

        {/* Amounts row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-[10px] text-muted-foreground">Solicitado</div>
            <div className="text-xs font-semibold">
              {formatCurrency(requestedAmount)}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-success/10">
            <div className="text-[10px] text-success">Pagado</div>
            <div className="text-xs font-semibold text-success">
              {formatCurrency(paidAmount)}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10">
            <div className="text-[10px] text-destructive">Debe</div>
            <div className="text-xs font-bold text-destructive">
              {formatCurrency(pendingAmount)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{progressPercent.toFixed(0)}% pagado</span>
            <span>Total: {formatCurrency(totalDue)}</span>
          </div>
        </div>

        {/* Location and Leader info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-muted-foreground text-[10px]">Localidad</div>
              <div className="truncate">{client.locationName || '-'}</div>
              {client.routeName && (
                <div className="text-[10px] text-muted-foreground truncate">
                  {client.routeName}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-muted-foreground text-[10px]">Líder</div>
              <div className="truncate">{client.leadName || '-'}</div>
              {client.leadPhone && (
                <div className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                  <Phone className="h-2.5 w-2.5" />
                  {client.leadPhone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dates row */}
        <div className="flex items-center justify-between text-xs border-t pt-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Inicio: {formatDate(client.signDate)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Último pago: {formatDate(client.lastPaymentDate)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleShowHistory}
            disabled={loadingLoan}
          >
            {loadingLoan ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <History className="h-3 w-3 mr-1" />
            )}
            Ver Historial
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Ocultar docs
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Ver docs
              </>
            )}
          </Button>
        </div>

        {/* Photos section */}
        {expanded && (
          <div className="pt-2 border-t">
            <LoanDocumentPhotos
              loanId={client.loanId}
              loanDate={client.signDate}
            />
          </div>
        )}
      </CardContent>

      {/* Payment History Modal */}
      {loanDetail && (
        <PaymentHistoryModal
          loan={loanDetail}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </Card>
  )
}
