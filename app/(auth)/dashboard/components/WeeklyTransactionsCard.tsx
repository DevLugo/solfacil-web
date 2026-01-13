'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, PlusCircle, RefreshCw } from 'lucide-react'

interface WeeklyTransactionsCardProps {
  nuevos: number
  renovados: number
}

export function WeeklyTransactionsCard({
  nuevos,
  renovados,
}: WeeklyTransactionsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 shrink-0" />
          <span className="truncate">Tramites de la Semana</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <PlusCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">Nuevos</p>
                <p className="text-xs text-muted-foreground">Prestamos nuevos</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 self-start sm:self-auto whitespace-nowrap">
              {nuevos} prestamos
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">Renovaciones</p>
                <p className="text-xs text-muted-foreground">Con prestamo anterior</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 self-start sm:self-auto whitespace-nowrap">
              {renovados} prestamos
            </Badge>
          </div>

          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total tramites</span>
              <Badge variant="default" className="text-base px-3 py-1">
                {nuevos + renovados}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
