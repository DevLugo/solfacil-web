'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Banknote,
  Copy,
  Check,
  RefreshCw,
  User,
  Briefcase,
  MapPin,
  Calendar,
  Filter,
  X,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BankIncomeTransaction {
  id: string
  amount: number
  type: string
  incomeSource?: string
  date: string
  description?: string
  locality?: string
  employeeName?: string
  leaderLocality?: string
  isClientPayment: boolean
  isLeaderPayment: boolean
  name: string
}

interface Route {
  id: string
  name: string
}

interface BankIncomeModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: BankIncomeTransaction[]
  loading: boolean
  onRefresh: () => void
  // Filter props
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  selectedRouteIds: string[]
  onRouteIdsChange: (ids: string[]) => void
  availableRoutes: Route[]
  onlyAbonos: boolean
  onOnlyAbonosChange: (value: boolean) => void
}

// LocalStorage key for confirmed transactions
const STORAGE_KEY = 'bank-income-confirmed-transactions'

// Get confirmed transactions from localStorage
function getStoredConfirmedIds(dateKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${dateKey}`)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch {
    // Ignore errors
  }
  return new Set()
}

// Save confirmed transactions to localStorage
function saveConfirmedIds(dateKey: string, ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${STORAGE_KEY}-${dateKey}`, JSON.stringify([...ids]))
  } catch {
    // Ignore errors
  }
}

