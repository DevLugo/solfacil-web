'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useScrollable } from '@/hooks/use-scrollable'

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  allowClear?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'No se encontraron resultados',
  disabled = false,
  loading = false,
  className,
  allowClear = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const { onWheel } = useScrollable()

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    setHighlightedIndex(-1)
  }, [search])

  // Reset when popover closes
  React.useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1)
    }
  }, [open])

  const handleSelect = (currentValue: string) => {
    if (currentValue === value && allowClear) {
      onValueChange(null)
    } else {
      onValueChange(currentValue)
    }
    setOpen(false)
    setSearch('')
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredOptions.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : 0
          // Scroll item into view
          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : filteredOptions.length - 1
          // Scroll item into view
          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between', className)}
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="text-muted-foreground">Cargando...</span>
          ) : selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{
          width: 'min(var(--radix-popover-trigger-width), calc(100vw - 32px))',
          maxWidth: '500px'
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b px-2.5 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none ring-0 focus:outline-none focus:ring-0 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div
          className="max-h-[280px] overflow-y-auto overflow-x-hidden overscroll-contain py-1"
          onWheel={onWheel}
        >
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                ref={(el) => { itemRefs.current[index] = el }}
                className={cn(
                  'relative mx-1 flex cursor-pointer select-none items-start rounded-md px-2 py-2 text-sm outline-none transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  value === option.value && 'bg-accent/50 font-medium',
                  highlightedIndex === index && 'bg-accent text-accent-foreground'
                )}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4 shrink-0 mt-0.5',
                    value === option.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="flex-1 break-words leading-snug">{option.label}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
