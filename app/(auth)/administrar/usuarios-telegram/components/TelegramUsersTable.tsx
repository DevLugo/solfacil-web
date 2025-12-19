'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Search,
  Link2,
  Unlink,
  UserCheck,
  UserX,
  MoreHorizontal,
  Copy,
  Check,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from '@/hooks/use-toast'
import {
  GET_TELEGRAM_USERS,
  GET_PLATFORM_USERS,
  GET_TELEGRAM_USER_STATS,
  LINK_TELEGRAM_TO_USER,
  UNLINK_TELEGRAM_FROM_USER,
  ACTIVATE_TELEGRAM_USER,
  DEACTIVATE_TELEGRAM_USER,
} from '../../notificaciones-telegram/queries'
import type { TelegramUser, PlatformUser } from '../../notificaciones-telegram/types'

export function TelegramUsersTable() {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedTelegramUser, setSelectedTelegramUser] = useState<TelegramUser | null>(null)
  const [selectedPlatformUserId, setSelectedPlatformUserId] = useState<string>('')
  const { toast } = useToast()

  const { data, loading, refetch } = useQuery<{ telegramUsers: TelegramUser[] }>(
    GET_TELEGRAM_USERS,
    { variables: { limit: 100 } }
  )

  const { data: platformUsersData } = useQuery<{ users: PlatformUser[] }>(GET_PLATFORM_USERS)

  const [linkTelegram, { loading: linking }] = useMutation(LINK_TELEGRAM_TO_USER, {
    refetchQueries: [
      { query: GET_TELEGRAM_USERS, variables: { limit: 100 } },
      { query: GET_TELEGRAM_USER_STATS },
    ],
    onCompleted: () => {
      toast({ title: 'Usuario vinculado correctamente' })
      setLinkDialogOpen(false)
      setSelectedTelegramUser(null)
      setSelectedPlatformUserId('')
    },
    onError: (error) => {
      toast({ title: 'Error al vincular', description: error.message, variant: 'destructive' })
    },
  })

  const [unlinkTelegram] = useMutation(UNLINK_TELEGRAM_FROM_USER, {
    refetchQueries: [
      { query: GET_TELEGRAM_USERS, variables: { limit: 100 } },
      { query: GET_TELEGRAM_USER_STATS },
    ],
    onCompleted: () => {
      toast({ title: 'Usuario desvinculado correctamente' })
    },
    onError: (error) => {
      toast({ title: 'Error al desvincular', description: error.message, variant: 'destructive' })
    },
  })

  const [activateTelegram] = useMutation(ACTIVATE_TELEGRAM_USER, {
    refetchQueries: [
      { query: GET_TELEGRAM_USERS, variables: { limit: 100 } },
      { query: GET_TELEGRAM_USER_STATS },
    ],
    onCompleted: () => toast({ title: 'Usuario activado' }),
    onError: (error) =>
      toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  })

  const [deactivateTelegram] = useMutation(DEACTIVATE_TELEGRAM_USER, {
    refetchQueries: [
      { query: GET_TELEGRAM_USERS, variables: { limit: 100 } },
      { query: GET_TELEGRAM_USER_STATS },
    ],
    onCompleted: () => toast({ title: 'Usuario desactivado' }),
    onError: (error) =>
      toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  })

  const telegramUsers = data?.telegramUsers ?? []
  const platformUsers = platformUsersData?.users ?? []

  // Filtrar usuarios ya vinculados
  const linkedUserIds = new Set(
    telegramUsers.filter((u) => u.platformUser).map((u) => u.platformUser!.id)
  )
  const availablePlatformUsers = platformUsers.filter((u) => !linkedUserIds.has(u.id))

  const filteredUsers = telegramUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.chatId.includes(searchQuery) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.platformUser?.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleLink = (user: TelegramUser) => {
    setSelectedTelegramUser(user)
    setSelectedPlatformUserId('')
    setLinkDialogOpen(true)
  }

  const handleUnlink = (telegramUserId: string) => {
    unlinkTelegram({ variables: { telegramUserId } })
  }

  const handleConfirmLink = () => {
    if (!selectedTelegramUser || !selectedPlatformUserId) return
    linkTelegram({
      variables: {
        input: {
          telegramUserId: selectedTelegramUser.id,
          platformUserId: selectedPlatformUserId,
        },
      },
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Usuarios Registrados</CardTitle>
              <CardDescription>
                Usuarios que se registraron desde el chatbot de Telegram
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, chat ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario Telegram</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Usuario Plataforma</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ultima Actividad</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
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
                        <button
                          onClick={() => copyToClipboard(user.chatId, user.id)}
                          className="flex items-center gap-1 font-mono text-sm hover:text-primary transition-colors"
                          title="Copiar Chat ID"
                        >
                          {user.chatId}
                          {copiedId === user.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        {user.platformUser ? (
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium">{user.platformUser.email}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {user.platformUser.role.toLowerCase()}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Sin vincular</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {user.isInRecipientsList && (
                            <Badge variant="outline" className="text-xs">
                              Recibe reportes
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(user.lastActivity), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.platformUser ? (
                              <DropdownMenuItem onClick={() => handleUnlink(user.id)}>
                                <Unlink className="mr-2 h-4 w-4" />
                                Desvincular
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleLink(user)}>
                                <Link2 className="mr-2 h-4 w-4" />
                                Vincular a usuario
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {user.isActive ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  deactivateTelegram({ variables: { id: user.id } })
                                }
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Desactivar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => activateTelegram({ variables: { id: user.id } })}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para vincular usuario */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Usuario</DialogTitle>
            <DialogDescription>
              Vincula el usuario de Telegram &quot;{selectedTelegramUser?.name}&quot; con un usuario
              de la plataforma
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuario de la Plataforma</label>
              <Select value={selectedPlatformUserId} onValueChange={setSelectedPlatformUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlatformUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{user.employee?.personalData?.fullName || user.email}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmLink} disabled={!selectedPlatformUserId || linking}>
                {linking ? 'Vinculando...' : 'Vincular'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
