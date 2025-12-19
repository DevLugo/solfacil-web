'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  Clock,
  Plus,
  MoreVertical,
  Play,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  GET_REPORT_CONFIGS,
  GET_TELEGRAM_USERS,
  GET_ROUTES,
  CREATE_REPORT_CONFIG,
  UPDATE_REPORT_CONFIG,
  DELETE_REPORT_CONFIG,
  TOGGLE_REPORT_CONFIG,
  EXECUTE_REPORT_MANUALLY,
} from '../queries'
import { REPORT_TYPE_LABELS, DAY_NAMES } from '../types'
import type { ReportConfig, TelegramUser, Route } from '../types'

function ScheduleBadge({ schedule }: { schedule?: { days: number[]; hour: string } }) {
  if (!schedule) return <span className="text-muted-foreground">Sin programar</span>

  const dayLabels = schedule.days.map((d) => DAY_NAMES[d]).join(', ')
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Calendar className="h-4 w-4" />
      <span>{dayLabels}</span>
      <Clock className="h-4 w-4 ml-2" />
      <span>{schedule.hour}:00</span>
    </div>
  )
}

function ExecutionStatusBadge({ status }: { status: string }) {
  const config = {
    SUCCESS: { icon: CheckCircle2, color: 'text-green-500', label: 'Exitoso' },
    PARTIAL: { icon: AlertCircle, color: 'text-yellow-500', label: 'Parcial' },
    FAILED: { icon: XCircle, color: 'text-red-500', label: 'Fallido' },
  }[status] || { icon: AlertCircle, color: 'text-gray-500', label: status }

  const Icon = config.icon
  return (
    <div className={cn('flex items-center gap-1 text-sm', config.color)}>
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
    </div>
  )
}

interface ConfigFormData {
  name: string
  reportType: 'NOTIFICACION_TIEMPO_REAL' | 'CREDITOS_CON_ERRORES'
  days: number[]
  hour: string
  routeIds: string[]
  recipientIds: string[]
}

