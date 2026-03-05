'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { GET_ROUTES_FOR_ACCOUNTS } from '../queries'
import type { Account, AccountFormData, AccountType, Route } from '../types'
import { ACCOUNT_TYPE_LABELS } from '../types'

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
  onSubmit: (data: AccountFormData) => Promise<void>
  isSaving: boolean
}

const ACCOUNT_TYPES: AccountType[] = [
  'BANK',
  'OFFICE_CASH_FUND',
  'EMPLOYEE_CASH_FUND',
  'PREPAID_GAS',
  'TRAVEL_EXPENSES',
]

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  onSubmit,
  isSaving,
}: AccountFormDialogProps) {
  const isEditing = !!account

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('EMPLOYEE_CASH_FUND')
  const [amount, setAmount] = useState('0')
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])

  const { data: routesData, loading: routesLoading } = useQuery<{ routes: Route[] }>(
    GET_ROUTES_FOR_ACCOUNTS,
    { skip: !open }
  )

  const routes = routesData?.routes || []

  useEffect(() => {
    if (open) {
      if (account) {
        setName(account.name)
        setType(account.type)
        setAmount('0')
        setSelectedRouteIds(account.routes.map((r) => r.id))
      } else {
        setName('')
        setType('EMPLOYEE_CASH_FUND')
        setAmount('0')
        setSelectedRouteIds([])
      }
    }
  }, [open, account])

  const toggleRoute = (routeId: string) => {
    setSelectedRouteIds((prev) =>
      prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId]
    )
  }

  const toggleAll = () => {
    if (selectedRouteIds.length === routes.length) {
      setSelectedRouteIds([])
    } else {
      setSelectedRouteIds(routes.map((r) => r.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    await onSubmit({
      name: name.trim(),
      type,
      amount,
      routeIds: selectedRouteIds,
    })
  }

  const isValid = name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Modifica el nombre y las rutas asignadas a esta cuenta.'
                : 'Crea una nueva cuenta y asignala a las rutas correspondientes.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Fondo Ruta Norte"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as AccountType)}
                disabled={isEditing}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  El tipo no se puede cambiar despues de crear la cuenta.
                </p>
              )}
            </div>

            {!isEditing && (
              <div className="grid gap-2">
                <Label htmlFor="amount">Monto Inicial</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Rutas Asignadas</Label>
                {routes.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0 px-1 text-xs text-muted-foreground"
                    onClick={toggleAll}
                  >
                    {selectedRouteIds.length === routes.length
                      ? 'Deseleccionar todas'
                      : 'Seleccionar todas'}
                  </Button>
                )}
              </div>

              {routesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : routes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No hay rutas disponibles.
                </p>
              ) : (
                <ScrollArea className="h-[180px] rounded-md border p-3">
                  <div className="space-y-2">
                    {routes.map((route) => (
                      <label
                        key={route.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 transition-colors"
                      >
                        <Checkbox
                          checked={selectedRouteIds.includes(route.id)}
                          onCheckedChange={() => toggleRoute(route.id)}
                        />
                        <span className="text-sm">{route.name}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedRouteIds.length} ruta(s) seleccionada(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
