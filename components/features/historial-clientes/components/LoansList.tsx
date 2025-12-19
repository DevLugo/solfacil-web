'use client'

import { useState, useMemo } from 'react'
import { User, ShieldCheck } from 'lucide-react'
import { LoanCard } from './LoanCard'
import { PaymentHistoryModal } from './PaymentHistoryModal'
import type { LoanHistoryDetail } from '../types'

interface LoansListProps {
  loans: LoanHistoryDetail[]
  title?: string
  isCollateral?: boolean
}

export function LoansList({
  loans,
  title = 'Préstamos como Cliente',
  isCollateral = false,
}: LoansListProps) {
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null)

  // Sort loans by date (most recent first)
  const sortedLoans = useMemo(() => {
    return [...loans].sort(
      (a, b) => new Date(b.signDate).getTime() - new Date(a.signDate).getTime()
    )
  }, [loans])

  const toggleLoanExpand = (loanId: string) => {
    setExpandedLoanId(expandedLoanId === loanId ? null : loanId)
  }

  const expandedLoan = sortedLoans.find((loan) => loan.id === expandedLoanId)

  const Icon = isCollateral ? ShieldCheck : User

  if (sortedLoans.length === 0) {
    return (
      <div className="mb-4">
        <h2 className="text-sm font-medium flex items-center gap-2 mb-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          {title} (0)
        </h2>
        <div className="text-xs text-center py-4 text-muted-foreground border rounded-lg bg-muted/30">
          No hay préstamos registrados
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      {/* Title */}
      <h2 className="text-sm font-medium flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title} ({sortedLoans.length})
      </h2>

      {/* Loans List */}
      <div className="flex flex-col gap-1.5">
        {sortedLoans.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            isExpanded={expandedLoanId === loan.id}
            onToggleExpand={() => toggleLoanExpand(loan.id)}
            isCollateral={isCollateral}
          />
        ))}
      </div>

      {/* Payment History Modal */}
      {expandedLoan && (
        <PaymentHistoryModal
          loan={expandedLoan}
          isOpen={!!expandedLoanId}
          onClose={() => setExpandedLoanId(null)}
        />
      )}
    </div>
  )
}
