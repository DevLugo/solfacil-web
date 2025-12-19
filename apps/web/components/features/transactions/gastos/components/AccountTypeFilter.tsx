'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface AccountTypeFilterProps {
  showExtraTypes: boolean
  onToggle: (value: boolean) => void
}

export function AccountTypeFilter({ showExtraTypes, onToggle }: AccountTypeFilterProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="show-extra-accounts"
        checked={showExtraTypes}
        onCheckedChange={onToggle}
      />
      <Label htmlFor="show-extra-accounts" className="text-sm text-muted-foreground">
        Incluir Banco/Oficina
      </Label>
    </div>
  )
}
