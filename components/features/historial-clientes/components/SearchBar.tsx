'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLazyQuery } from '@apollo/client'
import { Search, User, ChevronsUpDown, Trash2, FileText, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { SEARCH_CLIENTS_QUERY } from '@/graphql/queries/clients'
import type { ClientSearchResult } from '../types'

interface SearchBarProps {
  onSelectClient: (client: ClientSearchResult) => void
  onClear: () => void
  onGeneratePDF?: (detailed: boolean) => void
  selectedClient?: ClientSearchResult | null
  hasSelectedClient?: boolean
  isLoading?: boolean
  pdfLoading?: boolean
  locationId?: string
  routeId?: string
}

export function SearchBar({
  onSelectClient,
  onClear,
  onGeneratePDF,
  selectedClient,
  hasSelectedClient,
  isLoading,
  pdfLoading,
  locationId,
  routeId,
}: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const [searchClients, { data, loading: searchLoading }] = useLazyQuery(SEARCH_CLIENTS_QUERY, {
    fetchPolicy: 'network-only',
  })

  const results: ClientSearchResult[] = data?.searchClients || []

  // Attach wheel event listener to enable scrolling in dropdown
  useEffect(() => {
    const container = listRef.current
    if (!container || !open) return

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation()
      container.scrollTop += e.deltaY
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [open])

  // Debounce search
  useEffect(() => {
    if (searchTerm.length < 2) return

    const timer = setTimeout(() => {
      searchClients({
        variables: {
          searchTerm,
          locationId,
          routeId,
          limit: 15,
        },
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, searchClients, locationId, routeId])

  const handleSelect = useCallback(
    (client: ClientSearchResult) => {
      onSelectClient(client)
      setOpen(false)
      setSearchTerm('')
    },
    [onSelectClient]
  )

  const handleClear = useCallback(() => {
    onClear()
    setSearchTerm('')
  }, [onClear])

  return (
    <Card className="mb-4">
      <CardContent className="p-3 md:p-4">
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Autocomplete */}
          <div className="flex-1">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    'w-full justify-between h-10 px-3 font-normal text-sm',
                    selectedClient && 'border-primary bg-primary/5'
                  )}
                >
                  {selectedClient ? (
                    <span className="flex items-center gap-2 text-foreground truncate">
                      <User className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="truncate">{selectedClient.name}</span>
                      <span className="text-muted-foreground text-xs">({selectedClient.clientCode})</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Search className="h-4 w-4" />
                      Buscar cliente...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0"
                align="start"
                style={{ width: 'var(--radix-popover-trigger-width)', minWidth: '300px' }}
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Nombre o clave..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="h-9 text-sm"
                  />
                  <CommandList
                    ref={listRef}
                    className="max-h-[280px] overflow-y-auto overscroll-contain"
                  >
                    {searchLoading && (
                      <div className="py-3 text-center text-xs text-muted-foreground">
                        Buscando...
                      </div>
                    )}

                    {!searchLoading && searchTerm.length >= 2 && results.length === 0 && (
                      <CommandEmpty>
                        <div className="py-3 text-center text-xs">
                          No se encontraron clientes
                        </div>
                      </CommandEmpty>
                    )}

                    {!searchLoading && searchTerm.length < 2 && (
                      <div className="py-3 text-center text-xs text-muted-foreground">
                        Escribe al menos 2 caracteres
                      </div>
                    )}

                    {results.length > 0 && (
                      <CommandGroup>
                        {results.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.id}
                            onSelect={() => handleSelect(client)}
                            className="flex items-center justify-between gap-2 py-2 px-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{client.name}</span>
                              <span className="text-muted-foreground text-xs flex-shrink-0">#{client.clientCode}</span>
                            </div>
                            {client.activeLoans > 0 && (
                              <span className="text-[10px] font-medium bg-success/15 text-success px-1.5 py-0.5 rounded-full flex-shrink-0">
                                {client.activeLoans}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Action Button */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClear}
            disabled={isLoading}
            className="gap-1.5 h-10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Limpiar</span>
          </Button>
        </div>

        {/* PDF Buttons - shown when client history is loaded */}
        {hasSelectedClient && onGeneratePDF && (
          <div className="flex gap-2 mt-2 pt-2 border-t">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onGeneratePDF(true)}
              disabled={pdfLoading}
              className="flex-1 gap-1 h-8 text-xs"
            >
              {pdfLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              Detallado
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onGeneratePDF(false)}
              disabled={pdfLoading}
              className="flex-1 gap-1 h-8 text-xs"
            >
              {pdfLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              Resumen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
