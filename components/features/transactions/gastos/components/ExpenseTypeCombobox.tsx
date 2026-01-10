'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { EXPENSE_TYPES } from '../constants'

interface ExpenseTypeComboboxProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function ExpenseTypeCombobox({
  value,
  onValueChange,
  placeholder = 'Seleccionar tipo...',
  className,
}: ExpenseTypeComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedType = EXPENSE_TYPES.find((type) => type.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[180px] justify-between font-normal', className)}
        >
          {selectedType ? (
            <span className="flex items-center gap-2 truncate">
              <selectedType.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedType.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar tipo..." />
          <CommandList>
            <CommandEmpty>No se encontro el tipo.</CommandEmpty>
            <CommandGroup>
              {EXPENSE_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <CommandItem
                    key={type.value}
                    value={type.value}
                    keywords={[type.label]}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue.toUpperCase())
                      setOpen(false)
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4 shrink-0" />
                    <span>{type.label}</span>
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        value === type.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
