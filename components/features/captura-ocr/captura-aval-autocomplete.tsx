'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, X, Database, ScanText, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { normalizeName } from '@/lib/fuzzy-match'

export interface AvalOption {
  name: string
  phone: string
  source: 'db' | 'ocr' | 'new-client'
}

interface Props {
  avales: AvalOption[]
  selectedAval: { nombre?: string; telefono?: string } | null
  onSelect: (aval: AvalOption | null) => void
  className?: string
  iconOnly?: boolean
}

export function CapturaAvalAutocomplete({
  avales,
  selectedAval,
  onSelect,
  className,
  iconOnly,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

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
              No se encontro aval
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
