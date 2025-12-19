'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function SearchBarSkeleton() {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-4 w-full max-w-md mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-11 md:h-12 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10 hidden sm:block" />
            <Skeleton className="h-10 hidden sm:block" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
