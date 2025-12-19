'use client'

import {
  User,
  Phone,
  MapPin,
  Receipt,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ClientInfo, ClientSummary } from '../types'
import { formatCurrency } from '../utils'
import { roleStyles, type ClientRole } from '../constants'

interface ClientProfileProps {
  client: ClientInfo
  summary: ClientSummary
}

export function ClientProfile({ client, summary }: ClientProfileProps) {
  const roles: string[] = []
  if (summary.hasBeenClient) roles.push('Cliente')
  if (summary.hasBeenCollateral) roles.push('Aval')

  const primaryPhone = client.phones?.[0]

  return (
    <Card className="mb-4">
      <CardContent className="p-3 space-y-3">
        {/* Client Header */}
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 bg-primary/10 flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{client.fullName}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="font-mono">{client.clientCode}</span>
              <span className="flex items-center gap-0.5">
                <Phone className="h-3 w-3" />
                {primaryPhone || 'Sin tel.'}
              </span>
            </div>
            <div className="flex gap-1 mt-1">
              {roles.map((role) => (
                <span
                  key={role}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded font-medium',
                    roleStyles[role as ClientRole]
                  )}
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Leader Info */}
        {client.leader && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/60 border min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Líder:</span>
                <span className="font-medium truncate">{client.leader.name}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground ml-auto flex-shrink-0">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{client.leader.route}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid - 2x2 on mobile */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Receipt className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold">
                {summary.totalLoansAsClient}
                {summary.activeLoansAsClient > 0 && (
                  <span className="text-success ml-1">({summary.activeLoansAsClient} activo)</span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">préstamos</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <ShieldCheck className="h-4 w-4 text-info flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold">{summary.totalLoansAsCollateral}</div>
              <div className="text-[10px] text-muted-foreground">aval</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <TrendingUp className="h-4 w-4 text-success flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-success truncate">
                {formatCurrency(summary.totalAmountPaidAsClient)}
              </div>
              <div className="text-[10px] text-muted-foreground">pagado</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <TrendingDown className="h-4 w-4 text-destructive flex-shrink-0" />
            <div className="min-w-0">
              <div className={cn(
                'text-xs font-bold truncate',
                summary.currentPendingDebtAsClient > 0 ? 'text-destructive' : 'text-success'
              )}>
                {formatCurrency(summary.currentPendingDebtAsClient)}
              </div>
              <div className="text-[10px] text-muted-foreground">debe</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
