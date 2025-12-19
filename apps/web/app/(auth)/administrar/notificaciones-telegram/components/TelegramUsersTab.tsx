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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Search,
  Users,
  UserCheck,
  UserX,
  Link2,
  Unlink,
  Bell,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  GET_TELEGRAM_USERS,
  GET_TELEGRAM_USER_STATS,
  GET_PLATFORM_USERS,
  ACTIVATE_TELEGRAM_USER,
  DEACTIVATE_TELEGRAM_USER,
  UPDATE_TELEGRAM_USER,
  LINK_TELEGRAM_TO_USER,
  UNLINK_TELEGRAM_FROM_USER,
} from '../queries'
import type { TelegramUser, TelegramUserStats, PlatformUser } from '../types'

interface StatsCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        isActive
          ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
          : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
      )}
    >
      {isActive ? 'Activo' : 'Inactivo'}
    </Badge>
  )
}

export function TelegramUsersTab() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null)
  const [selectedPlatformUserId, setSelectedPlatformUserId] = useState<string>('')

  // Queries
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery<{
    telegramUserStats: TelegramUserStats
  }>(GET_TELEGRAM_USER_STATS)

  const {
    data: usersData,
    loading: usersLoading,
    refetch: refetchUsers,
  } = useQuery<{ telegramUsers: TelegramUser[] }>(GET_TELEGRAM_USERS, {
    variables: {
      filters: {
        isActive: filterActive,
        searchTerm: searchTerm || undefined,
      },
      limit: 100,
    },
  })

  const { data: platformUsersData } = useQuery<{ users: PlatformUser[] }>(GET_PLATFORM_USERS)

  // Mutations
  const [activateUser] = useMutation(ACTIVATE_TELEGRAM_USER)
  const [deactivateUser] = useMutation(DEACTIVATE_TELEGRAM_USER)
  const [updateUser] = useMutation(UPDATE_TELEGRAM_USER)
  const [linkToUser] = useMutation(LINK_TELEGRAM_TO_USER)
  const [unlinkFromUser] = useMutation(UNLINK_TELEGRAM_FROM_USER)

  const stats = statsData?.telegramUserStats
  const users = usersData?.telegramUsers || []
  const platformUsers = platformUsersData?.users || []

  // Filter platform users that don't have telegram linked
  const availablePlatformUsers = platformUsers.filter(
    (u) => !users.some((tu) => tu.platformUser?.id === u.id)
  )

  const handleRefresh = () => {
    refetchStats()
    refetchUsers()
  }

  const handleToggleActive = async (user: TelegramUser) => {
    try {
      if (user.isActive) {
        await deactivateUser({ variables: { id: user.id } })
        toast({ title: 'Usuario desactivado', description: `${user.name} ha sido desactivado` })
      } else {
        await activateUser({ variables: { id: user.id } })
        toast({ title: 'Usuario activado', description: `${user.name} ha sido activado` })
      }
      refetchUsers()
      refetchStats()
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' })
    }
  }

  const handleToggleRecipient = async (user: TelegramUser) => {
    try {
      await updateUser({
        variables: {
          id: user.id,
          input: { isInRecipientsList: !user.isInRecipientsList },
        },
      })
      toast({
        title: user.isInRecipientsList ? 'Removido de lista' : 'Agregado a lista',
        description: `${user.name} ${user.isInRecipientsList ? 'ya no' : 'ahora'} recibira reportes`,
      })
      refetchUsers()
      refetchStats()
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' })
    }
  }

  const handleOpenLinkDialog = (user: TelegramUser) => {
    setSelectedUser(user)
    setSelectedPlatformUserId('')
    setLinkDialogOpen(true)
  }

  const handleLinkUser = async () => {
    if (!selectedUser || !selectedPlatformUserId) return

    try {
      await linkToUser({
        variables: {
          input: {
            telegramUserId: selectedUser.id,
            platformUserId: selectedPlatformUserId,
          },
        },
      })
      toast({
        title: 'Usuario vinculado',
        description: `${selectedUser.name} vinculado exitosamente`,
      })
      setLinkDialogOpen(false)
      refetchUsers()
      refetchStats()
    } catch {
      toast({ title: 'Error', description: 'No se pudo vincular el usuario', variant: 'destructive' })
    }
  }

  const handleUnlinkUser = async (user: TelegramUser) => {
    try {
      await unlinkFromUser({ variables: { telegramUserId: user.id } })
      toast({ title: 'Usuario desvinculado', description: `${user.name} desvinculado` })
      refetchUsers()
      refetchStats()
    } catch {
      toast({ title: 'Error', description: 'No se pudo desvincular', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Total Usuarios"
              value={stats?.totalUsers || 0}
              icon={Users}
            />
            <StatsCard
              title="Activos"
              value={stats?.activeUsers || 0}
              icon={UserCheck}
              description={`${stats?.inactiveUsers || 0} inactivos`}
            />
            <StatsCard
              title="Vinculados"
              value={stats?.linkedToPlataform || 0}
              icon={Link2}
              description="A usuarios de plataforma"
            />
            <StatsCard
              title="Reciben Reportes"
              value={stats?.inRecipientsList || 0}
              icon={Bell}
            />
          </>
        )}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Usuarios de Telegram</CardTitle>
              <CardDescription>
                Usuarios registrados en el bot de Telegram
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Select
                value={filterActive === undefined ? 'all' : filterActive ? 'active' : 'inactive'}
                onValueChange={(v) =>
                  setFilterActive(v === 'all' ? undefined : v === 'active')
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleRefresh}>
                <RefreshCw className={cn('h-4 w-4', usersLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay usuarios de Telegram registrados</p>
              <p className="text-sm mt-1">
                Los usuarios deben iniciar el bot para registrarse
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vinculado a</TableHead>
                  <TableHead>Reportes</TableHead>
                  <TableHead>Ultima Actividad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        {user.username && (
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {user.chatId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge isActive={user.isActive} />
                    </TableCell>
                    <TableCell>
                      {user.platformUser ? (
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{user.platformUser.email}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleUnlinkUser(user)}
                          >
                            <Unlink className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenLinkDialog(user)}
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          Vincular
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.isInRecipientsList}
                          onCheckedChange={() => handleToggleRecipient(user)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {user.reportsReceived} recibidos
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(user.lastActivity), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => handleToggleActive(user)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Usuario de Telegram</DialogTitle>
            <DialogDescription>
              Vincular {selectedUser?.name} a un usuario de la plataforma
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedPlatformUserId} onValueChange={setSelectedPlatformUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario de plataforma" />
              </SelectTrigger>
              <SelectContent>
                {availablePlatformUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.employee?.personalData?.fullName || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLinkUser} disabled={!selectedPlatformUserId}>
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
