'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Users, Plus, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { GET_USERS, CREATE_USER, UPDATE_USER, DELETE_USER } from './queries'
import { UserFormDialog, UserTable } from './components'
import type { UserFormData } from './components'
import type { User } from './types'
import { ROLE_LABELS } from './types'

export default function AdministrarUsuariosPage() {
  const { toast } = useToast()
  const [filterRole, setFilterRole] = useState<string>('all')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  // Query users
  const { data, loading, refetch } = useQuery<{ users: User[] }>(GET_USERS, {
    variables: {
      role: filterRole === 'all' ? undefined : filterRole,
    },
  })

  // Mutations
  const [createUser, { loading: creating }] = useMutation(CREATE_USER)
  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER)
  const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER)

  const users = data?.users || []

  const handleCreateUser = () => {
    setSelectedUser(null)
    setFormDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setFormDialogOpen(true)
  }

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async (formData: UserFormData) => {
    try {
      if (selectedUser) {
        // Update existing user
        const input: Record<string, unknown> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        }

        // Only include password if provided
        if (formData.password) {
          input.password = formData.password
        }

        // Include optional fields
        if (formData.telegramChatId !== undefined) {
          input.telegramChatId = formData.telegramChatId || null
        }
        if (formData.employeeId !== undefined) {
          input.employeeId = formData.employeeId || null
        }

        await updateUser({
          variables: {
            id: selectedUser.id,
            input,
          },
        })

        toast({
          title: 'Usuario actualizado',
          description: 'Los cambios han sido guardados',
        })
      } else {
        // Create new user
        await createUser({
          variables: {
            input: {
              name: formData.name,
              email: formData.email,
              password: formData.password,
              role: formData.role,
              telegramChatId: formData.telegramChatId || undefined,
              employeeId: formData.employeeId || undefined,
              createEmployee: formData.createEmployee || undefined,
              employeeType: formData.createEmployee ? formData.employeeType : undefined,
              personalDataId: formData.createEmployee ? formData.personalDataId : undefined,
            },
          },
        })

        toast({
          title: 'Usuario creado',
          description: formData.createEmployee
            ? 'Usuario y empleado creados exitosamente'
            : 'El nuevo usuario ha sido creado exitosamente',
        })
      }

      setFormDialogOpen(false)
      setSelectedUser(null)
      refetch()
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar el usuario',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return

    try {
      await deleteUser({
        variables: { id: userToDelete.id },
      })

      toast({
        title: 'Usuario eliminado',
        description: 'El usuario ha sido eliminado',
      })

      setDeleteDialogOpen(false)
      setUserToDelete(null)
      refetch()
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el usuario',
        variant: 'destructive',
      })
    }
  }

  // Stats
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    withTelegram: users.filter((u) => u.telegramUser).length,
    withEmployee: users.filter((u) => u.employee).length,
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Administrar Usuarios
          </h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios del sistema, sus roles y notificaciones
          </p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total usuarios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
            <p className="text-sm text-muted-foreground">Administradores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.withTelegram}</div>
            <p className="text-sm text-muted-foreground">Con Telegram</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.withEmployee}</div>
            <p className="text-sm text-muted-foreground">Vinculados a empleado</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>
                Lista de usuarios registrados en el sistema
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
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
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay usuarios registrados</p>
              <Button variant="outline" className="mt-4" onClick={handleCreateUser}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primer usuario
              </Button>
            </div>
          ) : (
            <UserTable
              users={users}
              onEdit={handleEditUser}
              onDelete={handleDeleteClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        user={selectedUser}
        onSubmit={handleSubmit}
        loading={creating || updating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Esta seguro de eliminar al usuario{' '}
              <strong>{userToDelete?.name || userToDelete?.email}</strong>?
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
