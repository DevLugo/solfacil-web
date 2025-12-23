'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLazyQuery } from '@apollo/client'
import { User, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { SEARCH_BORROWERS_QUERY, SEARCH_PERSONAL_DATA_QUERY } from '@/graphql/queries/transactions'
import { useClientMutations } from './hooks/useClientMutations'
import { NewClientForm } from './NewClientForm'
import { EditClientForm } from './EditClientForm'
import { SelectedClientDisplay } from './SelectedClientDisplay'
import { ClientSearchItem } from './ClientSearchItem'
import type { UnifiedClientAutocompleteProps } from './types'
import type { BorrowerSearchResult, PersonalData, UnifiedClientValue, ActiveLoanData, PreviousLoan } from '../../types'

// Re-export types for convenience
export type { ClientState, ClientAction, UnifiedClientValue } from '../../types'

export function UnifiedClientAutocomplete({
  mode,
  value,
  onValueChange,
  leadId,
  excludeBorrowerId,
  excludeBorrowerIds,
  locationId,
  activeLoansForRenewal = [],
  placeholder,
  disabled = false,
  allowCreate = true,
  allowEdit = true,
  className,
}: UnifiedClientAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [isEditSaving, setIsEditSaving] = useState(false)

  const { updateBorrower, updatePersonalData, updatePhone } = useClientMutations()

  const defaultPlaceholder = mode === 'borrower' ? 'Buscar cliente...' : 'Buscar aval...'

  // Queries
  const [searchBorrowers, { data: borrowerData, loading: borrowerLoading }] = useLazyQuery(
    SEARCH_BORROWERS_QUERY,
    { fetchPolicy: 'network-only' }
  )

  const [searchPersonalData, { data: personalDataData, loading: personalDataLoading }] = useLazyQuery(
    SEARCH_PERSONAL_DATA_QUERY,
    { fetchPolicy: 'network-only' }
  )

  const loading = mode === 'borrower' ? borrowerLoading : personalDataLoading

  // Create lookup map of active loans by borrower ID
  const activeLoansByBorrowerId = useMemo(() => {
    const map = new Map<string, PreviousLoan>()
    if (mode === 'borrower' && activeLoansForRenewal.length > 0) {
      for (const loan of activeLoansForRenewal) {
        if (!map.has(loan.borrower.id)) {
          map.set(loan.borrower.id, loan)
        }
      }
    }
    return map
  }, [activeLoansForRenewal, mode])

  // Default options: clients with active loans
  const defaultActiveLoansOptions = useMemo((): UnifiedClientValue[] => {
    if (mode !== 'borrower' || activeLoansForRenewal.length === 0) return []

    const uniqueBorrowers = new Map<string, PreviousLoan>()
    for (const loan of activeLoansForRenewal) {
      // Skip if borrower is in the exclude list (already in pending loans)
      if (excludeBorrowerIds?.has(loan.borrower.id)) continue

      if (!uniqueBorrowers.has(loan.borrower.id)) {
        uniqueBorrowers.set(loan.borrower.id, loan)
      }
    }

    return Array.from(uniqueBorrowers.values()).map((loan): UnifiedClientValue => {
      const leadLocation = loan.lead?.personalData?.addresses?.[0]?.location
      const borrowerLocation = loan.borrower.personalData?.addresses?.[0]?.location

      // Use borrower's location if available, otherwise fallback to lead's location
      const finalLocationId = borrowerLocation?.id || leadLocation?.id
      const finalLocationName = borrowerLocation?.name || leadLocation?.name

      // isFromCurrentLocation: true if no locationId filter, no location found, or locations match
      const isFromCurrentLocation = !locationId || !finalLocationId || finalLocationId === locationId

      return {
        id: loan.borrower.id,
        personalDataId: loan.borrower.personalData?.id,
        phoneId: loan.borrower.personalData?.phones?.[0]?.id,
        fullName: loan.borrower.personalData?.fullName || 'Sin nombre',
        phone: loan.borrower.personalData?.phones?.[0]?.number,
        locationId: finalLocationId,
        locationName: finalLocationName,
        isFromCurrentLocation,
        loanFinishedCount: loan.borrower.loanFinishedCount,
        hasActiveLoans: true,
        pendingDebtAmount: parseFloat(loan.pendingAmountStored || '0'),
        activeLoan: {
          id: loan.id,
          requestedAmount: loan.requestedAmount,
          amountGived: loan.amountGived,
          pendingAmountStored: loan.pendingAmountStored,
          expectedWeeklyPayment: loan.expectedWeeklyPayment,
          totalPaid: loan.totalPaid,
          loantype: loan.loantype,
          collaterals: loan.collaterals,
          leadLocationName: leadLocation?.name,
        },
        clientState: 'existing',
        action: 'connect',
      }
    })
  }, [activeLoansForRenewal, mode, locationId, excludeBorrowerIds])

  // Debounce search
  useEffect(() => {
    if (searchTerm.length < 2) return

    const timer = setTimeout(() => {
      if (mode === 'borrower') {
        searchBorrowers({
          variables: { searchTerm, locationId, limit: 20 },
        })
      } else {
        searchPersonalData({
          variables: { searchTerm, excludeBorrowerId, locationId, limit: 20 },
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, searchBorrowers, searchPersonalData, locationId, excludeBorrowerId, mode])

  // Transform results to unified format
  const results = useMemo(() => {
    if (mode === 'borrower') {
      const borrowers: BorrowerSearchResult[] = borrowerData?.searchBorrowers || []
      // Filter out excluded borrowers (already in pending loans)
      const filteredBorrowers = excludeBorrowerIds
        ? borrowers.filter((b) => !excludeBorrowerIds.has(b.id))
        : borrowers
      return filteredBorrowers.map((b): UnifiedClientValue => {
        const activeLoan = activeLoansByBorrowerId.get(b.id)
        let activeLoanData: ActiveLoanData | undefined

        if (activeLoan) {
          const leadLocation = activeLoan.lead?.personalData?.addresses?.[0]?.location
          activeLoanData = {
            id: activeLoan.id,
            requestedAmount: activeLoan.requestedAmount,
            amountGived: activeLoan.amountGived,
            pendingAmountStored: activeLoan.pendingAmountStored,
            expectedWeeklyPayment: activeLoan.expectedWeeklyPayment,
            totalPaid: activeLoan.totalPaid,
            loantype: activeLoan.loantype,
            collaterals: activeLoan.collaterals,
            leadLocationName: leadLocation?.name,
          }
        }

        const borrowerLocationName = b.locationName || b.personalData?.addresses?.[0]?.location?.name
        const borrowerLocationId = b.locationId || b.personalData?.addresses?.[0]?.location?.id

        return {
          id: b.id,
          personalDataId: b.personalData.id,
          phoneId: b.personalData.phones[0]?.id,
          fullName: b.personalData.fullName,
          phone: b.personalData.phones[0]?.number,
          locationId: borrowerLocationId,
          locationName: borrowerLocationName,
          isFromCurrentLocation: b.isFromCurrentLocation,
          loanFinishedCount: b.loanFinishedCount,
          hasActiveLoans: b.hasActiveLoans || !!activeLoan,
          pendingDebtAmount: activeLoan
            ? parseFloat(activeLoan.pendingAmountStored || '0')
            : b.pendingDebtAmount ? parseFloat(b.pendingDebtAmount) : undefined,
          activeLoan: activeLoanData,
          clientState: 'existing',
          action: 'connect',
        }
      })
    } else {
      const personalData: PersonalData[] = personalDataData?.searchPersonalData || []
      return personalData.map((p): UnifiedClientValue => {
        const personLocationId = p.addresses?.[0]?.location?.id
        const personLocationName = p.addresses?.[0]?.location?.name
        // isFromCurrentLocation: true if no locationId filter, no location found, or locations match
        const isFromCurrentLocation = !locationId || !personLocationId || personLocationId === locationId
        return {
          id: p.id,
          personalDataId: p.id,
          phoneId: p.phones[0]?.id,
          fullName: p.fullName,
          phone: p.phones[0]?.number,
          locationId: personLocationId,
          locationName: personLocationName,
          isFromCurrentLocation,
          clientState: 'existing',
          action: 'connect',
        }
      })
    }
  }, [mode, borrowerData, personalDataData, locationId, activeLoansByBorrowerId, excludeBorrowerIds])

  // Separate by location
  const fromCurrentLocation = results.filter((r) => r.isFromCurrentLocation)
  const fromOtherLocations = results.filter((r) => !r.isFromCurrentLocation)

  // Handle selecting existing client
  const handleSelect = useCallback(
    (client: UnifiedClientValue) => {
      onValueChange({
        ...client,
        originalFullName: client.fullName,
        originalPhone: client.phone,
        clientState: 'existing',
        action: 'connect',
      })
      setOpen(false)
      setSearchTerm('')
      setIsCreatingNew(false)
    },
    [onValueChange]
  )

  // Handle creating new client
  const handleCreateNew = useCallback(() => {
    setIsCreatingNew(true)
    setNewClientName(searchTerm)
    setNewClientPhone('')
    setOpen(false)
  }, [searchTerm])

  // Confirm new client creation
  const handleConfirmNewClient = useCallback(() => {
    if (!newClientName.trim()) return

    onValueChange({
      fullName: newClientName.trim(),
      phone: newClientPhone.trim() || undefined,
      isFromCurrentLocation: true,
      locationId: locationId || undefined,
      clientState: 'newClient',
      action: 'create',
    })
    setIsCreatingNew(false)
    setNewClientName('')
    setNewClientPhone('')
  }, [newClientName, newClientPhone, locationId, onValueChange])

  // Cancel new client creation
  const handleCancelNewClient = useCallback(() => {
    setIsCreatingNew(false)
    setNewClientName('')
    setNewClientPhone('')
  }, [])

  // Start editing
  const handleStartEdit = useCallback(() => {
    if (value) {
      setEditName(value.fullName)
      setEditPhone(value.phone || '')
      setIsEditing(true)
    }
  }, [value])

  // Confirm edit with mutation
  const handleConfirmEdit = useCallback(async () => {
    if (!value || !editName.trim()) return

    const nameChanged = editName.trim().toUpperCase() !== (value.originalFullName || '').toUpperCase()
    const phoneChanged = editPhone.trim() !== (value.originalPhone || '')
    const hasChanges = nameChanged || phoneChanged

    if (!hasChanges) {
      setIsEditing(false)
      return
    }

    // For existing clients, make real-time mutations
    if (value.id && value.clientState !== 'newClient') {
      setIsEditSaving(true)
      try {
        if (nameChanged) {
          if (mode === 'borrower') {
            await updateBorrower({
              variables: {
                id: value.id,
                input: { personalData: { fullName: editName.trim().toUpperCase() } },
              },
            })
          } else {
            await updatePersonalData({
              variables: { id: value.id, fullName: editName.trim().toUpperCase() },
            })
          }
        }

        if (phoneChanged && value.personalDataId) {
          await updatePhone({
            variables: {
              input: {
                personalDataId: value.personalDataId,
                phoneId: value.phoneId || null,
                number: editPhone.trim(),
              },
            },
          })
        }

        onValueChange({
          ...value,
          fullName: editName.trim().toUpperCase(),
          phone: editPhone.trim() || undefined,
          originalFullName: editName.trim().toUpperCase(),
          originalPhone: editPhone.trim() || undefined,
          clientState: 'edited',
          action: 'connect',
        })
      } catch (error) {
        console.error('Error updating client:', error)
        alert('Error al actualizar la información del cliente')
      } finally {
        setIsEditSaving(false)
      }
    } else {
      // For new clients, just update local state
      onValueChange({
        ...value,
        fullName: editName.trim().toUpperCase(),
        phone: editPhone.trim() || undefined,
        clientState: value.clientState === 'newClient' ? 'newClient' : 'edited',
        action: value.clientState === 'newClient' ? 'create' : 'update',
      })
    }

    setIsEditing(false)
  }, [value, editName, editPhone, onValueChange, mode, updateBorrower, updatePersonalData, updatePhone])

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditName('')
    setEditPhone('')
  }, [])

  // Clear selection
  const handleClear = useCallback(() => {
    onValueChange(null)
    setIsCreatingNew(false)
    setIsEditing(false)
  }, [onValueChange])

  // Render new client form
  if (isCreatingNew) {
    return (
      <NewClientForm
        mode={mode}
        name={newClientName}
        phone={newClientPhone}
        onNameChange={setNewClientName}
        onPhoneChange={setNewClientPhone}
        onConfirm={handleConfirmNewClient}
        onCancel={handleCancelNewClient}
        className={className}
      />
    )
  }

  // Render editing form
  if (isEditing && value) {
    return (
      <EditClientForm
        mode={mode}
        name={editName}
        phone={editPhone}
        isSaving={isEditSaving}
        onNameChange={setEditName}
        onPhoneChange={setEditPhone}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
        className={className}
      />
    )
  }

  // Render selected value display
  if (value) {
    return (
      <SelectedClientDisplay
        value={value}
        allowEdit={allowEdit}
        disabled={disabled}
        onStartEdit={handleStartEdit}
        onClear={handleClear}
        className={className}
      />
    )
  }

  // Render search popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-8 px-2.5 font-normal text-sm touch-manipulation',
            className
          )}
          disabled={disabled}
        >
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {placeholder || defaultPlaceholder}
          </span>
          <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width)', minWidth: '300px' }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Escribe para buscar..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="h-9 text-sm"
          />
          <CommandList className="max-h-[45vh]">
            {loading && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Buscando...
              </div>
            )}

            {!loading && searchTerm.length >= 2 && results.length === 0 && (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-4">
                  <span className="text-sm">No se encontraron resultados</span>
                  {allowCreate && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateNew}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 h-8 px-3 text-sm touch-manipulation"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Crear nuevo {mode === 'borrower' ? 'cliente' : 'aval'}
                    </Button>
                  )}
                </div>
              </CommandEmpty>
            )}

            {!loading && searchTerm.length < 2 && defaultActiveLoansOptions.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Escribe al menos 2 caracteres
              </div>
            )}

            {/* Show default active loans when no search term */}
            {!loading && searchTerm.length < 2 && defaultActiveLoansOptions.length > 0 && (
              <CommandGroup heading="Clientes con préstamo activo">
                {defaultActiveLoansOptions.map((client) => (
                  <ClientSearchItem
                    key={client.id}
                    client={client}
                    mode={mode}
                    variant="active-loan"
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            )}

            {fromCurrentLocation.length > 0 && (
              <CommandGroup heading="De esta localidad">
                {fromCurrentLocation.map((client) => (
                  <ClientSearchItem
                    key={client.id}
                    client={client}
                    mode={mode}
                    variant="current-location"
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            )}

            {fromCurrentLocation.length > 0 && fromOtherLocations.length > 0 && (
              <CommandSeparator />
            )}

            {fromOtherLocations.length > 0 && (
              <CommandGroup heading="Otras localidades">
                {fromOtherLocations.map((client) => (
                  <ClientSearchItem
                    key={client.id}
                    client={client}
                    mode={mode}
                    variant="other-location"
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            )}

            {/* Option to create new at bottom */}
            {allowCreate && searchTerm.length >= 2 && results.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateNew}
                    className="text-blue-600 py-2 px-2 text-sm data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 dark:data-[selected=true]:bg-blue-950/50 touch-manipulation"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Crear nuevo {mode === 'borrower' ? 'cliente' : 'aval'}: &quot;{searchTerm}&quot;
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
