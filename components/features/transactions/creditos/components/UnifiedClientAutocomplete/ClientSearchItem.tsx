'use client'

import { User, MapPin, Phone, RefreshCw } from 'lucide-react'
import { CommandItem } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { ClientLoanBadges } from './ClientLoanBadges'
import { clientFormStateStyles, textStyles } from '../../../shared/theme'
import type { UnifiedClientValue } from '../../types'

interface ClientSearchItemProps {
  client: UnifiedClientValue
  mode: 'borrower' | 'aval'
  variant: 'current-location' | 'other-location' | 'active-loan'
  onSelect: (client: UnifiedClientValue) => void
}

// Variant-based styles using theme constants
const variantStyles = {
  'active-loan': clientFormStateStyles.otherLocation, // Uses warning colors for active loan
  'other-location': clientFormStateStyles.otherLocation,
  'current-location': clientFormStateStyles.existing,
}

export function ClientSearchItem({ client, mode, variant, onSelect }: ClientSearchItemProps) {
  const styles = variantStyles[variant]

  const getIcon = () => {
    if (variant === 'active-loan') {
      return (
        <div className={cn('flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full flex-shrink-0', styles.avatar)}>
          <RefreshCw className={cn('h-5 w-5', styles.icon)} />
        </div>
      )
    }
    if (variant === 'other-location') {
      return (
        <div className={cn('flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full flex-shrink-0', styles.avatar)}>
          <MapPin className={cn('h-5 w-5', styles.icon)} />
        </div>
      )
    }
    return (
      <div className={cn('flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full flex-shrink-0', styles.avatar)}>
        <User className={cn('h-5 w-5', styles.icon)} />
      </div>
    )
  }

  const getSubtitle = () => {
    if (variant === 'other-location') {
      return (
        <div className={cn('text-sm mt-1', textStyles.warning)}>
          {client.locationName || 'Otra localidad'}
        </div>
      )
    }
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
        <Phone className="h-3.5 w-3.5" />
        <span>{client.phone || 'Sin teléfono'}</span>
      </div>
    )
  }

  return (
    <CommandItem
      key={client.id}
      value={client.id}
      onSelect={() => onSelect(client)}
      className="flex items-start gap-3 py-3 md:py-4 px-3 cursor-pointer data-[selected=true]:bg-muted touch-manipulation"
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-foreground text-base">{client.fullName}</div>
        {getSubtitle()}
      </div>
      <div className="flex-shrink-0">
        <ClientLoanBadges client={client} mode={mode} />
      </div>
    </CommandItem>
  )
}
