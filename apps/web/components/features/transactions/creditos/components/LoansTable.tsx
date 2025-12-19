'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Search, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { LoanTableRow } from './LoanTableRow'
import type { Loan } from '../types'

interface LoansTableProps {
  loans: Loan[]
  selectedDate: Date
  isAdmin: boolean
  onEdit: (loan: Loan) => void
  onCancel: (loan: Loan) => void
  onCreateNew: () => void
}

export function LoansTable({
  loans,
  selectedDate,
  isAdmin,
  onEdit,
  onCancel,
  onCreateNew,
}: LoansTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter loans by search
  const filteredLoans = searchTerm
    ? loans.filter(
        (loan) =>
          loan.borrower.personalData?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.collaterals.some((c) => c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : loans

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Créditos Otorgados</CardTitle>
            <CardDescription>
              {loans.length} créditos • {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </CardDescription>
          </div>
          <Button className="gap-2" onClick={onCreateNew}>
            <Plus className="h-4 w-4" />
            Nuevo Crédito
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay créditos registrados para esta fecha
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Aval</TableHead>
                <TableHead className="text-right">Montos</TableHead>
                <TableHead className="text-right">Pago Semanal</TableHead>
                <TableHead className="text-right">Deuda Total</TableHead>
                {isAdmin && (
                  <>
                    <TableHead className="text-right bg-muted/50">Capital</TableHead>
                    <TableHead className="text-right bg-muted/50">Ganancia</TableHead>
                  </>
                )}
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.map((loan) => (
                <LoanTableRow
                  key={loan.id}
                  loan={loan}
                  isAdmin={isAdmin}
                  onEdit={onEdit}
                  onCancel={onCancel}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
