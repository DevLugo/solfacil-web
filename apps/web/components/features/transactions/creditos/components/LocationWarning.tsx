'use client'

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface LocationWarningProps {
  type: 'borrower' | 'aval' | 'renewal'
  locationName?: string
}

export function LocationWarning({ type, locationName }: LocationWarningProps) {
  const messages = {
    borrower: 'Este cliente es de otra localidad',
    aval: 'Este aval es de otra localidad',
    renewal: 'Este préstamo es de otra localidad',
  }

  return (
    <Alert variant="default" className="bg-yellow-50 border-yellow-200">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        {messages[type]}
        {locationName && <span className="font-medium"> ({locationName})</span>}
      </AlertDescription>
    </Alert>
  )
}
