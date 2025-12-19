'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useMutation } from '@apollo/client'
import { CREATE_TRANSACTION } from '@/graphql/mutations/transactions'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { Account, TransferFormData } from '../types'
import {
  getAvailableBalance,
  validateAmount,
  validateTransferForm,
  getDestinationOptions,
  getInitialFormData,
} from '../utils'
import { TRANSACTION_TYPES, INCOME_SOURCES } from '../constants'

interface UseTransferFormParams {
  selectedRouteId: string | null
  selectedLeadId: string | null
  selectedDate: Date
  accounts: Account[]
  onSuccess: () => void
}

interface UseTransferFormResult {
  // Form data
  formData: TransferFormData
  // Setters
  setIsCapitalInvestment: (value: boolean) => void
  setSourceAccountId: (value: string) => void
  setDestinationAccountId: (value: string) => void
  setAmount: (value: string) => void
  setDescription: (value: string) => void
  // State
  isSubmitting: boolean
  showSuccessDialog: boolean
  setShowSuccessDialog: (value: boolean) => void
  // Validation
  isAmountValid: boolean
  isFormValid: boolean
  availableBalance: number
  // Options
  destinationOptions: Account[]
  sourceAccount: Account | undefined
  // Actions
  handleSubmit: () => Promise<void>
  resetForm: () => void
}

export function useTransferForm({
  selectedRouteId,
  selectedLeadId,
  selectedDate,
  accounts,
  onSuccess,
}: UseTransferFormParams): UseTransferFormResult {
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState<TransferFormData>(getInitialFormData())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  // Mutation
  const [createTransaction] = useMutation(CREATE_TRANSACTION)

  // Reset form when route changes
  useEffect(() => {
    setFormData(getInitialFormData())
  }, [selectedRouteId])

  // Reset source account when capital investment is toggled
  useEffect(() => {
    if (formData.isCapitalInvestment) {
      setFormData((prev) => ({ ...prev, sourceAccountId: '' }))
    }
  }, [formData.isCapitalInvestment])

  // Get source account data
  const sourceAccount = useMemo(() => {
    return accounts.find((acc) => acc.id === formData.sourceAccountId)
  }, [accounts, formData.sourceAccountId])

  // Available balance from source account
  const availableBalance = useMemo(() => {
    return getAvailableBalance(accounts, formData.sourceAccountId)
  }, [accounts, formData.sourceAccountId])

  // Validate amount against available balance (only for transfers)
  const isAmountValid = useMemo(() => {
    return validateAmount(formData.amount, availableBalance, formData.isCapitalInvestment)
  }, [formData.amount, availableBalance, formData.isCapitalInvestment])

  // Filter destination accounts
  const destinationOptions = useMemo(() => {
    return getDestinationOptions(accounts, formData.sourceAccountId)
  }, [accounts, formData.sourceAccountId])

  // Form validation
  const isFormValid = useMemo(() => {
    return validateTransferForm(formData, selectedRouteId, isAmountValid)
  }, [formData, selectedRouteId, isAmountValid])

  // Setters
  const setIsCapitalInvestment = useCallback((value: boolean) => {
    setFormData((prev) => ({ ...prev, isCapitalInvestment: value }))
  }, [])

  const setSourceAccountId = useCallback((value: string) => {
    setFormData((prev) => {
      // If source equals destination, clear destination
      const newDestination = value === prev.destinationAccountId ? '' : prev.destinationAccountId
      return { ...prev, sourceAccountId: value, destinationAccountId: newDestination }
    })
  }, [])

  const setDestinationAccountId = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, destinationAccountId: value }))
  }, [])

  const setAmount = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, amount: value }))
  }, [])

  const setDescription = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, description: value }))
  }, [])

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData())
  }, [])

  // Handle transfer/investment submission
  const handleSubmit = useCallback(async () => {
    if (!isFormValid || !selectedRouteId) return

    setIsSubmitting(true)

    try {
      const numericAmount = parseFloat(formData.amount)

      if (formData.isCapitalInvestment) {
        // Create capital investment (INCOME transaction)
        await createTransaction({
          variables: {
            input: {
              amount: numericAmount.toString(),
              date: selectedDate.toISOString(),
              type: TRANSACTION_TYPES.INCOME,
              incomeSource: INCOME_SOURCES.MONEY_INVESTMENT,
              destinationAccountId: formData.destinationAccountId,
              routeId: selectedRouteId,
              leadId: selectedLeadId || undefined,
            },
          },
        })

        toast({
          title: 'Inversion registrada',
          description: `Se registro una inversion de ${formatCurrency(numericAmount)}.`,
        })
      } else {
        // Create transfer between accounts
        await createTransaction({
          variables: {
            input: {
              amount: numericAmount.toString(),
              date: selectedDate.toISOString(),
              type: TRANSACTION_TYPES.TRANSFER,
              sourceAccountId: formData.sourceAccountId,
              destinationAccountId: formData.destinationAccountId,
              routeId: selectedRouteId,
              leadId: selectedLeadId || undefined,
            },
          },
        })

        toast({
          title: 'Transferencia registrada',
          description: `Se transfirio ${formatCurrency(numericAmount)} entre cuentas.`,
        })
      }

      // Reset form and show success
      resetForm()
      setShowSuccessDialog(true)

      // Notify parent
      onSuccess()
    } catch (error) {
      console.error('Error al crear transaccion:', error)
      toast({
        title: 'Error',
        description: 'No se pudo completar la operacion. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isFormValid,
    selectedRouteId,
    selectedLeadId,
    selectedDate,
    formData,
    createTransaction,
    toast,
    resetForm,
    onSuccess,
  ])

  return {
    formData,
    setIsCapitalInvestment,
    setSourceAccountId,
    setDestinationAccountId,
    setAmount,
    setDescription,
    isSubmitting,
    showSuccessDialog,
    setShowSuccessDialog,
    isAmountValid,
    isFormValid,
    availableBalance,
    destinationOptions,
    sourceAccount,
    handleSubmit,
    resetForm,
  }
}
