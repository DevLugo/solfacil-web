'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLazyQuery, useMutation } from '@apollo/client'
import { AlertTriangle, ArrowRight, Search, X, Loader2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  MERGE_TWO_PERSONAL_DATA,
  PersonalDataDuplicateRecord,
  SEARCH_PERSONAL_DATA_FOR_MERGE,
} from '../queries'

type Role = 'survivor' | 'source'

export function ManualMergeTab() {
  const { toast } = useToast()
  const [survivor, setSurvivor] = useState<PersonalDataDuplicateRecord | null>(null)
  const [source, setSource] = useState<PersonalDataDuplicateRecord | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [conflictMessage, setConflictMessage] = useState('')

  const [mergeMutation, { loading: merging }] = useMutation(MERGE_TWO_PERSONAL_DATA, {
    onCompleted: () => {
      toast({ title: 'Registros fusionados correctamente' })
      setSurvivor(null)
      setSource(null)
      setConfirmOpen(false)
      setConflictOpen(false)
    },
    onError: (error) => {
      const code =
        (error.graphQLErrors[0]?.extensions?.code as string | undefined) ?? undefined
      if (code === 'CONFLICT') {
        setConflictMessage(error.message)
        setConfirmOpen(false)
        setConflictOpen(true)
      } else {
        toast({
          title: 'Error al fusionar',
          description: error.message,
          variant: 'destructive',
        })
      }
    },
  })

  const bothEmployee = !!survivor?.hasEmployee && !!source?.hasEmployee
  const bothBorrower = !!survivor?.hasBorrower && !!source?.hasBorrower

  const canMerge = survivor && source && survivor.id !== source.id

  const handleSubmit = (force: boolean) => {
    if (!canMerge) return
    mergeMutation({
      variables: { survivorId: survivor!.id, sourceId: source!.id, force },
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fusión manual de PersonalData</CardTitle>
          <p className="text-sm text-muted-foreground">
            Busca y selecciona 2 registros para fusionarlos. El <strong>sobreviviente</strong>{' '}
            conserva su ID. El <strong>origen</strong> se elimina y todos sus datos (teléfonos,
            direcciones, documentos, préstamos) se migran al sobreviviente.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
            <SearchSide
              role="survivor"
              label="Sobreviviente (conserva ID)"
              selected={survivor}
              onSelect={setSurvivor}
              excludeId={source?.id}
            />

            <div className="flex items-center justify-center h-full pt-8">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            <SearchSide
              role="source"
              label="Origen (se elimina)"
              selected={source}
              onSelect={setSource}
              excludeId={survivor?.id}
            />
          </div>

          {survivor && source && survivor.id === source.id && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>Ambos lados apuntan al mismo registro. Elige registros distintos.</span>
            </div>
          )}

          {canMerge && (bothEmployee || bothBorrower) && (
            <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium">Posible conflicto detectado</div>
                {bothEmployee && <div>• Ambos registros tienen Employee asociado.</div>}
                {bothBorrower && <div>• Ambos registros tienen Borrower (pueden tener préstamos activos).</div>}
                <div className="text-xs">
                  Si al confirmar la fusión el servidor rechaza por conflicto, se te pedirá una
                  confirmación adicional.
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSurvivor(null)
                setSource(null)
              }}
              disabled={merging || (!survivor && !source)}
            >
              Limpiar
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canMerge || merging}
            >
              {merging ? 'Fusionando...' : 'Fusionar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* First confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar fusión?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>
                  Se eliminará <strong>{source?.fullName}</strong> ({source?.clientCode}) y sus
                  datos se migrarán a <strong>{survivor?.fullName}</strong> (
                  {survivor?.clientCode}).
                </div>
                <div className="text-xs text-muted-foreground">Esta acción es irreversible.</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleSubmit(false)
              }}
              disabled={merging}
            >
              {merging ? 'Fusionando...' : 'Sí, fusionar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict confirmation (force) */}
      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Conflicto detectado
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-amber-900 text-sm">
                  {conflictMessage}
                </div>
                <div className="text-sm">
                  ¿Deseas forzar la fusión de todas formas? Esta operación es{' '}
                  <strong>irreversible</strong>. Asegúrate de haber elegido correctamente el
                  sobreviviente.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleSubmit(true)
              }}
              disabled={merging}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {merging ? 'Forzando...' : 'Forzar fusión'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ----------------------------------------------------------
// Search widget per side
// ----------------------------------------------------------

interface SearchSideProps {
  role: Role
  label: string
  selected: PersonalDataDuplicateRecord | null
  onSelect: (r: PersonalDataDuplicateRecord | null) => void
  excludeId?: string | null
}

function SearchSide({ label, selected, onSelect, excludeId }: SearchSideProps) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setDebounced(term.trim()), 300)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [term])

  const [runSearch, { data, loading }] = useLazyQuery<{
    searchPersonalDataForMerge: PersonalDataDuplicateRecord[]
  }>(SEARCH_PERSONAL_DATA_FOR_MERGE, { fetchPolicy: 'network-only' })

  useEffect(() => {
    if (debounced.length >= 2 && !selected) {
      runSearch({ variables: { query: debounced, limit: 20 } })
    }
  }, [debounced, selected, runSearch])

  const results = useMemo(() => {
    const list = data?.searchPersonalDataForMerge ?? []
    return excludeId ? list.filter((r) => r.id !== excludeId) : list
  }, [data, excludeId])

  if (selected) {
    return (
      <div className="space-y-2">
        <Label className="text-sm">{label}</Label>
        <div className="border rounded-lg p-3 bg-primary/5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-medium">{selected.fullName}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onSelect(null)
                setTerm('')
              }}
              className="h-6 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap mb-2">
            {selected.hasEmployee && (
              <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                Empleado
              </Badge>
            )}
            {selected.hasBorrower && (
              <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                Borrower ({selected.totalLoansAsBorrower} préstamos)
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span>Código: {selected.clientCode || '—'}</span>
            <span>
              Nacim.:{' '}
              {selected.birthDate
                ? new Date(selected.birthDate).toLocaleDateString('es-MX')
                : '—'}
            </span>
            <span>Avales: {selected.loansAsCollateralCount}</span>
            <span>Teléfonos: {selected.phonesCount}</span>
            <span>Direcciones: {selected.addressesCount}</span>
            <span>Docs: {selected.documentPhotosCount}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="pl-8"
        />
        {loading && (
          <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {debounced.length >= 2 && (
        <div className="border rounded-md max-h-72 overflow-y-auto">
          {results.length === 0 && !loading && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Sin resultados
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full text-left p-2 hover:bg-muted border-b last:border-b-0 flex flex-col gap-0.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{r.fullName}</span>
                <div className="flex gap-1">
                  {r.hasEmployee && (
                    <Badge variant="outline" className="text-blue-600 border-blue-600 text-[10px] py-0">
                      Emp
                    </Badge>
                  )}
                  {r.hasBorrower && (
                    <Badge variant="outline" className="text-amber-600 border-amber-600 text-[10px] py-0">
                      Bor ({r.totalLoansAsBorrower})
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.clientCode} ·{' '}
                {r.birthDate
                  ? new Date(r.birthDate).toLocaleDateString('es-MX')
                  : 'sin fecha'}{' '}
                · {r.phonesCount}tel · {r.addressesCount}dir · {r.documentPhotosCount}docs
              </div>
            </button>
          ))}
        </div>
      )}

      {debounced.length > 0 && debounced.length < 2 && (
        <div className="text-xs text-muted-foreground">Escribe al menos 2 caracteres</div>
      )}
    </div>
  )
}
