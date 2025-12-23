'use client'

import { Wallet, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '../../types'

interface AccountBalanceInfoProps {
  account: Account | undefined
  totalAmount: number
  hasInsufficientFunds: boolean
}

export function AccountBalanceInfo({ account, totalAmount, hasInsufficientFunds }: AccountBalanceInfoProps) {
  // Use accountBalance (computed from transactions) if available, fallback to amount (stored)
  const accountBalance = parseFloat(account?.accountBalance || account?.amount || '0')

  return (
    <div className="pt-2 border-t">
      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">{account?.name || 'Sin cuenta'}</p>
            <p className="text-[10px] text-muted-foreground">Cuenta origen</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{formatCurrency(accountBalance)}</p>
          <p className="text-[10px] text-muted-foreground">Saldo disponible</p>
        </div>
      </div>
      {hasInsufficientFunds && (
        <Alert variant="destructive" className="mt-1.5 py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            Fondos insuficientes. Se necesitan {formatCurrency(totalAmount)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
