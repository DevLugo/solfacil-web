'use client'

import { MapPin, Phone, Pencil, X } from 'lucide-react'
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
      'flex items-center gap-2 py-1.5 px-2.5 border rounded-md transition-colors touch-manipulation',
      styles.container,
      className
    )}>
      {/* Content - single line */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-medium text-sm truncate" title={value.fullName}>{value.fullName}</span>
        {value.phone && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Phone className="h-3 w-3" />
            {value.phone}
          </span>
        )}
        {showLocationIcon && value.locationName && (
          <span className={cn('flex items-center gap-1 text-xs flex-shrink-0', styles.icon)}>
            <MapPin className="h-3 w-3" />
            {value.locationName}
          </span>
        )}
        {styles.badgeLabel && (
          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-4 flex-shrink-0', styles.badge)}>
            {styles.badgeLabel}
          </Badge>
        )}
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
            <Pencil className="h-3.5 w-3.5" />
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
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
