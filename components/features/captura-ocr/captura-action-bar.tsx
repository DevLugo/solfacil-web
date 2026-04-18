'use client'

import { Search, CheckCheck, Ban, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  searchTerm: string
  onSearchChange: (term: string) => void
  onSetAllRegular: () => void
  onSetAllFalta: () => void
  onResetToOriginal: () => void
}

export function CapturaActionBar({
  searchTerm,
  onSearchChange,
  onSetAllRegular,
  onSetAllFalta,
  onResetToOriginal,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-[280px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar cliente..."
          className="h-8 pl-8 text-xs"
        />
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={onSetAllRegular}
        >
          <CheckCheck className="h-3.5 w-3.5 text-green-600" />
          Todo Regular
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={onSetAllFalta}
        >
          <Ban className="h-3.5 w-3.5 text-red-600" />
          Todo Falta
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={onResetToOriginal}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset OCR
        </Button>
      </div>
    </div>
  )
}
