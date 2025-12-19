'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertTriangle,
  Info,
  CheckCircle,
  Lightbulb,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExpenseInsight } from '../types'
import { formatCurrency } from '../utils'

interface ExpenseInsightsProps {
  insights: ExpenseInsight[]
  loading?: boolean
}

const insightConfig = {
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 [&>svg]:text-amber-500',
    titleClass: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    icon: Info,
    className: 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/30 [&>svg]:text-blue-500',
    titleClass: 'text-blue-700 dark:text-blue-400',
  },
  success: {
    icon: CheckCircle,
    className: 'border-green-500/50 bg-green-50 dark:bg-green-950/30 [&>svg]:text-green-500',
    titleClass: 'text-green-700 dark:text-green-400',
  },
}

export function ExpenseInsights({ insights, loading }: ExpenseInsightsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights y Recomendaciones
          </CardTitle>
          <CardDescription>Analisis automatico de oportunidades de ahorro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights y Recomendaciones
        </CardTitle>
        <CardDescription>
          {insights.length > 0
            ? `${insights.length} observaciones basadas en el analisis de gastos`
            : 'Sin observaciones especiales este mes'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Todo en orden</p>
            <p className="text-sm text-muted-foreground mt-1">
              No se detectaron patrones de gasto inusuales este mes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const config = insightConfig[insight.type]
              const Icon = config.icon

              return (
                <Alert key={index} className={config.className}>
                  <Icon className="h-4 w-4" />
                  <AlertTitle className={config.titleClass}>
                    {insight.title}
                  </AlertTitle>
                  <AlertDescription className="mt-1">
                    {insight.description}
                    {insight.amount && (
                      <span className="block mt-1 font-medium">
                        Monto: {formatCurrency(insight.amount)}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )
            })}
          </div>
        )}

        {/* Quick Tips Section */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Tips para optimizar gastos
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Revisa los gastos de gasolina y considera tarjetas con descuentos en estaciones.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Establece limites diarios de viaticos por empleado y ruta.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Agrupa compras de papeleria y materiales para obtener mejores precios.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Programa mantenimientos preventivos para reducir reparaciones mayores.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
