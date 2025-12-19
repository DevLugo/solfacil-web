'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  History,
  RefreshCw,
  RotateCcw,
  FileImage,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  GET_DOCUMENT_NOTIFICATION_LOGS,
  GET_ROUTES,
  RETRY_FAILED_NOTIFICATION,
} from '../queries'
import {
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_STATUS_COLORS,
  ISSUE_TYPE_LABELS,
} from '../types'
import type { DocumentNotificationLog, Route } from '../types'

function StatusIcon({ status }: { status: string }) {
  const icons = {
    PENDING: Clock,
    SENT: CheckCircle2,
    FAILED: XCircle,
    RETRY: RotateCcw,
  }
  const Icon = icons[status as keyof typeof icons] || AlertTriangle
  return <Icon className="h-4 w-4" />
}

export function NotificationHistoryTab() {
  const { toast } = useToast()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRoute, setFilterRoute] = useState<string>('all')

  // Queries
  const { data: routesData } = useQuery<{ routes: Route[] }>(GET_ROUTES)
  const {
    data: logsData,
    loading,
    refetch,
  } = useQuery<{ documentNotificationLogs: DocumentNotificationLog[] }>(
    GET_DOCUMENT_NOTIFICATION_LOGS,
    {
      variables: {
        status: filterStatus === 'all' ? undefined : filterStatus,
        routeId: filterRoute === 'all' ? undefined : filterRoute,
        limit: 100,
      },
    }
  )

  // Mutations
  const [retryNotification, { loading: retrying }] = useMutation(RETRY_FAILED_NOTIFICATION)

  const routes = routesData?.routes || []
  const logs = logsData?.documentNotificationLogs || []

  const handleRetry = async (notificationId: string) => {
    try {
      const { data } = await retryNotification({ variables: { notificationId } })
      if (data?.retryFailedNotification?.success) {
        toast({ title: 'Notificacion reenviada' })
      } else {
        toast({
          title: 'Error al reenviar',
          description: data?.retryFailedNotification?.message,
          variant: 'destructive',
        })
      }
      refetch()
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    }
  }

  // Summary stats
  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === 'SENT').length,
    failed: logs.filter((l) => l.status === 'FAILED').length,
    pending: logs.filter((l) => l.status === 'PENDING').length,
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviados</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fallidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Historial de Notificaciones</CardTitle>
              <CardDescription>
                Registro de notificaciones enviadas por documentos
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="SENT">Enviados</SelectItem>
                  <SelectItem value="FAILED">Fallidos</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRoute} onValueChange={setFilterRoute}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Ruta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay notificaciones en el historial</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Reintentos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                        <span>{log.documentType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{log.personName}</TableCell>
                    <TableCell>{log.routeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ISSUE_TYPE_LABELS[log.issueType] || log.issueType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('gap-1', NOTIFICATION_STATUS_COLORS[log.status])}
                      >
                        <StatusIcon status={log.status} />
                        {NOTIFICATION_STATUS_LABELS[log.status] || log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>
                      {log.retryCount > 0 && (
                        <span className="text-muted-foreground">{log.retryCount}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.status === 'FAILED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(log.id)}
                          disabled={retrying}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reintentar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
