'use client'

import { Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_TYPE_ICONS } from '../constants'
import type { Account, AccountType } from '../types'

interface AccountBalanceCardProps {
  account: Account
}

export function AccountBalanceCard({ account }: AccountBalanceCardProps) {
  const Icon = ACCOUNT_TYPE_ICONS[account.type as AccountType] || Wallet
  const balance = parseFloat(account.amount || '0')

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground truncate">{account.name}</p>
            <p className="text-xl font-bold">{formatCurrency(balance)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
