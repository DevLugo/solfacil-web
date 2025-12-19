'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function LoanCardSkeleton() {
  return (
    <Card className="border-l-2 border-l-transparent">
      <div className="p-2.5">
        {/* Row 1: Date, Status, Progress */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-12" />
          <div className="flex-1 flex items-center gap-2">
            <Skeleton className="flex-1 h-1.5 rounded-full" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>

        {/* Row 2: Amounts */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </Card>
  )
}

export function LoansListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="mb-4">
      {/* Title */}
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Loan Cards */}
      <div className="flex flex-col gap-1.5">
        {[...Array(count)].map((_, i) => (
          <LoanCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
