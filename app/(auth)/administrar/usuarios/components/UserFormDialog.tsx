'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import type { User, Employee } from '../types'
import { ROLE_LABELS, EMPLOYEE_TYPE_LABELS } from '../types'
import { GET_EMPLOYEES_FOR_LINKING } from '../queries'
import { EmployeeSelector } from './EmployeeSelector'
import { PersonalDataSelector } from './PersonalDataSelector'

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onSubmit: (data: UserFormData) => Promise<void>
  loading: boolean
}

export interface UserFormData {
  name: string
  email: string
  password?: string
  role: string
  telegramChatId?: string
  employeeId?: string
  // Para crear nuevo empleado
  createEmployee?: boolean
  employeeType?: 'ROUTE_LEAD' | 'LEAD' | 'ROUTE_ASSISTENT'
  // Para vincular PersonalData existente al crear empleado
  personalDataId?: string
}

const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'ROUTE_LEAD', label: 'Lider de Ruta' },
  { value: 'LEAD', label: 'Vendedor' },
  { value: 'ROUTE_ASSISTENT', label: 'Asistente' },
] as const

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  loading,
}: UserFormDialogProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'NORMAL',
    telegramChatId: '',
    employeeId: '',
    createEmployee: false,
    employeeType: 'LEAD',
    personalDataId: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [employeeMode, setEmployeeMode] = useState<'none' | 'link' | 'create'>('none')
  const [selectedPersonalDataName, setSelectedPersonalDataName] = useState('')

  const { data: employeesData, loading: loadingEmployees, error: employeesError } = useQuery<{
    employees: Employee[]
  }>(GET_EMPLOYEES_FOR_LINKING, { skip: !open })

  // Filter employees without a user (or include the current user's employee)
  const availableEmployees =
    employeesData?.employees?.filter((emp) => !emp.user || emp.user?.id === user?.id) || []

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('🔍 Employees Query Debug:', {
        loading: loadingEmployees,
        total: employeesData?.employees?.length || 0,
        available: availableEmployees.length,
        hasError: !!employeesError,
        errorMessage: employeesError?.message,
        errorDetails: employeesError,
        rawData: employeesData,
        currentUserId: user?.id,
      })

      // Log each employee
      if (employeesData?.employees) {
        console.log('📋 All employees:', employeesData.employees.map(emp => ({
          id: emp.id,
          name: emp.personalData?.fullName,
          type: emp.type,
          hasUser: !!emp.user,
          userId: emp.user?.id,
        })))
      }

      // Log filtered employees
      console.log('✅ Available employees:', availableEmployees.map(emp => ({
        id: emp.id,
        name: emp.personalData?.fullName,
        type: emp.type,
      })))
    }
  }, [open, loadingEmployees, employeesData, availableEmployees, employeesError, user])

  useEffect(() => {
    if (user) {
      const hasEmployee = !!user.employee?.id
      setFormData({
        name: user.name || '',
        email: user.email,
        password: '',
        role: user.role,
        telegramChatId: user.telegramUser?.chatId || '',
        employeeId: user.employee?.id || '',
        createEmployee: false,
        employeeType: 'LEAD',
      })
      setEmployeeMode(hasEmployee ? 'link' : 'none')
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'NORMAL',
        telegramChatId: '',
        employeeId: '',
        createEmployee: false,
        employeeType: 'LEAD',
        personalDataId: '',
      })
      setEmployeeMode('none')
      setSelectedPersonalDataName('')
    }
  }, [user, open])

  // Update formData when employeeMode changes
  useEffect(() => {
    if (employeeMode === 'none') {
      setFormData((prev) => ({ ...prev, employeeId: '', createEmployee: false }))
    } else if (employeeMode === 'create') {
      setFormData((prev) => ({ ...prev, employeeId: '', createEmployee: true }))
    } else if (employeeMode === 'link') {
      setFormData((prev) => ({ ...prev, createEmployee: false }))
    }
  }, [employeeMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const isEditing = !!user

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del usuario'
              : 'Ingresa los datos para crear un nuevo usuario'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del usuario"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEditing ? 'Nueva Contrasena (dejar vacio para no cambiar)' : 'Contrasena'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isEditing ? '********' : 'Contrasena'}
                required={!isEditing}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegramChatId">Chat ID de Telegram (opcional)</Label>
            <Input
              id="telegramChatId"
              value={formData.telegramChatId}
              onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
              placeholder="123456789"
            />
          </div>

          {/* Empleado - Opciones unificadas */}
          <div className="space-y-3 pt-2 border-t">
            <Label>Empleado</Label>
            <RadioGroup
              value={employeeMode}
              onValueChange={(v: 'none' | 'link' | 'create') => setEmployeeMode(v)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="emp-none" />
                <Label htmlFor="emp-none" className="font-normal cursor-pointer">
                  Sin vincular a empleado
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="link"
                  id="emp-link"
                  disabled={availableEmployees.length === 0}
                />
                <Label
                  htmlFor="emp-link"
                  className={`font-normal cursor-pointer ${
                    availableEmployees.length === 0 ? 'text-muted-foreground' : ''
                  }`}
                >
                  Vincular a empleado existente
                  {loadingEmployees && (
                    <span className="text-xs text-muted-foreground ml-2">(Cargando...)</span>
                  )}
                  {!loadingEmployees && employeesError && (
                    <span className="text-xs text-red-500 ml-2">
                      (Error: {employeesError.message})
                    </span>
                  )}
                  {!loadingEmployees && !employeesError && availableEmployees.length === 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (No hay empleados disponibles - Total: {employeesData?.employees?.length || 0})
                    </span>
                  )}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="create" id="emp-create" />
                <Label htmlFor="emp-create" className="font-normal cursor-pointer">
                  Crear nuevo empleado
                </Label>
              </div>
            </RadioGroup>

            {/* Selector para vincular existente */}
            {employeeMode === 'link' && (
              <EmployeeSelector
                employees={availableEmployees}
                selectedEmployeeId={formData.employeeId}
                onSelectEmployee={(id) => setFormData({ ...formData, employeeId: id })}
                loading={loadingEmployees}
              />
            )}

            {/* Opciones para crear nuevo empleado */}
            {employeeMode === 'create' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Tipo de empleado</Label>
                  <Select
                    value={formData.employeeType}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        employeeType: value as UserFormData['employeeType'],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selector de PersonalData existente */}
                <div className="space-y-2">
                  <PersonalDataSelector
                    selectedPersonalDataId={formData.personalDataId}
                    onSelectPersonalData={(id, name) => {
                      setFormData({ ...formData, personalDataId: id })
                      setSelectedPersonalDataName(name)
                    }}
                  />
                  {!formData.personalDataId && (
                    <p className="text-xs text-muted-foreground">
                      Si no seleccionas una persona existente, se creará con el nombre &quot;
                      {formData.name || '...'}&quot;
                    </p>
                  )}
                  {formData.personalDataId && selectedPersonalDataName && (
                    <p className="text-xs text-green-600">
                      Se vinculará al empleado existente: {selectedPersonalDataName}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
