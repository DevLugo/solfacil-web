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
  const accountBalance = parseFloat(account?.amount || '0')

  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{account?.name || 'Sin cuenta'}</p>
            <p className="text-xs text-muted-foreground">Cuenta origen</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{formatCurrency(accountBalance)}</p>
          <p className="text-xs text-muted-foreground">Saldo disponible</p>
        </div>
      </div>
      {hasInsufficientFunds && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Fondos insuficientes. Se necesitan {formatCurrency(totalAmount)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
