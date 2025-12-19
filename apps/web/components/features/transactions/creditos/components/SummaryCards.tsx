'use client'

import { CreditCard, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface Totals {
  count: number
  loaned: number
  profit: number
  commission: number
  renewals: number
  newLoans: number
}

interface SummaryCardsProps {
  totals: Totals
}

export function SummaryCards({ totals }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Créditos del Día</p>
              <p className="text-2xl font-bold">{totals.count}</p>
              <p className="text-xs text-muted-foreground">
                {totals.newLoans} nuevos, {totals.renewals} renovaciones
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10">
              <DollarSign className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Prestado</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.loaned)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ganancia Esperada</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(totals.profit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Comisión</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.commission)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
