'use client'

import { ArrowRight, Wallet, TrendingUp } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_TYPE_ICONS } from '../constants'
import type { Transfer, AccountType } from '../types'

interface TransferRowProps {
  transfer: Transfer
}

export function TransferRow({ transfer }: TransferRowProps) {
  const SourceIcon = transfer.sourceAccount
    ? ACCOUNT_TYPE_ICONS[transfer.sourceAccount.type as AccountType] || Wallet
    : TrendingUp

  const DestIcon = transfer.destinationAccount
    ? ACCOUNT_TYPE_ICONS[transfer.destinationAccount.type as AccountType] || Wallet
    : Wallet

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <SourceIcon className="h-4 w-4 text-muted-foreground" />
          <span>{transfer.sourceAccount?.name || 'Inversion Externa'}</span>
        </div>
      </TableCell>
      <TableCell>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <DestIcon className="h-4 w-4 text-muted-foreground" />
          <span>{transfer.destinationAccount?.name || '-'}</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(parseFloat(transfer.amount))}
      </TableCell>
    </TableRow>
  )
}
