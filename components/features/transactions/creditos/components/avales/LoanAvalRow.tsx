'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Check, Loader2, X, UserRound, ShieldCheck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { UPDATE_LOAN_EXTENDED } from '@/graphql/mutations/transactions'
import { AvalSearchInput } from './AvalSearchInput'
import { InlineEditField } from './InlineEditField'
import type { LoanForAval, CreatePersonalDataInput } from '../../types'
import { isAvalCaptured } from '../../types'

interface LoanAvalRowProps {
  loan: LoanForAval
  onUpdated: () => void
}

export function LoanAvalRow({ loan, onUpdated }: LoanAvalRowProps) {
  const [replacingAval, setReplacingAval] = useState(false)
  const [avalAction, setAvalAction] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const collateral = loan.collaterals[0]
  const captured = isAvalCaptured(loan)
  const hasAval = loan.collaterals.length > 0
  const leadLocation = loan.lead?.location
  const borrowerPhone = loan.borrower.personalData.phones[0]?.number || ''

  const [updateLoan] = useMutation(UPDATE_LOAN_EXTENDED)

  const saveField = async (field: string, value: string) => {
    await updateLoan({
      variables: { id: loan.id, input: { [field]: value } },
    })
    onUpdated()
  }

  const handleSelectExisting = async (personalDataId: string) => {
    setAvalAction('saving')
    try {
      await updateLoan({
        variables: {
          id: loan.id,
          input: { collateralIds: [personalDataId] },
        },
      })
      setAvalAction('saved')
      setReplacingAval(false)
      setTimeout(() => setAvalAction('idle'), 1500)
      onUpdated()
    } catch {
      setAvalAction('error')
    }
  }

  const handleCreateNew = async (name: string, phone: string) => {
    setAvalAction('saving')
    try {
      const newCollateral: CreatePersonalDataInput = {
        fullName: name,
        ...(phone && { phones: [{ number: phone }] }),
        ...(leadLocation && {
          addresses: [{ street: '', locationId: leadLocation.id }],
        }),
      }
      await updateLoan({
        variables: {
          id: loan.id,
          input: { newCollateral },
        },
      })
      setAvalAction('saved')
      setReplacingAval(false)
      setTimeout(() => setAvalAction('idle'), 1500)
      onUpdated()
    } catch {
      setAvalAction('error')
    }
  }

  const handleConfirm = async () => {
    if (!hasAval) return
    setAvalAction('saving')
    try {
      await updateLoan({
        variables: {
          id: loan.id,
          input: { collateralIds: loan.collaterals.map((c) => c.id) },
        },
      })
      setAvalAction('saved')
      setTimeout(() => setAvalAction('idle'), 1500)
      onUpdated()
    } catch {
      setAvalAction('error')
    }
  }

  const showSearch = !hasAval || replacingAval

  const renderAvalContent = () => {
    if (avalAction === 'saving') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Guardando...</span>
        </div>
      )
    }
    if (avalAction === 'saved') {
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-600 py-1">
          <Check className="h-3.5 w-3.5" />
          <span>Guardado</span>
        </div>
      )
    }
    if (avalAction === 'error') {
      return (
        <div className="flex items-center gap-2 text-sm py-1">
          <span className="text-red-500 text-xs">Error al guardar</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setAvalAction('idle')}
          >
            Reintentar
          </Button>
        </div>
      )
    }
    if (showSearch) {
      return (
        <AvalSearchInput
          locationId={leadLocation?.id}
          excludeBorrowerId={loan.borrower.personalData.id}
          onSelect={handleSelectExisting}
          onCreate={handleCreateNew}
          onCancel={replacingAval ? () => setReplacingAval(false) : undefined}
        />
      )
    }
    return (
      <div className="flex items-center gap-2 min-w-0">
        <InlineEditField
          value={collateral.fullName}
          onSave={(v) => saveField('collateralName', v)}
          placeholder="Nombre"
          className="text-sm font-medium max-w-[180px]"
        />
        <InlineEditField
          value={collateral.phones[0]?.number || ''}
          onSave={(v) => saveField('collateralPhone', v)}
          placeholder="Tel."
          className="text-xs text-muted-foreground w-28"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => setReplacingAval(true)}
          title="Cambiar aval"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative px-4 py-3 transition-colors',
        captured
          ? 'bg-emerald-50/40 dark:bg-emerald-950/10'
          : 'hover:bg-muted/30',
      )}
    >
      {/* Status indicator - left bar */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1 transition-colors',
        captured ? 'bg-emerald-500' : hasAval ? 'bg-amber-400' : 'bg-red-300',
      )} />

      <div className="grid grid-cols-[1fr,auto,1fr,auto] items-center gap-3">
        {/* Titular section */}
        <div className="flex items-center gap-2 min-w-0">
          <UserRound className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <InlineEditField
              value={loan.borrower.personalData.fullName}
              onSave={(v) => saveField('borrowerName', v)}
              placeholder="Nombre"
              className="text-sm font-medium max-w-[180px]"
            />
            <InlineEditField
              value={borrowerPhone}
              onSave={(v) => saveField('borrowerPhone', v)}
              placeholder="Tel."
              className="text-xs text-muted-foreground w-28"
            />
          </div>
        </div>

        {/* Loan info - center divider */}
        <div className="flex items-center gap-1.5 px-2 shrink-0">
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {formatCurrency(parseFloat(loan.requestedAmount))}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
        </div>

        {/* Aval section */}
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className={cn(
            'h-4 w-4 shrink-0',
            captured ? 'text-emerald-500' : hasAval ? 'text-amber-500' : 'text-muted-foreground/40',
          )} />
          <div className="flex-1 min-w-0">
            {renderAvalContent()}
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 w-20 flex justify-end">
          {captured ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              Listo
            </span>
          ) : hasAval && avalAction === 'idle' && !replacingAval ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              onClick={handleConfirm}
            >
              Confirmar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
