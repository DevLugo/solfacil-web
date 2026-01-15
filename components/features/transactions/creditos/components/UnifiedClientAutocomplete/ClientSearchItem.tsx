'use client'

import { Phone, MapPin } from 'lucide-react'
import { CommandItem } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { ClientLoanBadges } from './ClientLoanBadges'
import { textStyles } from '../../../shared/theme'
import type { UnifiedClientValue } from '../../types'

interface ClientSearchItemProps {
  client: UnifiedClientValue
  mode: 'borrower' | 'aval'
  variant: 'current-location' | 'other-location' | 'active-loan'
  onSelect: (client: UnifiedClientValue) => void
}

export function ClientSearchItem({ client, mode, variant, onSelect }: ClientSearchItemProps) {
  return (
    <CommandItem
      key={client.id}
      value={client.id}
      onSelect={() => onSelect(client)}
      className="flex flex-col gap-1 py-2.5 px-3 cursor-pointer data-[selected=true]:bg-muted touch-manipulation"
    >
      {/* Línea 1: Nombre completo */}
      <div
        className="font-medium truncate text-foreground text-base w-full"
        title={client.fullName}
      >
        {client.fullName}
      </div>
      {/* Línea 2: Teléfono/Localidad + Badges */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          {variant === 'other-location' ? (
            <>
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-warning" />
              <span className={cn('truncate', textStyles.warning)}>
                {client.locationName || 'Otra localidad'}
              </span>
            </>
          ) : (
            <>
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{client.phone || 'Sin teléfono'}</span>
            </>
          )}
        </div>
        <div className="flex-shrink-0">
          <ClientLoanBadges client={client} mode={mode} />
        </div>
      </div>
    </CommandItem>
  )
}
