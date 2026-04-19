'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { MERGE_PERSONAL_DATA_GROUP, PersonalDataDuplicateGroup } from '../queries'

interface MergeDialogProps {
  group: PersonalDataDuplicateGroup
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MergeDialog({ group, open, onOpenChange, onSuccess }: MergeDialogProps) {
  const { toast } = useToast()
  const [survivorId, setSurvivorId] = useState(group.autoSurvivorId)

  const [mergeMutation, { loading }] = useMutation(MERGE_PERSONAL_DATA_GROUP, {
    onCompleted: () => {
      toast({ title: 'Grupo fusionado correctamente' })
      onSuccess()
    },
    onError: (error) => {
      toast({
        title: 'Error al fusionar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleMerge = () => {
    mergeMutation({
      variables: {
        groupKey: group.groupKey,
        survivorId,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisar grupo de duplicados</DialogTitle>
          <DialogDescription>
            Localidad: <span className="font-medium">{group.locationName || '—'}</span>. Selecciona
            el registro que sobrevivirá. Los demás se fusionarán en él.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <RadioGroup value={survivorId} onValueChange={setSurvivorId}>
            {group.records.map((r) => (
              <div
                key={r.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  survivorId === r.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setSurvivorId(r.id)}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={r.id} id={r.id} className="mt-1" />
                  <Label htmlFor={r.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{r.fullName}</span>
                      <div className="flex gap-1 flex-wrap">
                        {r.hasEmployee && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Empleado
                          </Badge>
                        )}
                        {r.hasBorrower && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Borrower
                          </Badge>
                        )}
                        {r.id === group.autoSurvivorId && (
                          <Badge variant="secondary">Recomendado</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-0.5">
                      <span>Código: {r.clientCode || '—'}</span>
                      <span>
                        Nacim.:{' '}
                        {r.birthDate
                          ? new Date(r.birthDate).toLocaleDateString('es-MX')
                          : '—'}
                      </span>
                      <span>Préstamos: {r.totalLoansAsBorrower}</span>
                      <span>Avales: {r.loansAsCollateralCount}</span>
                      <span>Teléfonos: {r.phonesCount}</span>
                      <span>Direcciones: {r.addressesCount}</span>
                      <span>Docs: {r.documentPhotosCount}</span>
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={loading}>
            {loading ? 'Fusionando...' : 'Fusionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
