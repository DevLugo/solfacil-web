'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@apollo/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { UPDATE_LEADER } from '@/graphql/mutations/leader'

interface LeaderListItem {
  id: string
  fullName: string
  birthDate: string | null
  phone: string | null
  locationName: string | null
  routeId: string | null
  routeName: string | null
  createdAt: string
}

interface EditLeaderDialogProps {
  leader: LeaderListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function EditLeaderDialog({ leader, open, onOpenChange, onSuccess }: EditLeaderDialogProps) {
  const { toast } = useToast()
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')

  const [updateLeader, { loading }] = useMutation(UPDATE_LEADER)

  useEffect(() => {
    if (leader) {
      setFullName(leader.fullName)
      setBirthDate(formatDateForInput(leader.birthDate))
      setPhone(leader.phone || '')
    }
  }, [leader])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!leader || !fullName.trim()) return

    try {
      // Convert date-only string to ISO format for DateTime scalar
      // Input type="date" returns "YYYY-MM-DD" but GraphQL DateTime expects ISO 8601
      const birthDateISO = birthDate ? new Date(birthDate).toISOString() : null

      const result = await updateLeader({
        variables: {
          input: {
            id: leader.id,
            fullName: fullName.trim(),
            birthDate: birthDateISO,
            phone: phone.trim() || null,
          },
        },
      })

      // With errorPolicy: 'all', errors don't throw - check explicitly
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message)
      }

      toast({
        title: 'Lider actualizado',
        description: `${fullName.trim()} se actualizo correctamente`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el lider',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Lider</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Fecha de nacimiento</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 5551234567"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !fullName.trim()}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
