'use client'

import { MoreHorizontal, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '../types'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '../types'

interface AccountTableProps {
  accounts: Account[]
  onEdit: (account: Account) => void
}

export function AccountTable({ accounts, onEdit }: AccountTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No hay cuentas registradas
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead>Rutas Asignadas</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id}>
            <TableCell className="font-medium">{account.name}</TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={ACCOUNT_TYPE_COLORS[account.type]}
              >
                {ACCOUNT_TYPE_LABELS[account.type] || account.type}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(parseFloat(account.accountBalance || account.amount || '0'))}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {account.routes.length > 0 ? (
                  account.routes.map((route) => (
                    <Badge key={route.id} variant="outline" className="text-xs">
                      {route.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Sin rutas</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(account)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
