'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { CREATE_ROUTE, CREATE_ACCOUNT } from '@/graphql/mutations/routeManagement'

interface CreateRouteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateRouteModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateRouteModalProps) {
  const [routeName, setRouteName] = useState('')
  const [createAccount, setCreateAccount] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createRouteMutation] = useMutation(CREATE_ROUTE)
  const [createAccountMutation] = useMutation(CREATE_ACCOUNT)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Create the route
      const routeResult = await createRouteMutation({
        variables: {
          input: { name: routeName.trim() },
        },
      })

      const newRouteId = routeResult.data?.createRoute?.id

      // Create associated account if checkbox is checked
      if (createAccount && newRouteId) {
        await createAccountMutation({
          variables: {
            input: {
              name: `Fondo ${routeName.trim()}`,
              type: 'EMPLOYEE_CASH_FUND',
              amount: 0,
              routeIds: [newRouteId],
            },
          },
        })
      }

      // Reset form and close
      setRouteName('')
      setCreateAccount(true)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating route:', err)
      setError(err instanceof Error ? err.message : 'Error al crear la ruta')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setRouteName('')
      setCreateAccount(true)
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nueva Ruta</DialogTitle>
          <DialogDescription>
            Ingresa el nombre de la nueva ruta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="routeName">Nombre de la Ruta</Label>
            <Input
              id="routeName"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Ej: Ruta Norte"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="createAccount"
              checked={createAccount}
              onCheckedChange={(checked) => setCreateAccount(checked === true)}
              disabled={isSubmitting}
            />
            <Label
              htmlFor="createAccount"
              className="text-sm font-normal cursor-pointer"
            >
              Crear cuenta de fondo asociada (inicializada en $0)
            </Label>
          </div>

          {createAccount && routeName && (
            <p className="text-xs text-muted-foreground">
              Se creara la cuenta: <span className="font-medium">Fondo {routeName.trim()}</span>
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !routeName.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Ruta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
