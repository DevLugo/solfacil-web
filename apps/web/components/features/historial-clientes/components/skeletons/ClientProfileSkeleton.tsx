'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function ClientProfileSkeleton() {
  return (
    <Card className="mb-4">
      <CardContent className="p-3 space-y-3">
        {/* Client Header */}
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-40 mb-1.5" />
            <Skeleton className="h-3 w-28 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Leader Info */}
        <div className="pl-2 border-l-2 border-muted">
          <Skeleton className="h-3 w-24 mb-1" />
          <Skeleton className="h-3 w-40" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Skeleton className="h-4 w-4 flex-shrink-0" />
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-2 w-12" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
