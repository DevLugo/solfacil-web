'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface TransactionContextType {
  selectedRouteId: string | null
  selectedLeadId: string | null
  selectedLocationId: string | null
  selectedLocationName: string | null
  selectedDate: Date
  setSelectedRouteId: (id: string | null) => void
  setSelectedLeadId: (id: string | null) => void
  setSelectedLocationId: (id: string | null) => void
  setSelectedLocationName: (name: string | null) => void
  setSelectedDate: (date: Date) => void
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  return (
    <TransactionContext.Provider
      value={{
        selectedRouteId,
        selectedLeadId,
        selectedLocationId,
        selectedLocationName,
        selectedDate,
        setSelectedRouteId,
        setSelectedLeadId,
        setSelectedLocationId,
        setSelectedLocationName,
        setSelectedDate,
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransactionContext() {
  const context = useContext(TransactionContext)
  if (context === undefined) {
    throw new Error('useTransactionContext must be used within a TransactionProvider')
  }
  return context
}
