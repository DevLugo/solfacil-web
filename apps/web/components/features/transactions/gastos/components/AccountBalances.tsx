'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS, DEFAULT_VISIBLE_ACCOUNT_TYPES } from '../constants'
import type { Account, AccountType } from '../types'

interface AccountBalancesProps {
  accounts: Account[]
  showExtraTypes?: boolean
}

export function AccountBalances({ accounts, showExtraTypes = false }: AccountBalancesProps) {
  const filteredAccounts = showExtraTypes
    ? accounts
    : accounts.filter((acc) =>
        DEFAULT_VISIBLE_ACCOUNT_TYPES.includes(acc.type as AccountType)
      )

  if (filteredAccounts.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saldos de Cuentas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground truncate">
                  {account.name}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                </span>
              </div>
              <span className="font-medium">
                {formatCurrency(parseFloat(account.amount))}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
