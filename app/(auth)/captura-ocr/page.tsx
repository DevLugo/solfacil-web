'use client'

import { useState, useEffect, useCallback } from 'react'
import { startOfWeek, format, parseISO, isValid } from 'date-fns'
import { useSearchParams, useRouter } from 'next/navigation'

import { CapturaOcrProvider, useCapturaOcr } from '@/components/features/captura-ocr/captura-ocr-context'
import { CapturaPageHeader } from '@/components/features/captura-ocr/captura-page-header'
import { CapturaPdfTray } from '@/components/features/captura-ocr/captura-pdf-tray'
import { CapturaWeekGrid } from '@/components/features/captura-ocr/captura-week-grid'

export default function CapturaOcrPage() {
  return (
    <CapturaOcrProvider>
      <CapturaOcrContent />
    </CapturaOcrProvider>
  )
}

function CapturaOcrContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [weekStart, setWeekStart] = useState(() => {
    const weekParam = searchParams.get('week')
    if (weekParam) {
      const parsed = parseISO(weekParam)
      if (isValid(parsed)) {
        return startOfWeek(parsed, { weekStartsOn: 1 })
      }
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 })
  })

  const { loadWeekJobs } = useCapturaOcr()

  // Load DB jobs whenever the week changes
  useEffect(() => {
    const weekStr = format(weekStart, 'yyyy-MM-dd')
    loadWeekJobs(weekStr)
  }, [weekStart, loadWeekJobs])

  const handleWeekChange = useCallback((newWeekStart: Date) => {
    const week = startOfWeek(newWeekStart, { weekStartsOn: 1 })
    setWeekStart(week)
    // Update URL with week param, preserving other params (e.g. ?job=)
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', format(week, 'yyyy-MM-dd'))
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  return (
    <div className="space-y-4 p-6">
      <CapturaPageHeader
        weekStart={weekStart}
        onWeekChange={handleWeekChange}
      />
      <CapturaPdfTray />
      <CapturaWeekGrid weekStart={weekStart} />
    </div>
  )
}