export function BankIncomeModal({
  isOpen,
  onClose,
  transactions,
  loading,
  onRefresh,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  selectedRouteIds,
  onRouteIdsChange,
  availableRoutes,
  onlyAbonos,
  onOnlyAbonosChange,
}: BankIncomeModalProps) {
  const [copied, setCopied] = useState(false)
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())

  // Create a date key for localStorage based on the date range
  const dateKey = `${startDate}-${endDate}`

  // Load confirmed IDs from localStorage when modal opens or date changes
  useEffect(() => {
    if (isOpen && dateKey) {
      setConfirmedIds(getStoredConfirmedIds(dateKey))
    }
  }, [isOpen, dateKey])

  // Save to localStorage whenever confirmedIds changes
  useEffect(() => {
    if (dateKey && confirmedIds.size > 0) {
      saveConfirmedIds(dateKey, confirmedIds)
    }
  }, [confirmedIds, dateKey])

  // Calculate totals
  const { totalAmount, totalCount, confirmedCount } = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0)
    const confirmed = transactions.filter((t) => confirmedIds.has(t.id)).length
    return {
      totalAmount: total,
      totalCount: transactions.length,
      confirmedCount: confirmed,
    }
  }, [transactions, confirmedIds])

  const allConfirmed = totalCount > 0 && confirmedCount === totalCount

  // Handle confirm/unconfirm transaction
  const handleToggleConfirm = useCallback((transactionId: string) => {
    setConfirmedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId)
      } else {
        newSet.add(transactionId)
      }
      return newSet
    })
  }, [])

  // Handle confirm all
  const handleConfirmAll = useCallback(
    (confirm: boolean) => {
      if (confirm) {
        setConfirmedIds(new Set(transactions.map((t) => t.id)))
      } else {
        setConfirmedIds(new Set())
      }
    },
    [transactions]
  )

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    const text = formatForCopy(transactions, totalAmount, confirmedCount, totalCount, confirmedIds)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error copying:', err)
    }
  }, [transactions, totalAmount, confirmedCount, totalCount, confirmedIds])

  // Handle route toggle
  const handleRouteToggle = useCallback(
    (routeId: string) => {
      if (selectedRouteIds.includes(routeId)) {
        onRouteIdsChange(selectedRouteIds.filter((id) => id !== routeId))
      } else {
        onRouteIdsChange([...selectedRouteIds, routeId])
      }
    },
    [selectedRouteIds, onRouteIdsChange]
  )

  // Handle select all routes
  const handleSelectAllRoutes = useCallback(() => {
    if (selectedRouteIds.length === availableRoutes.length) {
      onRouteIdsChange([])
    } else {
      onRouteIdsChange(availableRoutes.map((r) => r.id))
    }
  }, [selectedRouteIds, availableRoutes, onRouteIdsChange])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Banknote className="h-5 w-5 text-green-600" />
                Entradas al Banco
              </DialogTitle>
              <DialogDescription className="mt-1">
                {totalCount} transacciones - ${totalAmount.toFixed(2)}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className={cn(copied && 'bg-green-50 border-green-200')}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filters Section */}
        <div className="py-4 border-b space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtros
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Routes */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Rutas ({selectedRouteIds.length}/{availableRoutes.length})
              </Label>
              <ScrollArea className="h-24 border rounded-md p-2">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium pb-1 border-b">
                    <Checkbox
                      checked={selectedRouteIds.length === availableRoutes.length}
                      onCheckedChange={() => handleSelectAllRoutes()}
                    />
                    Seleccionar todas
                  </label>
                  {availableRoutes.map((route) => (
                    <label
                      key={route.id}
                      className="flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={selectedRouteIds.includes(route.id)}
                        onCheckedChange={() => handleRouteToggle(route.id)}
                      />
                      {route.name}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={onlyAbonos}
                  onCheckedChange={(checked) => onOnlyAbonosChange(!!checked)}
                />
                Solo abonos
              </label>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="py-3 grid grid-cols-3 gap-4 border-b">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-xs text-muted-foreground">Transacciones</div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-bold',
                confirmedCount === totalCount && totalCount > 0
                  ? 'text-green-600'
                  : 'text-amber-600'
              )}
            >
              {confirmedCount}/{totalCount}
            </div>
            <div className="text-xs text-muted-foreground">Confirmadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Transactions List */}
        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : selectedRouteIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Filter className="h-12 w-12 mb-4 opacity-50" />
              <p>Selecciona al menos una ruta para ver las transacciones</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Banknote className="h-12 w-12 mb-4 opacity-50" />
              <p>No hay entradas al banco en este periodo</p>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              {/* Confirm All Header */}
              {transactions.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-3">
                  <span className="text-sm font-medium">Entradas al Banco</span>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={allConfirmed}
                      onCheckedChange={(checked) => handleConfirmAll(!!checked)}
                    />
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Confirmar todas
                  </label>
                </div>
              )}

              {transactions.map((transaction) => {
                const isConfirmed = confirmedIds.has(transaction.id)
                const typeColor = transaction.isClientPayment
                  ? 'text-green-600'
                  : transaction.isLeaderPayment
                    ? 'text-blue-600'
                    : 'text-gray-600'
                const typeIcon = transaction.isClientPayment ? (
                  <User className="h-3 w-3" />
                ) : (
                  <Briefcase className="h-3 w-3" />
                )
                const typeLabel = transaction.isClientPayment
                  ? 'Cliente'
                  : transaction.isLeaderPayment
                    ? 'Lider'
                    : 'Otro'

                return (
                  <div
                    key={transaction.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 transition-colors',
                      isConfirmed
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
                        : 'bg-background border-border'
                    )}
                  >
                    <Checkbox
                      checked={isConfirmed}
                      onCheckedChange={() => handleToggleConfirm(transaction.id)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn('text-xs gap-1', typeColor)}>
                          {typeIcon}
                          {typeLabel}
                        </Badge>
                        {isConfirmed && (
                          <Badge
                            variant="outline"
                            className="text-xs gap-1 bg-green-50 border-green-200 text-green-700"
                          >
                            <Check className="h-3 w-3" />
                            Confirmado
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium truncate">{transaction.name}</p>
                      {transaction.leaderLocality && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {transaction.leaderLocality}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(transaction.date), 'dd MMM', { locale: es })}
                      </p>
                      <p className={cn('font-bold', typeColor)}>
                        ${transaction.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// Format transactions for clipboard
function formatForCopy(
  transactions: BankIncomeTransaction[],
  totalAmount: number,
  confirmedCount: number,
  totalCount: number,
  confirmedIds: Set<string>
): string {
  let text = `ENTRADAS AL BANCO - RESUMEN\n`
  text += `Total: $${totalAmount.toFixed(2)} (${totalCount} transacciones)\n`
  text += `Confirmadas: ${confirmedCount}/${totalCount}\n\n`

  text += `Entradas al Banco\n`
  transactions.forEach((t) => {
    const date = format(new Date(t.date), 'dd/MM/yyyy')
    const confirmed = confirmedIds.has(t.id) ? ' [OK]' : ''
    text += `- ${t.name}, ${date}, $${t.amount.toFixed(2)}${confirmed}\n`
  })

  return text
}
