import { MapPin } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface LocalityWithLeader {
  id: string
  name: string
  leaderName: string
  leaderId: string
}

interface LocalityCheckboxProps {
  locality: LocalityWithLeader
  checked: boolean
  onToggle: () => void
}

export function LocalityCheckbox({ locality, checked, onToggle }: LocalityCheckboxProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all hover:bg-muted',
        checked && 'border-primary bg-primary/5'
      )}
      onClick={onToggle}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight break-words">{locality.name}</p>
            <p className="text-xs text-muted-foreground italic mt-0.5 break-words">
              {locality.leaderName}
            </p>
          </div>
        </div>
      </div>
    </label>
  )
}
