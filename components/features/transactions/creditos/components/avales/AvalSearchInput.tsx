'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLazyQuery } from '@apollo/client'
import { Search, Plus, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SEARCH_PERSONAL_DATA_QUERY } from '@/graphql/queries/transactions'

interface SearchResult {
  id: string
  fullName: string
  phones: { id: string; number: string }[]
  addresses: { id: string; location: { id: string; name: string } }[]
}

interface AvalSearchInputProps {
  locationId?: string
  excludeBorrowerId?: string
  onSelect: (personalDataId: string) => void
  onCreate: (name: string, phone: string) => void
  onCancel?: () => void
  placeholder?: string
}

export function AvalSearchInput({
  locationId,
  excludeBorrowerId,
  onSelect,
  onCreate,
  onCancel,
  placeholder = 'Buscar o crear aval...',
}: AvalSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(null)

  const [search, { data, loading }] = useLazyQuery<{
    searchPersonalData: SearchResult[]
  }>(SEARCH_PERSONAL_DATA_QUERY)

  const results = data?.searchPersonalData || []

  const doSearch = useCallback(
    (term: string) => {
      if (term.length < 2) return
      search({
        variables: {
          searchTerm: term,
          locationId,
          excludeBorrowerId,
          limit: 10,
        },
      })
    },
    [search, locationId, excludeBorrowerId]
  )

  const handleInputChange = (value: string) => {
    setSearchTerm(value)
    setShowDropdown(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  const handleSelect = (result: SearchResult) => {
    setShowDropdown(false)
    setSearchTerm('')
    onSelect(result.id)
  }

  const handleStartCreate = () => {
    setIsCreating(true)
    setNewName(searchTerm)
    setShowDropdown(false)
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreate(newName.trim(), newPhone.trim())
    setIsCreating(false)
    setNewName('')
    setNewPhone('')
    setSearchTerm('')
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (isCreating) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre completo"
          className="h-8 text-sm flex-1"
          autoFocus
        />
        <Input
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          placeholder="Teléfono"
          className="h-8 text-sm w-28"
        />
        <Button
          size="sm"
          className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
          onClick={handleCreate}
          disabled={!newName.trim()}
        >
          Crear
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => {
            setIsCreating(false)
            onCancel?.()
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
          placeholder={placeholder}
          className="h-8 text-sm pl-8 pr-8"
        />
        {onCancel && (
          <button
            onClick={() => {
              setSearchTerm('')
              setShowDropdown(false)
              onCancel()
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && searchTerm.length >= 2 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {results.length > 0 && (
                <div className="py-1">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect(r)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="font-medium truncate">{r.fullName}</span>
                      {r.phones[0] && (
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {r.phones[0].number}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {results.length === 0 && (
                <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                  No se encontraron resultados
                </div>
              )}
              <button
                onClick={handleStartCreate}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-t flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear &quot;{searchTerm}&quot; como nuevo aval
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