export function ReportConfigTab() {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ReportConfig | null>(null)
  const [formData, setFormData] = useState<ConfigFormData>({
    name: '',
    reportType: 'NOTIFICACION_TIEMPO_REAL',
    days: [],
    hour: '09',
    routeIds: [],
    recipientIds: [],
  })

  // Queries
  const { data: configsData, loading, refetch } = useQuery<{ reportConfigs: ReportConfig[] }>(
    GET_REPORT_CONFIGS
  )
  const { data: usersData } = useQuery<{ telegramUsers: TelegramUser[] }>(GET_TELEGRAM_USERS, {
    variables: { filters: { isActive: true } },
  })
  const { data: routesData } = useQuery<{ routes: Route[] }>(GET_ROUTES)

  // Mutations
  const [createConfig, { loading: creating }] = useMutation(CREATE_REPORT_CONFIG)
  const [updateConfig, { loading: updating }] = useMutation(UPDATE_REPORT_CONFIG)
  const [deleteConfig] = useMutation(DELETE_REPORT_CONFIG)
  const [toggleConfig] = useMutation(TOGGLE_REPORT_CONFIG)
  const [executeManually, { loading: executing }] = useMutation(EXECUTE_REPORT_MANUALLY)

  const configs = configsData?.reportConfigs || []
  const telegramUsers = usersData?.telegramUsers || []
  const routes = routesData?.routes || []

  const handleOpenCreate = () => {
    setEditingConfig(null)
    setFormData({
      name: '',
      reportType: 'NOTIFICACION_TIEMPO_REAL',
      days: [],
      hour: '09',
      routeIds: [],
      recipientIds: [],
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (config: ReportConfig) => {
    setEditingConfig(config)
    setFormData({
      name: config.name,
      reportType: config.reportType,
      days: config.schedule?.days || [],
      hour: config.schedule?.hour || '09',
      routeIds: config.routes.map((r) => r.id),
      recipientIds: config.telegramRecipients.map((r) => r.id),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingConfig) {
        await updateConfig({
          variables: {
            id: editingConfig.id,
            input: {
              name: formData.name,
              schedule: {
                days: formData.days,
                hour: formData.hour,
                timezone: 'America/Mexico_City',
              },
              routeIds: formData.routeIds,
              recipientIds: formData.recipientIds,
            },
          },
        })
        toast({ title: 'Configuracion actualizada' })
      } else {
        await createConfig({
          variables: {
            input: {
              name: formData.name,
              reportType: formData.reportType,
              schedule: {
                days: formData.days,
                hour: formData.hour,
                timezone: 'America/Mexico_City',
              },
              routeIds: formData.routeIds,
              recipientIds: formData.recipientIds,
            },
          },
        })
        toast({ title: 'Configuracion creada' })
      }
      setDialogOpen(false)
      refetch()
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta configuracion?')) return
    try {
      await deleteConfig({ variables: { id } })
      toast({ title: 'Configuracion eliminada' })
      refetch()
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await toggleConfig({ variables: { id } })
      refetch()
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    }
  }

  const handleExecute = async (id: string) => {
    try {
      const { data } = await executeManually({ variables: { reportConfigId: id } })
      const result = data?.executeReportManually
      if (result?.success) {
        toast({
          title: 'Reporte enviado',
          description: `Enviado a ${result.recipientsNotified} destinatarios`,
        })
      } else {
        toast({
          title: 'Envio con errores',
          description: result?.message,
          variant: 'destructive',
        })
      }
      refetch()
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    }
  }

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort(),
    }))
  }

  const toggleRoute = (routeId: string) => {
    setFormData((prev) => ({
      ...prev,
      routeIds: prev.routeIds.includes(routeId)
        ? prev.routeIds.filter((id) => id !== routeId)
        : [...prev.routeIds, routeId],
    }))
  }

  const toggleRecipient = (recipientId: string) => {
    setFormData((prev) => ({
      ...prev,
      recipientIds: prev.recipientIds.includes(recipientId)
        ? prev.recipientIds.filter((id) => id !== recipientId)
        : [...prev.recipientIds, recipientId],
    }))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configuraciones de Reporte</h3>
          <p className="text-sm text-muted-foreground">
            Configura reportes automaticos por Telegram
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Configuracion
        </Button>
      </div>

      {/* Config Cards */}
      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Sin configuraciones</p>
            <p className="text-muted-foreground text-sm">
              Crea tu primera configuracion de reporte
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{config.name}</h4>
                      <Badge variant={config.isActive ? 'default' : 'secondary'}>
                        {config.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {REPORT_TYPE_LABELS[config.reportType] || config.reportType}
                    </p>
                    <ScheduleBadge schedule={config.schedule} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">
                        {config.routes.length} rutas
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {config.telegramRecipients.length} destinatarios
                      </span>
                    </div>

                    {/* Last execution */}
                    {config.executionLogs && config.executionLogs[0] && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">Ultima ejecucion:</span>
                          <ExecutionStatusBadge status={config.executionLogs[0].status} />
                          <span className="text-muted-foreground">
                            {new Date(config.executionLogs[0].startTime).toLocaleString('es-MX')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={() => handleToggle(config.id)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleExecute(config.id)}
                      disabled={executing}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(config)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(config.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Configuracion' : 'Nueva Configuracion'}
            </DialogTitle>
            <DialogDescription>
              Configura los parametros del reporte automatico
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Reporte diario de errores"
              />
            </div>

            {/* Report Type */}
            {!editingConfig && (
              <div className="space-y-2">
                <Label>Tipo de Reporte</Label>
                <Select
                  value={formData.reportType}
                  onValueChange={(v) => setFormData((p) => ({ ...p, reportType: v as ConfigFormData['reportType'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTIFICACION_TIEMPO_REAL">
                      Notificacion en Tiempo Real
                    </SelectItem>
                    <SelectItem value="CREDITOS_CON_ERRORES">
                      Creditos con Errores (PDF)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Schedule */}
            <div className="space-y-2">
              <Label>Dias de la semana</Label>
              <div className="flex gap-2">
                {DAY_NAMES.map((day, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={formData.days.includes(index) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(index)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hora</Label>
              <Select
                value={formData.hour}
                onValueChange={(v) => setFormData((p) => ({ ...p, hour: v }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <SelectItem key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Routes */}
            <div className="space-y-2">
              <Label>Rutas</Label>
              <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto space-y-2">
                {routes.map((route) => (
                  <div key={route.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`route-${route.id}`}
                      checked={formData.routeIds.includes(route.id)}
                      onCheckedChange={() => toggleRoute(route.id)}
                    />
                    <Label htmlFor={`route-${route.id}`} className="font-normal">
                      {route.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <Label>Destinatarios Telegram</Label>
              <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto space-y-2">
                {telegramUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={formData.recipientIds.includes(user.id)}
                      onCheckedChange={() => toggleRecipient(user.id)}
                    />
                    <Label htmlFor={`user-${user.id}`} className="font-normal">
                      {user.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={creating || updating || !formData.name || formData.recipientIds.length === 0}
            >
              {creating || updating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingConfig ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
