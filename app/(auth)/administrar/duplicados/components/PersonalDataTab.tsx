'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, CheckCircle2, Sparkles, Users } from 'lucide-react'
import {
  FIND_DUPLICATE_PERSONAL_DATA,
  PersonalDataDuplicatesReport,
  PersonalDataDuplicateGroup,
} from '../queries'
import { MergeDialog } from './MergeDialog'
import { BatchApplyDialog } from './BatchApplyDialog'

export function PersonalDataTab() {
  const { data, loading, error, refetch } = useQuery<{
    findDuplicatePersonalData: PersonalDataDuplicatesReport
  }>(FIND_DUPLICATE_PERSONAL_DATA, {
    fetchPolicy: 'network-only',
  })

  const [selectedGroup, setSelectedGroup] = useState<PersonalDataDuplicateGroup | null>(null)
  const [batchOpen, setBatchOpen] = useState(false)

  const report = data?.findDuplicatePersonalData

  const highGroups = useMemo(
    () => report?.groups.filter((g) => g.confidence === 'HIGH') ?? [],
    [report]
  )
  const reviewGroups = useMemo(
    () => report?.groups.filter((g) => g.confidence === 'REVIEW') ?? [],
    [report]
  )
  const blockedGroups = useMemo(
    () => report?.groups.filter((g) => g.confidence === 'BLOCKED') ?? [],
    [report]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-600">
          Error cargando duplicados: {error.message}
        </CardContent>
      </Card>
    )
  }

  if (!report || report.totalGroups === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <p>No se encontraron PersonalData duplicados.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Total grupos"
          value={report.totalGroups}
        />
        <KpiCard
          icon={<Sparkles className="h-4 w-4 text-green-600" />}
          label="Alta confianza"
          value={report.highConfidenceCount}
          color="text-green-600"
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
          label="Revisar manual"
          value={report.reviewCount}
          color="text-amber-600"
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          label="Bloqueados"
          value={report.blockedCount}
          color="text-red-600"
        />
      </div>

      {/* Batch apply */}
      {highGroups.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">Aplicar fusiones automáticas</p>
              <p className="text-sm text-muted-foreground">
                {highGroups.length} grupo(s) de alta confianza listos para fusionar sin revisión.
              </p>
            </div>
            <Button onClick={() => setBatchOpen(true)}>
              Aplicar automáticos ({highGroups.length})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* REVIEW groups */}
      {reviewGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revisión manual ({reviewGroups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Localidad</TableHead>
                  <TableHead>Nombres</TableHead>
                  <TableHead>Conflictos</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewGroups.map((g) => (
                  <TableRow key={g.groupKey}>
                    <TableCell className="font-medium">{g.locationName || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {g.records.map((r) => (
                          <span key={r.id} className="text-sm">
                            {r.fullName}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {g.hasBorrowerConflict && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Borrower
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{g.records.length}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedGroup(g)}
                      >
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* BLOCKED groups */}
      {blockedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bloqueados ({blockedGroups.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Estos grupos tienen múltiples empleados y no pueden fusionarse automáticamente.
              Resolver manualmente en BD.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Localidad</TableHead>
                  <TableHead>Nombres</TableHead>
                  <TableHead>Razón</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedGroups.map((g) => (
                  <TableRow key={g.groupKey}>
                    <TableCell className="font-medium">{g.locationName || '—'}</TableCell>
                    <TableCell>
                      {g.records.map((r) => r.fullName).join(' / ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        Múltiples Employee
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {selectedGroup && (
        <MergeDialog
          group={selectedGroup}
          open={!!selectedGroup}
          onOpenChange={(open) => !open && setSelectedGroup(null)}
          onSuccess={() => {
            setSelectedGroup(null)
            refetch()
          }}
        />
      )}

      <BatchApplyDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        highGroups={highGroups}
        onSuccess={() => {
          refetch()
        }}
      />
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color?: string
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}
          <span>{label}</span>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${color || ''}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
