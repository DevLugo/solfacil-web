'use client'

import { User, MapPin, Phone, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UnifiedClientValue } from '../../types'
import { clientFormStateStyles, getClientFormState } from '../../../shared/theme'

interface SelectedClientDisplayProps {
  value: UnifiedClientValue
  allowEdit: boolean
  disabled: boolean
  onStartEdit: () => void
  onClear: () => void
  className?: string
}

export function SelectedClientDisplay({
  value,
  allowEdit,
  disabled,
  onStartEdit,
  onClear,
  className,
}: SelectedClientDisplayProps) {
  // Get effective state and styles from theme
  const effectiveState = getClientFormState(value.clientState, value.isFromCurrentLocation)
  const styles = clientFormStateStyles[effectiveState]
  const showLocationIcon = effectiveState === 'otherLocation'

  return (
    <div className={cn(
      'flex items-center gap-2.5 p-2.5 md:p-3 border rounded-lg transition-colors touch-manipulation',
      styles.container,
      className
    )}>
      {/* Avatar/Icon */}
      <div className={cn(
        'flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full flex-shrink-0',
        styles.avatar
      )}>
        {showLocationIcon ? (
          <MapPin className={cn('h-4 w-4 md:h-5 md:w-5', styles.icon)} />
        ) : (
          <User className={cn('h-4 w-4 md:h-5 md:w-5', styles.icon)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-sm md:text-base truncate">{value.fullName}</span>
          {styles.badgeLabel && (
            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-4', styles.badge)}>
              {styles.badgeLabel}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mt-0.5">
          {value.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {value.phone}
            </span>
          )}
          {showLocationIcon && value.locationName && (
            <span className={cn('flex items-center gap-1', styles.icon)}>
              <MapPin className="h-3 w-3" />
              {value.locationName}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {allowEdit && value.clientState !== 'renewed' && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9 text-muted-foreground hover:text-foreground"
            onClick={onStartEdit}
            disabled={disabled}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:h-9 md:w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onClear}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
