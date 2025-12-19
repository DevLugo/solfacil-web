'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { Loader2, Split } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ROUTES_WITH_ACCOUNTS_QUERY } from '@/graphql/queries/transactions'
import { formatCurrency } from '@/lib/utils'
import { RouteSelector } from './RouteSelector'
import { EXPENSE_TYPES, EXPENSE_TO_ACCOUNT_TYPE } from '../constants'
import { distributeAmount } from '../utils'
import type { AccountType } from '../types'

interface RouteWithAccounts {
  id: string
  name: string
  accounts: {
    id: string
    name: string
    type: string
    amount: string
  }[]
}

interface DistributedExpenseInput {
  routeId: string
  routeName: string
  accountId: string
  accountName: string
  amount: number
}

interface DistributedExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  onSave: (expenses: DistributedExpenseInput[], expenseSource: string) => Promise<void>
  isSaving: boolean
}

export function DistributedExpenseModal({
  open,
  onOpenChange,
  selectedDate,
  onSave,
  isSaving,
}: DistributedExpenseModalProps) {
  const [totalAmount, setTotalAmount] = useState('')
  const [expenseSource, setExpenseSource] = useState('')
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])
  const [preferredAccountType, setPreferredAccountType] = useState<AccountType>('EMPLOYEE_CASH_FUND')

  const { data: routesData, loading: routesLoading } = useQuery(ROUTES_WITH_ACCOUNTS_QUERY, {
    skip: !open,
  })

  const routes: RouteWithAccounts[] = routesData?.routes || []

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTotalAmount('')
      setExpenseSource('')
      setSelectedRouteIds([])
      setPreferredAccountType('EMPLOYEE_CASH_FUND')
    }
  }, [open])

  // Update preferred account type when expense type changes
  useEffect(() => {
    if (expenseSource && EXPENSE_TO_ACCOUNT_TYPE[expenseSource]) {
      setPreferredAccountType(EXPENSE_TO_ACCOUNT_TYPE[expenseSource]!)
    } else {
      setPreferredAccountType('EMPLOYEE_CASH_FUND')
    }
  }, [expenseSource])

  // Calculate distribution preview
  const distributionPreview = useMemo(() => {
    if (!totalAmount || selectedRouteIds.length === 0) return []

    const total = parseFloat(totalAmount) || 0
    const distribution = distributeAmount(total, selectedRouteIds)

    return selectedRouteIds.map((routeId) => {
      const route = routes.find((r) => r.id === routeId)
      const amount = distribution.get(routeId) || 0
      const account = route?.accounts.find((a) => a.type === preferredAccountType) ||
                      route?.accounts.find((a) => a.type === 'EMPLOYEE_CASH_FUND') ||
                      route?.accounts[0]

      return {
        routeId,
        routeName: route?.name || 'Unknown',
        accountId: account?.id || '',
        accountName: account?.name || 'Sin cuenta',
        amount,
      }
    })
  }, [totalAmount, selectedRouteIds, routes, preferredAccountType])

  const handleSave = async () => {
    if (!expenseSource || !totalAmount || distributionPreview.length === 0) return

    // Validate all routes have accounts
    const validExpenses = distributionPreview.filter((e) => e.accountId)
    if (validExpenses.length !== distributionPreview.length) {
      return // Some routes don't have valid accounts
    }

    await onSave(validExpenses, expenseSource)
    onOpenChange(false)
  }

  const isValid =
    expenseSource &&
    totalAmount &&
    parseFloat(totalAmount) > 0 &&
    selectedRouteIds.length > 0 &&
    distributionPreview.every((e) => e.accountId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            Gasto Distribuido
          </DialogTitle>
          <DialogDescription>
            Divide un gasto entre multiples rutas. El monto se distribuira equitativamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Expense Type */}
          <div className="grid gap-2">
            <Label>Tipo de Gasto</Label>
            <Select value={expenseSource} onValueChange={setExpenseSource}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Total Amount */}
          <div className="grid gap-2">
            <Label>Monto Total</Label>
            <Input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Route Selection */}
          <div className="grid gap-2">
            <Label>Rutas a Distribuir</Label>
            {routesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <RouteSelector
                routes={routes}
                selectedRouteIds={selectedRouteIds}
                onSelectionChange={setSelectedRouteIds}
              />
            )}
          </div>

          {/* Distribution Preview */}
          {distributionPreview.length > 0 && (
            <div className="grid gap-2">
              <Label>Vista Previa de Distribucion</Label>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {distributionPreview.map((item) => (
                  <div
                    key={item.routeId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.routeName}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.accountName}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      {formatCurrency(item.amount)}
                    </Badge>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-medium">
                  <span>Total</span>
                  <span className="text-red-700">
                    {formatCurrency(parseFloat(totalAmount) || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Split className="h-4 w-4 mr-2" />
                Distribuir Gasto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
