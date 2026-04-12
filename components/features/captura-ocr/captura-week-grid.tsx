'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useApolloClient } from '@apollo/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { format, startOfWeek, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { PlayCircle, Wallet, Building2, DollarSign } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'
import { ROUTES_WITH_ACCOUNTS_QUERY } from '@/graphql/queries/transactions'
import { FINANCIAL_ACTIVITY_BY_WEEK_QUERY } from '@/graphql/queries/captura'

import { useCapturaOcr } from './captura-ocr-context'
import { CapturaGridCell } from './captura-grid-cell'
import { CapturaPreviewDialog } from './captura-preview-dialog'
import type { CapturaJobSummary, UploadItem, CapturaJobRecord } from './types'

interface CapturaWeekGridProps {
  weekStart: Date
}

export function CapturaWeekGrid({ weekStart }: CapturaWeekGridProps) {
  const {
    uploads,
    weekJobs,
    weekJobsLoading,
    assignUpload,
    unassignUpload,
    addPreAssignedUpload,
    startAllAssigned,
    loadJobFromDb,
    deleteJobFromDb,
  } = useCapturaOcr()

  const router = useRouter()
  const searchParams = useSearchParams()
  const apolloClient = useApolloClient()

  const { data: routesData, loading: routesLoading } = useQuery(ROUTES_WITH_ACCOUNTS_QUERY)
  const routes: { id: string; name: string; accounts?: { id: string; name: string; type: string; amount: string; accountBalance: string }[] }[] = routesData?.routes || []

  // Fetch financial activity for the week (payments/loans already captured in DB)
  const routeIds = routes.map(r => r.id)
  const weekStartStr = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const { data: finData } = useQuery(FINANCIAL_ACTIVITY_BY_WEEK_QUERY, {
    variables: { routeIds, weekStart: weekStartStr },
    skip: routeIds.length === 0,
  })

  // Index financial activity by "routeId:date"
  const finIndex = new Map<string, boolean>()
  for (const item of finData?.financialActivityByWeek || []) {
    const key = `${item.routeId}:${item.date}`
    if (item.paymentCount > 0 || item.loanCount > 0) {
      finIndex.set(key, true)
    }
  }

  // Preview dialog state
  const [previewJobRecord, setPreviewJobRecord] = useState<CapturaJobRecord | null>(null)
  const [previewUpload, setPreviewUpload] = useState<UploadItem | null>(null)

  // Delete confirmation state
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)

  // Build the 5 weekdays (Mon-Fri)
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(monday, i)
    return {
      date,
      dateStr: format(date, 'yyyy-MM-dd'),
      dayLabel: format(date, 'EEE d', { locale: es }),
    }
  })

  // Index DB jobs by "routeId:date"
  const jobIndex = new Map<string, CapturaJobSummary>()
  for (const job of weekJobs) {
    const dateStr = typeof job.date === 'string'
      ? job.date.split('T')[0]
      : new Date(job.date).toISOString().split('T')[0]
    const key = `${job.routeId}:${dateStr}`
    jobIndex.set(key, job)
  }

  // Index local uploads by "routeId:date"
  const uploadIndex = new Map<string, UploadItem>()
  for (const u of uploads) {
    if (u.routeId && u.date) {
      const key = `${u.routeId}:${u.date}`
      uploadIndex.set(key, u)
    }
  }

  // Count assigned uploads ready to process
  const assignedPendingCount = uploads.filter(u =>
    u.status === 'pending' && u.routeId && u.date && u.file
  ).length

  const handleAssign = useCallback((uploadId: string, routeId: string, routeCode: string, routeName: string, dateStr: string) => {
    assignUpload(uploadId, routeId, routeCode, routeName, dateStr)
  }, [assignUpload])

  // URL state helpers
  const setJobInUrl = useCallback((jobId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('job', jobId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  const clearJobFromUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('job')
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }, [searchParams, router])

  // Auto-open job from URL on mount
  const urlJobId = searchParams.get('job')
  useEffect(() => {
    if (!urlJobId || weekJobsLoading) return
    // Already showing this job
    if (previewJobRecord?.id === urlJobId || previewUpload?.jobId === urlJobId) return

    // Always try DB first — it has pdfUrl and latest data
    loadJobFromDb(urlJobId).then(record => {
      if (record) {
        setPreviewJobRecord(record)
        setPreviewUpload(null)
      } else {
        // Not in DB yet — check local uploads (still processing)
        const localUpload = uploads.find(u => u.jobId === urlJobId)
        if (localUpload) {
          setPreviewUpload(localUpload)
          setPreviewJobRecord(null)
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlJobId, weekJobsLoading])

  // Preview handler
  const handlePreview = useCallback(async (jobId: string) => {
    setJobInUrl(jobId)

    // Always try DB first — it has pdfUrl and latest data
    const record = await loadJobFromDb(jobId)
    if (record) {
      setPreviewJobRecord(record)
      setPreviewUpload(null)
      return
    }

    // Not in DB yet — check local uploads (still processing)
    const localUpload = uploads.find(u => u.jobId === jobId)
    if (localUpload) {
      setPreviewUpload(localUpload)
      setPreviewJobRecord(null)
    }
  }, [uploads, loadJobFromDb, setJobInUrl])

  const handleDelete = useCallback((jobId: string) => {
    setDeleteJobId(jobId)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteJobId) return
    await deleteJobFromDb(deleteJobId)
    setDeleteJobId(null)
  }, [deleteJobId, deleteJobFromDb])

  if (routesLoading || weekJobsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No hay rutas configuradas</p>
      </div>
    )
  }

  // Account balance helpers (same pattern as transaction-selectors)
  const getAccountIcon = (type: string) => {
    if (type === 'BANK') return <Building2 className="h-3.5 w-3.5" />
    if (type === 'EMPLOYEE_CASH_FUND') return <Wallet className="h-3.5 w-3.5" />
    if (type === 'PREPAID_GAS' || type === 'TRAVEL_EXPENSES') return <DollarSign className="h-3.5 w-3.5" />
    return <DollarSign className="h-3.5 w-3.5" />
  }
  const getAccountStyle = (type: string) => {
    if (type === 'BANK') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (type === 'EMPLOYEE_CASH_FUND') return 'bg-green-50 text-green-700 border-green-200'
    if (type === 'PREPAID_GAS') return 'bg-purple-50 text-purple-700 border-purple-200'
    if (type === 'TRAVEL_EXPENSES') return 'bg-rose-50 text-rose-700 border-rose-200'
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  return (
    <>
      {/* Account balances — deduplicated, grouped: Caja Ruta → Prepago → Banco/Otros */}
      <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
        {(() => {
          const seen = new Set<string>()
          const typeOrder: Record<string, number> = { 'EMPLOYEE_CASH_FUND': 0, 'PREPAID_GAS': 1, 'TRAVEL_EXPENSES': 2, 'BANK': 3, 'OFFICE_CASH_FUND': 4 }
          return routes
            .flatMap(route => (route.accounts || []).map(account => ({ ...account, _routeId: route.id })))
            .filter(account => {
              if (seen.has(account.id)) return false
              seen.add(account.id)
              return true
            })
            .sort((a, b) => (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5))
            .map(account => (
              <Badge
                key={account.id}
                variant="outline"
                className={cn('text-xs py-1 px-2 gap-1.5', getAccountStyle(account.type))}
              >
                {getAccountIcon(account.type)}
                <span className="font-medium">{account.name}</span>
                <span className="font-bold">{formatCurrency(parseFloat(account.accountBalance || account.amount || '0'))}</span>
              </Badge>
            ))
        })()}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide p-2 w-[140px]">
                Ruta
              </th>
              {weekDays.map(day => (
                <th key={day.dateStr} className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide p-2">
                  {day.dayLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map(route => {
              const routeCode = route.name.replace(/^RUTA\s*/i, '').trim()
              return (
                <tr key={route.id} className="border-t">
                  <td className="p-2 text-sm font-semibold whitespace-nowrap">
                    {route.name}
                  </td>
                  {weekDays.map(day => {
                    const cellKey = `${route.id}:${day.dateStr}`
                    const dbJob = jobIndex.get(cellKey)
                    const localUpload = uploadIndex.get(cellKey)
                    const hasFinancialData = finIndex.get(cellKey) ?? false

                    return (
                      <td key={day.dateStr} className="p-1">
                        <CapturaGridCell
                          dbJob={dbJob}
                          localUpload={localUpload}
                          hasFinancialData={hasFinancialData}
                          onAssign={(uploadId) => handleAssign(uploadId, route.id, routeCode, route.name, day.dateStr)}
                          onFileAdd={(file) => {
                            addPreAssignedUpload(file, route.id, routeCode, route.name, day.dateStr)
                          }}
                          onUnassign={() => {
                            if (localUpload) unassignUpload(localUpload.id)
                          }}
                          onPreview={handlePreview}
                          onDelete={handleDelete}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Floating process button - fixed bottom-right */}
      {assignedPendingCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={startAllAssigned} size="lg" className="gap-2 shadow-lg">
            <PlayCircle className="h-5 w-5" />
            Procesar Pendientes ({assignedPendingCount})
          </Button>
        </div>
      )}

      {/* Preview dialog — DB record has pdfUrl, local upload is fallback for in-flight jobs */}
      {previewJobRecord ? (
        <CapturaPreviewDialog
          jobId={previewJobRecord.id}
          dbResult={previewJobRecord.result}
          dbEditedResult={previewJobRecord.editedResult}
          dbPdfUrl={previewJobRecord.pdfUrl}
          routeId={previewJobRecord.routeId}
          routeName={previewJobRecord.routeCode}
          confirmedAt={previewJobRecord.confirmedAt}
          open
          onOpenChange={(open) => {
            if (!open) {
              setPreviewJobRecord(null)
              clearJobFromUrl()
              // Refresh account balances + financial activity so badges/dots reflect any changes
              apolloClient.refetchQueries({ include: [ROUTES_WITH_ACCOUNTS_QUERY, FINANCIAL_ACTIVITY_BY_WEEK_QUERY] })
            }
          }}
        />
      ) : previewUpload && previewUpload.jobId ? (
        <CapturaPreviewDialog
          jobId={previewUpload.jobId}
          upload={previewUpload}
          open
          onOpenChange={(open) => {
            if (!open) {
              setPreviewUpload(null)
              clearJobFromUrl()
              apolloClient.refetchQueries({ include: [ROUTES_WITH_ACCOUNTS_QUERY, FINANCIAL_ACTIVITY_BY_WEEK_QUERY] })
            }
          }}
        />
      ) : null}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteJobId} onOpenChange={(open) => { if (!open) setDeleteJobId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar OCR</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara el resultado OCR y su preview. Los datos financieros ya capturados (pagos y creditos) NO se eliminaran.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
