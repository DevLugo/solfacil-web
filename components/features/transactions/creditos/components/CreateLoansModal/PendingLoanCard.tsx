'use client'

import { User, MapPin, RefreshCw, DollarSign, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { PendingLoan } from '../../types'

interface PendingLoanCardProps {
  loan: PendingLoan
  isEditing: boolean
  onEdit: (loan: PendingLoan) => void
  onRemove: (tempId: string) => void
}

export function PendingLoanCard({ loan, isEditing, onEdit, onRemove }: PendingLoanCardProps) {
  return (
    <Card
      className={`relative touch-manipulation cursor-pointer transition-all ${
        isEditing
          ? 'border-2 border-primary bg-primary/5 shadow-sm'
          : 'hover:bg-muted/50'
      }`}
      onClick={() => onEdit(loan)}
    >
      <CardContent className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium text-sm truncate">{loan.borrowerName}</span>
              {loan.isFromDifferentLocation && (
                <MapPin className="h-3 w-3 text-yellow-500 flex-shrink-0" />
              )}
              {loan.isRenewal && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0">
                  <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                  Renovación
                </Badge>
              )}
              {isEditing && (
                <Badge variant="default" className="text-[10px] h-5 px-1.5 flex-shrink-0">
                  Editando
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {loan.loantypeName} - {loan.weekDuration} sem
            </div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(parseFloat(loan.amountGived))}
            </div>
            {loan.comissionAmount && parseFloat(loan.comissionAmount) > 0 && (
              <div className="text-xs text-muted-foreground">
                Comisión: {formatCurrency(parseFloat(loan.comissionAmount))}
              </div>
            )}
            {loan.collateralName && (
              <div className="text-xs text-muted-foreground truncate">
                Aval: {loan.collateralName}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(loan.tempId)
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
