'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'
import { normalizeName } from '@/lib/fuzzy-match'
import type { CapturaClient } from './types'

interface Props {
  clientsList: CapturaClient[]
  selectedClient: CapturaClient | null
  onSelect: (client: CapturaClient | null) => void
  initialSearch?: string
  className?: string
  iconOnly?: boolean
}

export function CapturaClientAutocomplete({
  clientsList,
  selectedClient,
  onSelect,
  initialSearch,
  className,
  iconOnly,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const displayLabel = selectedClient
    ? `${selectedClient.borrowerName || ''} (${selectedClient.clientCode})`
    : initialSearch || ''

  // Custom filter: normalize both query and candidate for accent/case insensitive matching
  const filterFn = useMemo(() => {
    return (value: string, searchTerm: string) => {
      const norm = normalizeName(searchTerm)
      if (!norm) return 1
      const candidateNorm = normalizeName(value)
      if (candidateNorm.includes(norm)) return 1
      // Also check reversed search terms
      const reversed = norm.split(' ').reverse().join(' ')
      if (candidateNorm.includes(reversed)) return 1
      return 0
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        {iconOnly ? (
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label="Buscar cliente existente"
            className={cn('h-8 w-8 shrink-0', className)}
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
              {selectedClient ? displayLabel : (initialSearch || 'Buscar cliente...')}
            </span>
            <div className="flex items-center gap-0.5 ml-1 shrink-0">
              {selectedClient && (
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
      <PopoverContent className="w-[350px] p-0 z-[60]" align="start">
        <Command filter={filterFn}>
          <CommandInput
            placeholder="Buscar por nombre o codigo..."
            className="h-8 text-xs"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">
              No se encontro cliente
            </CommandEmpty>
            <CommandGroup>
              {clientsList.map((client) => (
                <CommandItem
                  key={client.pos}
                  value={`${client.borrowerName || ''} ${client.clientCode}`}
                  onSelect={() => {
                    onSelect(client)
                    setOpen(false)
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      'mr-1.5 h-3 w-3 shrink-0',
                      selectedClient?.pos === client.pos ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{client.borrowerName || '---'}</span>
                      <span className="font-mono text-muted-foreground shrink-0">{client.clientCode}</span>
                    </div>
                    {client.pendingBalance != null && client.pendingBalance > 0 && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="h-4 px-1 text-[10px] text-red-600 border-red-200">
                          Deuda: {formatCurrency(client.pendingBalance)}
                        </Badge>
                        {client.loantypeName && (
                          <span className="text-[10px] text-muted-foreground">{client.loantypeName}</span>
                        )}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
