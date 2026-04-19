'use client'

import { useState, useMemo, useEffect } from 'react'
import { useLazyQuery } from '@apollo/client'
import { Check, ChevronsUpDown, X, Database, ScanText, Search, UserPlus, Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { normalizeName } from '@/lib/fuzzy-match'
import { CAPTURA_SEARCH_PERSONAL_DATA_QUERY } from '@/graphql/queries/captura'

export interface AvalOption {
  name: string
  phone: string
  source: 'db' | 'ocr' | 'new-client'
  /** PersonalData ID cuando la opción proviene de búsqueda global (source='global') */
  personalDataId?: string
}

export interface GlobalPersonalDataResult {
  id: string
  fullName: string
  clientCode?: string | null
  phones?: Array<{ id: string; number: string }>
}

interface Props {
  avales: AvalOption[]
  selectedAval: { nombre?: string; telefono?: string; personalDataId?: string } | null
  onSelect: (aval: AvalOption | null) => void
  className?: string
  iconOnly?: boolean
  /** Habilita búsqueda global en PersonalData cuando el término es >= 3 chars */
  enableGlobalSearch?: boolean
  /** Borrower a excluir de la búsqueda global (para evitar self-aval) */
  excludeBorrowerId?: string
  /** Locality actual para reordenar resultados por localidad */
  locationId?: string
  /** Callback al seleccionar un resultado global */
  onGlobalSelect?: (pd: GlobalPersonalDataResult) => void
}

export function CapturaAvalAutocomplete({
  avales,
  selectedAval,
  onSelect,
  className,
  iconOnly,
  enableGlobalSearch = false,
  excludeBorrowerId,
  locationId,
  onGlobalSelect,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const [runGlobalSearch, globalSearchResult] = useLazyQuery<{ searchPersonalData: GlobalPersonalDataResult[] }>(
    CAPTURA_SEARCH_PERSONAL_DATA_QUERY,
    { fetchPolicy: 'network-only' }
  )

  useEffect(() => {
    if (!enableGlobalSearch) return
    const trimmed = search.trim()
    if (trimmed.length < 3) return
    const handle = setTimeout(() => {
      runGlobalSearch({
        variables: {
          searchTerm: trimmed,
          excludeBorrowerId,
          locationId,
          limit: 10,
        },
      })
    }, 300)
    return () => clearTimeout(handle)
  }, [search, enableGlobalSearch, excludeBorrowerId, locationId, runGlobalSearch])

  // Excluir nombres ya presentes en local `avales` para no duplicar visualmente
  const localNormalizedNames = useMemo(
    () => new Set(avales.map((a) => normalizeName(a.name))),
    [avales]
  )
  /**
   * Dedupe de resultados globales:
   *  1) Por `pd.id` (seguridad — el backend debería devolverlos únicos ya).
   *  2) Por (normalizeName + clientCode) — detecta PersonalData duplicadas
   *     creadas históricamente para la misma persona real (mismo código o mismo
   *     nombre exacto). Mostramos una sola entrada para evitar que el capturista
   *     escoja la PersonalData "huérfana" y se perpetúe el duplicado.
   *  3) Excluye nombres que ya viven en el grupo local de avales.
   */
  const globalResults = useMemo(() => {
    const raw = globalSearchResult.data?.searchPersonalData ?? []
    const byId = new Map<string, GlobalPersonalDataResult>()
    for (const pd of raw) byId.set(pd.id, pd)

    const byNameCode = new Map<string, GlobalPersonalDataResult>()
    for (const pd of byId.values()) {
      const key = `${normalizeName(pd.fullName)}|${pd.clientCode || ''}`
      if (!byNameCode.has(key)) byNameCode.set(key, pd)
    }

    return Array.from(byNameCode.values()).filter(
      (pd) => !localNormalizedNames.has(normalizeName(pd.fullName))
    )
  }, [globalSearchResult.data, localNormalizedNames])

  // Resolve display name: if selectedAval matches an option case-insensitively, use that option's name
  const resolvedName = useMemo(() => {
    if (!selectedAval?.nombre) return ''
    const selNorm = normalizeName(selectedAval.nombre)
    const match = avales.find(a => normalizeName(a.name) === selNorm)
    return match ? match.name : selectedAval.nombre
  }, [selectedAval?.nombre, avales])

  const displayLabel = resolvedName

  // Case-insensitive check if selected
  const isSelected = (avalName: string) => {
    if (!selectedAval?.nombre) return false
    return normalizeName(selectedAval.nombre) === normalizeName(avalName)
  }

  const filterFn = useMemo(() => {
    return (value: string, searchTerm: string) => {
      const norm = normalizeName(searchTerm)
      if (!norm) return 1
      const candidateNorm = normalizeName(value)
      if (candidateNorm.includes(norm)) return 1
      const reversed = norm.split(' ').reverse().join(' ')
      if (candidateNorm.includes(reversed)) return 1
      return 0
    }
  }, [])

  // Split avales by source for grouped display
  const dbAvales = avales.filter(a => a.source === 'db')
  const ocrAvales = avales.filter(a => a.source === 'ocr')
  const newClientAvales = avales.filter(a => a.source === 'new-client')

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        {iconOnly ? (
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label="Buscar aval"
            className={cn('h-7 w-7 shrink-0', className)}
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('h-8 justify-between text-xs font-normal', className)}
          >
            <span className="truncate min-w-0">
              {displayLabel ? displayLabel.toUpperCase() : 'Buscar aval...'}
            </span>
            <div className="flex items-center gap-0.5 ml-1 shrink-0">
              {selectedAval?.nombre && (
                <span
                  role="button"
                  className="h-4 w-4 flex items-center justify-center rounded-sm hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(null)
                  }}
                >
                  <X className="h-3 w-3" />
                </span>
              )}
              <ChevronsUpDown className="h-3 w-3 opacity-50" />
            </div>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 z-[60]" align="start">
        <Command filter={filterFn}>
          <CommandInput
            placeholder="Buscar por nombre..."
            className="h-8 text-xs"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">
              {enableGlobalSearch && search.trim().length < 3
                ? 'Escribe al menos 3 letras para buscar en toda la DB'
                : 'No se encontro aval'}
            </CommandEmpty>
            {dbAvales.length > 0 && (
              <CommandGroup heading={<span className="flex items-center gap-1 text-[10px] uppercase tracking-wider"><Database className="h-3 w-3" />Existentes</span>}>
                {dbAvales.map((aval) => (
                  <CommandItem
                    key={`db-${aval.name}`}
                    value={aval.name}
                    onSelect={() => {
                      onSelect(aval)
                      setOpen(false)
                    }}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        'mr-1.5 h-3 w-3 shrink-0',
                        isSelected(aval.name) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-medium truncate">{aval.name.toUpperCase()}</span>
                      {aval.phone && (
                        <span className="text-muted-foreground shrink-0">{aval.phone}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {ocrAvales.length > 0 && (
              <CommandGroup heading={<span className="flex items-center gap-1 text-[10px] uppercase tracking-wider"><ScanText className="h-3 w-3" />Nuevo (OCR)</span>}>
                {ocrAvales.map((aval) => (
                  <CommandItem
                    key={`ocr-${aval.name}`}
                    value={aval.name}
                    onSelect={() => {
                      onSelect(aval)
                      setOpen(false)
                    }}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        'mr-1.5 h-3 w-3 shrink-0',
                        isSelected(aval.name) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-medium truncate">{aval.name.toUpperCase()}</span>
                      {aval.phone && (
                        <span className="text-muted-foreground shrink-0">{aval.phone}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {newClientAvales.length > 0 && (
              <CommandGroup heading={<span className="flex items-center gap-1 text-[10px] uppercase tracking-wider"><UserPlus className="h-3 w-3" />Nuevo cliente (sesion actual)</span>}>
                {newClientAvales.map((aval) => (
                  <CommandItem
                    key={`new-${aval.name}`}
                    value={aval.name}
                    onSelect={() => {
                      onSelect(aval)
                      setOpen(false)
                    }}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        'mr-1.5 h-3 w-3 shrink-0',
                        isSelected(aval.name) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-medium truncate">{aval.name.toUpperCase()}</span>
                      {aval.phone && (
                        <span className="text-muted-foreground shrink-0">{aval.phone}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {enableGlobalSearch && onGlobalSelect && (
              <CommandGroup heading={
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider">
                  <Globe className="h-3 w-3" />
                  Buscar en toda la DB
                  {globalSearchResult.loading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                </span>
              }>
                {globalResults.map((pd) => {
                  const phone = pd.phones?.[0]?.number || ''
                  return (
                    <CommandItem
                      key={`global-pd-${pd.id}`}
                      value={`${pd.fullName} ${pd.clientCode || ''}`}
                      onSelect={() => {
                        onGlobalSelect(pd)
                        setOpen(false)
                      }}
                      className="text-xs"
                    >
                      <Check className="mr-1.5 h-3 w-3 shrink-0 opacity-0" />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="font-medium truncate">{pd.fullName.toUpperCase()}</span>
                        {pd.clientCode && (
                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                            {pd.clientCode}
                          </span>
                        )}
                        {phone && (
                          <span className="text-muted-foreground shrink-0">{phone}</span>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
