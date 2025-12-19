'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRight, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { TransferRow } from './TransferRow'
import { calculateTransfersTotal } from '../utils'
import type { Transfer } from '../types'

interface TransferHistoryTableProps {
  transfers: Transfer[]
  loading: boolean
  selectedDate: Date
}

export function TransferHistoryTable({
  transfers,
  loading,
  selectedDate,
}: TransferHistoryTableProps) {
  const totalTransfers = calculateTransfersTotal(transfers)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transferencias del Dia</CardTitle>
        <CardDescription>
          {transfers.length} transferencias • {format(selectedDate, "d 'de' MMMM", { locale: es })}
          {transfers.length > 0 && ` • Total: ${formatCurrency(totalTransfers)}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ArrowRight className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay transferencias registradas para esta fecha
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origen</TableHead>
                <TableHead></TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TransferRow key={transfer.id} transfer={transfer} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
