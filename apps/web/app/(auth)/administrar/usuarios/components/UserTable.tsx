'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  User as UserIcon,
  MessageCircle,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '../types'
import { ROLE_LABELS, ROLE_COLORS, EMPLOYEE_TYPE_LABELS } from '../types'

interface UserTableProps {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuario</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Empleado</TableHead>
          <TableHead>Telegram</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{user.name || 'Sin nombre'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={cn(ROLE_COLORS[user.role])}>
                {ROLE_LABELS[user.role] || user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {user.employee ? (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">
                      {user.employee.personalDataRelation?.fullName || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {EMPLOYEE_TYPE_LABELS[user.employee.type] || user.employee.type}
                      {user.employee.routes?.[0] && ` - ${user.employee.routes[0].name}`}
                    </p>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {user.telegramUser ? (
                <div className="flex items-center gap-2">
                  <MessageCircle
                    className={cn(
                      'h-4 w-4',
                      user.telegramUser.isActive
                        ? 'text-green-500'
                        : 'text-muted-foreground'
                    )}
                  />
                  <span className="text-sm">{user.telegramUser.chatId}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(user.createdAt), {
                addSuffix: true,
                locale: es,
              })}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(user)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(user)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
