'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, User, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

const SEARCH_PERSONAL_DATA = gql`
  query SearchPersonalData($searchTerm: String!) {
    searchClients(searchTerm: $searchTerm, limit: 50) {
      id
      name
      clientCode
      phone
      address
      hasLoans
      totalLoans
    }
  }
`

interface PersonalDataResult {
  id: string
  name: string
  clientCode: string
  phone: string | null
  address: string | null
  hasLoans: boolean
  totalLoans: number
}

interface PersonalDataSelectorProps {
  selectedPersonalDataId?: string
  onSelectPersonalData: (personalDataId: string, name: string) => void
}

export function PersonalDataSelector({
  selectedPersonalDataId,
  onSelectPersonalData,
}: PersonalDataSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data, loading } = useQuery<{ searchClients: PersonalDataResult[] }>(
    SEARCH_PERSONAL_DATA,
    {
      variables: { searchTerm: debouncedSearch },
      skip: debouncedSearch.length < 2,
    }
  )

  const results = data?.searchClients || []
  const selectedPerson = results.find((p) => p.id === selectedPersonalDataId)

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="personal-data-search">
          Buscar persona existente (nombre o código)
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="personal-data-search"
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchTerm.length > 0 && searchTerm.length < 2 && (
          <p className="text-xs text-muted-foreground">
            Ingresa al menos 2 caracteres para buscar
          </p>
        )}
      </div>

      {/* Results */}
      {debouncedSearch.length >= 2 && (
        <ScrollArea className="h-[200px] rounded-md border">
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Buscando...
              </div>
            ) : results.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No se encontraron resultados
              </div>
            ) : (
              results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onSelectPersonalData(person.id, person.name)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    'hover:bg-accent hover:border-accent-foreground/20',
                    selectedPersonalDataId === person.id
                      ? 'bg-accent border-accent-foreground/50'
                      : 'bg-background'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{person.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{person.clientCode}</span>
                        {person.phone && (
                          <>
                            <span>•</span>
                            <Phone className="h-3 w-3" />
                            <span>{person.phone}</span>
                          </>
                        )}
                      </div>
                      {person.address && (
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          {person.address}
                        </div>
                      )}
                    </div>
                    {person.hasLoans && (
                      <Badge variant="secondary" className="text-xs">
                        {person.totalLoans} préstamo{person.totalLoans !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Selected Person Info */}
      {selectedPerson && (
        <Card className="p-4 bg-accent">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <User className="h-4 w-4" />
            Seleccionado
          </div>
          <div className="space-y-1">
            <div className="font-medium">{selectedPerson.name}</div>
            <div className="text-sm text-muted-foreground">
              Código: {selectedPerson.clientCode}
            </div>
            {selectedPerson.phone && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {selectedPerson.phone}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
