'use client'

import { DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '../types'

interface AccountBalanceCardProps {
  account: Account
}

export function AccountBalanceCard({ account }: AccountBalanceCardProps) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Saldo disponible ({account.name}):
            </span>
            <span className="font-medium">
              {formatCurrency(parseFloat(account.amount))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
