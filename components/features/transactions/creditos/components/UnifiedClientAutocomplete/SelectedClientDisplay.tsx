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
      'flex items-center gap-2 p-2 border rounded-md transition-colors touch-manipulation',
      styles.container,
      className
    )}>
      {/* Avatar/Icon */}
      <div className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0',
        styles.avatar
      )}>
        {showLocationIcon ? (
          <MapPin className={cn('h-3.5 w-3.5', styles.icon)} />
        ) : (
          <User className={cn('h-3.5 w-3.5', styles.icon)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-medium text-sm truncate">{value.fullName}</span>
          {styles.badgeLabel && (
            <Badge variant="secondary" className={cn('text-[10px] px-1 py-0 h-4', styles.badge)}>
              {styles.badgeLabel}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {value.phone && (
            <span className="flex items-center gap-0.5">
              <Phone className="h-2.5 w-2.5" />
              {value.phone}
            </span>
          )}
          {showLocationIcon && value.locationName && (
            <span className={cn('flex items-center gap-0.5', styles.icon)}>
              <MapPin className="h-2.5 w-2.5" />
              {value.locationName}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center flex-shrink-0">
        {allowEdit && value.clientState !== 'renewed' && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onStartEdit}
            disabled={disabled}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onClear}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
