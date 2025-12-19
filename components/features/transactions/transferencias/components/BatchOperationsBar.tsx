'use client'

import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DrainRoutesModal } from './DrainRoutesModal'
import { DistributeMoneyModal } from './DistributeMoneyModal'

interface BatchOperationsBarProps {
  onSuccess: () => Promise<void>
}

export function BatchOperationsBar({ onSuccess }: BatchOperationsBarProps) {
  const [isDrainModalOpen, setIsDrainModalOpen] = useState(false)
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false)

  return (
    <>
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Operaciones masivas
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDrainModalOpen(true)}
              >
                <ArrowUpFromLine className="h-4 w-4 mr-2" />
                Vaciar Rutas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDistributeModalOpen(true)}
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Distribuir Dinero
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DrainRoutesModal
        open={isDrainModalOpen}
        onOpenChange={setIsDrainModalOpen}
        onSuccess={onSuccess}
      />

      <DistributeMoneyModal
        open={isDistributeModalOpen}
        onOpenChange={setIsDistributeModalOpen}
        onSuccess={onSuccess}
      />
    </>
  )
}
