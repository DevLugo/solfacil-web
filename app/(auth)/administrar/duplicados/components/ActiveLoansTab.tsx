'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, CheckCircle2, FileWarning } from 'lucide-react'
import {
  FIND_DUPLICATE_ACTIVE_LOANS,
  DuplicateActiveLoansReport,
  DuplicateActiveLoanGroup,
} from '../queries'
import { FixDuplicateLoanDialog } from './FixDuplicateLoanDialog'
import { FixAllDuplicateLoansDialog } from './FixAllDuplicateLoansDialog'

export function ActiveLoansTab() {
  const { data, loading, error, refetch } = useQuery<{
    findDuplicateActiveLoans: DuplicateActiveLoansReport
  }>(FIND_DUPLICATE_ACTIVE_LOANS, {
    fetchPolicy: 'network-only',
  })

  const [selectedGroup, setSelectedGroup] = useState<DuplicateActiveLoanGroup | null>(null)
  const [fixAllOpen, setFixAllOpen] = useState(false)

  const report = data?.findDuplicateActiveLoans

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-600">
          Error cargando préstamos duplicados: {error.message}
        </CardContent>
      </Card>
    )
  }

  if (!report || report.totalBorrowers === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <p>No se encontraron préstamos activos duplicados.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPI card + batch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FileWarning className="h-4 w-4 text-amber-600" />
              <span>Borrowers afectados</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{report.totalBorrowers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span>Préstamos a marcar FINISHED</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {report.groups.reduce((acc, g) => acc + Math.max(0, g.loans.length - 1), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Corregir todos</p>
              <p className="text-sm font-medium">
                Aplica a los {report.totalBorrowers} borrowers.
              </p>
            </div>
            <Button onClick={() => setFixAllOpen(true)}>Aplicar todos</Button>
          </CardContent>
        </Card>
      </div>

      {/* Groups table */}
      <Card>
        <CardHeader>
          <CardTitle>Borrowers con préstamos duplicados ({report.groups.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            El préstamo más antiguo se marcará como FINISHED y enlazado como previousLoan del más
            reciente.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Préstamos</TableHead>
                <TableHead>Antiguo → Nuevo</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.groups.map((g) => (
                <TableRow key={g.borrowerId}>
                  <TableCell className="font-medium">{g.clientName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.clientCode || '—'}
                  </TableCell>
                  <TableCell>{g.loans.length}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {g.oldLoanId.slice(0, 8)}… → {g.newLoanId.slice(0, 8)}…
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedGroup(g)}
                    >
                      Corregir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedGroup && (
        <FixDuplicateLoanDialog
          group={selectedGroup}
          open={!!selectedGroup}
          onOpenChange={(open) => !open && setSelectedGroup(null)}
          onSuccess={() => {
            setSelectedGroup(null)
            refetch()
          }}
        />
      )}

      <FixAllDuplicateLoansDialog
        open={fixAllOpen}
        onOpenChange={setFixAllOpen}
        count={report.totalBorrowers}
        onSuccess={() => {
          setFixAllOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
