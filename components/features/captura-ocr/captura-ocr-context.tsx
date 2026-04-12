'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { useLazyQuery, useMutation, useApolloClient } from '@apollo/client'

import { uploadFileWithGraphQL } from '@/lib/apollo-client'
import { CAPTURA_JOB_STATUS_QUERY, CAPTURA_JOB_QUERY, CAPTURA_JOBS_BY_WEEK_QUERY, FINANCIAL_ACTIVITY_BY_WEEK_QUERY } from '@/graphql/queries/captura'
import { SAVE_CAPTURA_EDITS, DELETE_CAPTURA_JOB, CONFIRM_CAPTURA_JOB, ROLLBACK_CAPTURA_CONFIRMATION } from '@/graphql/mutations/captura'
import { TRANSACTIONS_SUMMARY_BY_LOCATION_QUERY, ACCOUNTS_QUERY, ROUTES_WITH_ACCOUNTS_QUERY } from '@/graphql/queries/transactions'

import type {
  UploadItem,
  CapturaResult,
  CapturaException,
  CapturaCredit,
  CapturaResumenInferior,
  CapturaGasto,
  CapturaJobSummary,
  CapturaJobRecord,
  CapturaLocalityResult,
  CapturaExtracobranzaEntry,
} from './types'

// --- localStorage persistence (ONLY for transient upload state) ---
const STORAGE_KEY = 'captura-ocr-uploads'

interface PersistedState {
  uploads: Array<Omit<UploadItem, 'file'>>
  savedAt: number
}

function saveUploadsToStorage(uploads: UploadItem[]) {
  try {
    const state: PersistedState = {
      uploads: uploads
        .filter(u => u.file || u.routeId || u.date)
        .map(({ file, ...rest }) => rest),
      savedAt: Date.now(),
    }
    if (state.uploads.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // localStorage full or unavailable
  }
}

function loadUploadsFromStorage(): UploadItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const state: PersistedState = JSON.parse(raw)

    // Discard if older than 24 hours
    if (Date.now() - state.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return state.uploads
      .filter(u => u.status === 'completed' || u.status === 'failed' || u.status === 'pending')
      .map(u => ({
        ...u,
        file: null,
        ...((u.status === 'processing' || u.status === 'uploading' || u.status === 'queued')
          ? { status: 'failed' as const, error: 'Interrupted — page was reloaded' }
          : {}
        ),
      }))
  } catch {
    return null
  }
}
// --- end localStorage persistence ---

interface CapturaOcrContextType {
  // Uploads (PDF tray + assigned)
  uploads: UploadItem[]
  addMultipleUploads: (files: File[]) => void
  addPreAssignedUpload: (file: File, routeId: string, routeCode: string, routeName: string, date: string) => void
  removeUpload: (id: string) => void
  assignUpload: (uploadId: string, routeId: string, routeCode: string, routeName: string, date: string) => void
  unassignUpload: (uploadId: string) => void
  startProcessing: (id: string) => void
  startAllAssigned: () => void
  clearAll: () => void
  // Week jobs from DB
  weekJobs: CapturaJobSummary[]
  weekJobsLoading: boolean
  loadWeekJobs: (weekStart: string) => Promise<void>
  // Edited results per jobId (in-memory for UI editing)
  editedResults: Map<string, CapturaResult>
  updateException: (jobId: string, localidad: string, pos: number, changes: Partial<CapturaException>) => void
  updateCredit: (jobId: string, localidad: string, index: number, changes: Partial<CapturaCredit>) => void
  addCredit: (jobId: string, localidad: string) => void
  removeCredit: (jobId: string, localidad: string, index: number) => void
  updateResumen: (jobId: string, localidad: string, changes: Partial<CapturaResumenInferior>) => void
  // Locality CRUD (manual add/remove)
  addLocality: (jobId: string, locality: CapturaLocalityResult) => void
  removeLocality: (jobId: string, localidad: string) => void
  // Gastos CRUD (global, not per-locality)
  updateGasto: (jobId: string, index: number, changes: Partial<CapturaGasto>) => void
  addGasto: (jobId: string) => void
  removeGasto: (jobId: string, index: number) => void
  // Extracobranza CRUD (global, cross-locality payments)
  addExtracobranza: (jobId: string, entry: Omit<CapturaExtracobranzaEntry, 'id'>) => void
  updateExtracobranza: (jobId: string, entryId: string, changes: Partial<CapturaExtracobranzaEntry>) => void
  removeExtracobranza: (jobId: string, entryId: string) => void
  getEditedResult: (jobId: string) => CapturaResult | undefined
  ensureEditedResult: (jobId: string, result: CapturaResult) => void
  // Bulk actions for payments
  setAllRegular: (jobId: string, localidad: string) => void
  setAllFalta: (jobId: string, localidad: string) => void
  resetToOriginal: (jobId: string, localidad: string) => void
  // System data
  systemSummaries: Map<string, unknown>
  cashFundBalances: Map<string, number>
  fetchSystemSummary: (routeId: string, force?: boolean) => Promise<void>
  refreshRouteData: (routeId: string) => Promise<void>
  // DB operations
  saveEditsToDb: (jobId: string) => Promise<void>
  savingJobId: string | null
  loadJobFromDb: (jobId: string) => Promise<CapturaJobRecord | null>
  deleteJobFromDb: (jobId: string) => Promise<boolean>
  // Confirm / Rollback
  confirmCaptura: (jobId: string, expectedFinalBalance?: number | null) => Promise<{ success: boolean; lprCount: number; gastoCount: number; loanCount: number; status?: string; error?: string | null; extracobranzaErrors?: string[] } | null>
  rollbackCaptura: (jobId: string) => Promise<{ success: boolean; rolledBackLoans: number; rolledBackGastos: number; rolledBackLprs: number } | null>
  confirmingJobId: string | null
  rollingBackJobId: string | null
}

const CapturaOcrContext = createContext<CapturaOcrContextType | undefined>(undefined)

export function CapturaOcrProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [editedResults, setEditedResults] = useState<Map<string, CapturaResult>>(new Map())
  const [systemSummaries, setSystemSummaries] = useState<Map<string, unknown>>(new Map())
  const [cashFundBalances, setCashFundBalances] = useState<Map<string, number>>(new Map())
  const [savingJobId, setSavingJobId] = useState<string | null>(null)
  const [weekJobs, setWeekJobs] = useState<CapturaJobSummary[]>([])
  const [weekJobsLoading, setWeekJobsLoading] = useState(false)

  const [pollJobStatus] = useLazyQuery(CAPTURA_JOB_STATUS_QUERY, { fetchPolicy: 'network-only' })
  const [fetchSummary] = useLazyQuery(TRANSACTIONS_SUMMARY_BY_LOCATION_QUERY, { fetchPolicy: 'network-only' })
  const [fetchAccounts] = useLazyQuery(ACCOUNTS_QUERY, { fetchPolicy: 'network-only' })
  const [fetchJobFromDb] = useLazyQuery(CAPTURA_JOB_QUERY, { fetchPolicy: 'network-only' })
  const [fetchWeekJobsQuery] = useLazyQuery(CAPTURA_JOBS_BY_WEEK_QUERY, { fetchPolicy: 'network-only' })
  const [saveEditsMutation] = useMutation(SAVE_CAPTURA_EDITS)
  const [deleteJobMutation] = useMutation(DELETE_CAPTURA_JOB)
  const [confirmMutation] = useMutation(CONFIRM_CAPTURA_JOB)
  const [rollbackMutation] = useMutation(ROLLBACK_CAPTURA_CONFIRMATION)
  const [confirmingJobId, setConfirmingJobId] = useState<string | null>(null)
  const [rollingBackJobId, setRollingBackJobId] = useState<string | null>(null)

  const apolloClient = useApolloClient()

  // Load persisted upload state on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? loadUploadsFromStorage() : null
    if (saved && saved.length > 0) {
      setUploads(saved)
    }
    setInitialized(true)
  }, [])

  // Persist upload state on changes (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (!initialized) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveUploadsToStorage(uploads)
    }, 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [initialized, uploads])

  // --- Upload management ---

  const addMultipleUploads = useCallback((files: File[]) => {
    const newUploads: UploadItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      routeId: '',
      routeCode: '',
      routeName: '',
      file,
      status: 'pending',
    }))
    setUploads(prev => [...prev, ...newUploads])
  }, [])

  const addPreAssignedUpload = useCallback((file: File, routeId: string, routeCode: string, routeName: string, date: string) => {
    const upload: UploadItem = {
      id: crypto.randomUUID(),
      routeId,
      routeCode,
      routeName,
      date,
      file,
      status: 'pending',
    }
    setUploads(prev => [...prev, upload])
  }, [])

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id))
  }, [])

  const assignUpload = useCallback((uploadId: string, routeId: string, routeCode: string, routeName: string, date: string) => {
    setUploads(prev => prev.map(u =>
      u.id === uploadId ? { ...u, routeId, routeCode, routeName, date } : u
    ))
  }, [])

  const unassignUpload = useCallback((uploadId: string) => {
    setUploads(prev => prev.map(u =>
      u.id === uploadId ? { ...u, routeId: '', routeCode: '', routeName: '', date: undefined } : u
    ))
  }, [])

  // --- Processing ---

  const startPolling = useCallback((uploadId: string, jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await pollJobStatus({ variables: { jobId } })
        const job = data?.capturaJobStatus
        if (!job) return

        if (job.status === 'COMPLETED' && job.result) {
          clearInterval(interval)
          const result = job.result as CapturaResult
          setUploads(prev => prev.map(u =>
            u.id === uploadId
              ? { ...u, status: 'completed', result, progress: undefined, queuePosition: undefined, queueTotal: undefined }
              : u
          ))
          // Deep clone result for editing
          setEditedResults(prev => {
            const next = new Map(prev)
            next.set(jobId, JSON.parse(JSON.stringify(result)))
            return next
          })
        } else if (job.status === 'FAILED') {
          clearInterval(interval)
          setUploads(prev => prev.map(u =>
            u.id === uploadId
              ? { ...u, status: 'failed', error: job.error || 'Unknown error', progress: undefined, queuePosition: undefined, queueTotal: undefined }
              : u
          ))
        } else if (job.status === 'QUEUED') {
          // In queue — update position
          setUploads(prev => prev.map(u =>
            u.id === uploadId
              ? { ...u, status: 'queued', queuePosition: job.queuePosition ?? undefined, queueTotal: job.queueTotal ?? undefined }
              : u
          ))
        } else {
          // PROCESSING — update progress, clear queue info
          setUploads(prev => prev.map(u =>
            u.id === uploadId
              ? { ...u, status: 'processing', progress: job.progress || u.progress, queuePosition: undefined, queueTotal: undefined }
              : u
          ))
        }
      } catch {
        // Keep polling on network errors
      }
    }, 5000)

    // Also start elapsed time counter
    const timerInterval = setInterval(() => {
      setUploads(prev => prev.map(u =>
        u.id === uploadId && (u.status === 'processing' || u.status === 'queued')
          ? { ...u, elapsedSeconds: (u.elapsedSeconds || 0) + 1 }
          : u
      ))
    }, 1000)

    const cleanup = () => {
      clearInterval(interval)
      clearInterval(timerInterval)
    }

    // Auto-cleanup after 10 minutes
    setTimeout(cleanup, 10 * 60 * 1000)

    return cleanup
  }, [pollJobStatus])

  const startProcessing = useCallback(async (id: string) => {
    const upload = uploads.find(u => u.id === id)
    if (!upload?.file || !upload.routeId || !upload.date) return

    setUploads(prev => prev.map(u =>
      u.id === id ? { ...u, status: 'uploading', error: undefined } : u
    ))

    try {
      const dateStr = upload.date
      const data = await uploadFileWithGraphQL({
        file: upload.file,
        query: `mutation StartCapturaPdf($file: Upload!, $routeCode: String!, $routeId: ID!, $date: String!, $fileName: String) {
          startCapturaPdf(file: $file, routeCode: $routeCode, routeId: $routeId, date: $date, fileName: $fileName) {
            jobId
          }
        }`,
        variables: {
          routeCode: upload.routeCode,
          routeId: upload.routeId,
          date: dateStr,
          fileName: upload.file.name,
        },
        operationName: 'StartCapturaPdf',
        fileVariablePath: 'variables.file',
        timeoutMs: 300000,
        onProgress: (loaded, total) => {
          setUploads(prev => prev.map(u =>
            u.id === id ? { ...u, uploadProgress: { loaded, total } } : u
          ))
        },
      })

      const jobId = data?.startCapturaPdf?.jobId
      if (!jobId) throw new Error('No jobId returned')

      setUploads(prev => prev.map(u =>
        u.id === id ? { ...u, status: 'queued', jobId, elapsedSeconds: 0 } : u
      ))

      startPolling(id, jobId)

      // Fetch system summary for comparison
      fetchSystemSummary(upload.routeId)
    } catch (err) {
      setUploads(prev => prev.map(u =>
        u.id === id ? { ...u, status: 'failed', error: (err as Error).message } : u
      ))
    }
  }, [uploads, startPolling])

  const startAllAssigned = useCallback(async () => {
    const pending = uploads.filter(u => u.status === 'pending' && u.file && u.routeId && u.date)
    const MAX_CONCURRENT_UPLOADS = 3
    for (let i = 0; i < pending.length; i += MAX_CONCURRENT_UPLOADS) {
      const batch = pending.slice(i, i + MAX_CONCURRENT_UPLOADS)
      await Promise.all(batch.map(u => startProcessing(u.id)))
    }
  }, [uploads, startProcessing])

  const clearAll = useCallback(() => {
    setUploads([])
    setEditedResults(new Map())
    setSystemSummaries(new Map())
    setCashFundBalances(new Map())
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  // --- Week jobs from DB ---

  const loadWeekJobs = useCallback(async (weekStart: string) => {
    setWeekJobsLoading(true)
    try {
      const { data } = await fetchWeekJobsQuery({ variables: { weekStart } })
      setWeekJobs(data?.capturaJobsByWeek || [])
    } catch {
      setWeekJobs([])
    } finally {
      setWeekJobsLoading(false)
    }
  }, [fetchWeekJobsQuery])

  // --- System data ---

  const fetchSystemSummary = useCallback(async (routeId: string, force = false) => {
    if (!force && systemSummaries.has(routeId) && cashFundBalances.has(routeId)) return
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const startDate = `${dateStr}T00:00:00.000Z`
    const endDate = `${dateStr}T23:59:59.999Z`
    try {
      const [summaryRes, accountsRes] = await Promise.all([
        fetchSummary({ variables: { routeId, startDate, endDate } }),
        fetchAccounts({ variables: { routeId, type: 'EMPLOYEE_CASH_FUND' } }),
      ])

      if (summaryRes.data?.transactionsSummaryByLocation) {
        setSystemSummaries(prev => {
          const next = new Map(prev)
          next.set(routeId, summaryRes.data.transactionsSummaryByLocation)
          return next
        })
      }

      const accounts = accountsRes.data?.accounts
      if (accounts?.length > 0) {
        const balance = parseFloat(accounts[0].accountBalance ?? accounts[0].amount ?? '0') || 0
        setCashFundBalances(prev => {
          const next = new Map(prev)
          next.set(routeId, balance)
          return next
        })
      }
    } catch {
      // Non-critical
    }
  }, [fetchSummary, fetchAccounts, systemSummaries, cashFundBalances])

  // Force refresh of route data (cash fund + system summary + ROUTES_WITH_ACCOUNTS_QUERY).
  // Called after save/confirm/rollback so the UI (grid badges + BalanceBox) reflects
  // the new backend state without needing a manual reload.
  const refreshRouteData = useCallback(async (routeId: string) => {
    setSystemSummaries(prev => {
      const next = new Map(prev)
      next.delete(routeId)
      return next
    })
    setCashFundBalances(prev => {
      const next = new Map(prev)
      next.delete(routeId)
      return next
    })
    await fetchSystemSummary(routeId, true)
    await apolloClient.refetchQueries({ include: [ROUTES_WITH_ACCOUNTS_QUERY, FINANCIAL_ACTIVITY_BY_WEEK_QUERY] })
  }, [apolloClient, fetchSystemSummary])

  // --- DB operations ---

  const saveEditsToDb = useCallback(async (jobId: string) => {
    const edited = editedResults.get(jobId)
    if (!edited) return
    setSavingJobId(jobId)
    try {
      await saveEditsMutation({
        variables: { jobId, editedResult: edited },
      })
      // Refresh cash fund + route accounts so grid badges and BalanceBox reflect the save
      const job = weekJobs.find(j => j.id === jobId)
      if (job?.routeId) {
        await refreshRouteData(job.routeId)
      }
    } finally {
      setSavingJobId(null)
    }
  }, [editedResults, saveEditsMutation, weekJobs, refreshRouteData])

  const loadJobFromDb = useCallback(async (jobId: string): Promise<CapturaJobRecord | null> => {
    try {
      const { data } = await fetchJobFromDb({ variables: { id: jobId } })
      const record = data?.capturaJob as CapturaJobRecord | undefined
      if (!record) return null

      // Load editedResult (or fallback to result) into in-memory editing state
      const resultToEdit = record.editedResult || record.result
      if (resultToEdit) {
        setEditedResults(prev => {
          const next = new Map(prev)
          next.set(jobId, JSON.parse(JSON.stringify(resultToEdit)))
          return next
        })
      }
      return record
    } catch {
      return null
    }
  }, [fetchJobFromDb])

  const deleteJobFromDb = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      await deleteJobMutation({ variables: { jobId } })
      // Clean up local state
      setEditedResults(prev => {
        const next = new Map(prev)
        next.delete(jobId)
        return next
      })
      setWeekJobs(prev => prev.filter(j => j.id !== jobId))
      setUploads(prev => prev.filter(u => u.jobId !== jobId))
      return true
    } catch {
      return false
    }
  }, [deleteJobMutation])

  const confirmCaptura = useCallback(async (jobId: string, expectedFinalBalance?: number | null) => {
    setConfirmingJobId(jobId)
    try {
      const { data } = await confirmMutation({
        variables: { jobId, expectedFinalBalance: expectedFinalBalance ?? null },
      })
      const result = data?.confirmCapturaJob
      if (result?.success) {
        // Use the actual status the backend assigned (CONFIRMED or
        // CONFIRMED_WITH_ERRORS — el segundo se da cuando hubo extracobranzas
        // que fueron skipped o que fallaron al crearse).
        const finalStatus: string = result.job?.status || 'CONFIRMED'
        setWeekJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: finalStatus, confirmedAt: new Date().toISOString() } : j
        ))
        // Refresh cash fund + route accounts after confirm materializes transactions
        const job = weekJobs.find(j => j.id === jobId)
        if (job?.routeId) {
          await refreshRouteData(job.routeId)
        }
      }
      if (!result) return null
      const extracobranzaErrors: string[] | undefined =
        (result.job?.confirmationData as { extracobranzaErrors?: string[] } | null | undefined)
          ?.extracobranzaErrors
      return {
        success: result.success,
        lprCount: result.lprCount,
        gastoCount: result.gastoCount,
        loanCount: result.loanCount,
        status: result.job?.status,
        error: result.job?.error ?? null,
        extracobranzaErrors,
      }
    } catch (e) {
      throw e
    } finally {
      setConfirmingJobId(null)
    }
  }, [confirmMutation, weekJobs, refreshRouteData])

  const rollbackCaptura = useCallback(async (jobId: string) => {
    setRollingBackJobId(jobId)
    try {
      const { data } = await rollbackMutation({ variables: { jobId } })
      const result = data?.rollbackCapturaConfirmation
      if (result?.success) {
        // Update weekJobs to reflect rollback
        setWeekJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: 'COMPLETED', confirmedAt: null } : j
        ))
        // Refresh cash fund + route accounts after rollback reverts transactions
        const job = weekJobs.find(j => j.id === jobId)
        if (job?.routeId) {
          await refreshRouteData(job.routeId)
        }
      }
      return result || null
    } catch (e) {
      throw e
    } finally {
      setRollingBackJobId(null)
    }
  }, [rollbackMutation, weekJobs, refreshRouteData])

  // --- Edit operations ---

  const updateException = useCallback((jobId: string, localidad: string, pos: number, changes: Partial<CapturaException>) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      const locIdx = result.localities.findIndex(l => l.localidad === localidad)
      if (locIdx === -1) return prev
      const newExcepciones = [...(result.localities[locIdx].excepciones || [])]
      const excIdx = newExcepciones.findIndex(e => e.pos === pos)
      if (excIdx === -1) {
        // Client has no exception yet (pure REGULAR) — create one
        newExcepciones.push({ pos, marca: 'REGULAR', montoPagado: 0, paymentMethod: 'CASH', notas: '', ...changes } as CapturaException)
      } else {
        newExcepciones[excIdx] = { ...newExcepciones[excIdx], ...changes }
      }
      const newLocalities = [...result.localities]
      newLocalities[locIdx] = { ...newLocalities[locIdx], excepciones: newExcepciones }
      const newResult = { ...result, localities: newLocalities }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const updateCredit = useCallback((jobId: string, localidad: string, index: number, changes: Partial<CapturaCredit>) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      const locIdx = result.localities.findIndex(l => l.localidad === localidad)
      if (locIdx === -1 || !result.localities[locIdx]?.creditos?.[index]) return prev
      // Create new references so React detects the change
      const newCreditos = [...result.localities[locIdx].creditos]
      newCreditos[index] = { ...newCreditos[index], ...changes }
      const newLocalities = [...result.localities]
      newLocalities[locIdx] = { ...newLocalities[locIdx], creditos: newCreditos }
      const newResult = { ...result, localities: newLocalities }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const addCredit = useCallback((jobId: string, localidad: string) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      const locIdx = result.localities.findIndex(l => l.localidad === localidad)
      if (locIdx === -1) return prev
      const loc = result.localities[locIdx]
      const newCreditos = [...(loc.creditos || []), { monto: 0, tipo: 'N' } as CapturaCredit]
      const newLocalities = [...result.localities]
      newLocalities[locIdx] = { ...loc, creditos: newCreditos }
      const newResult = { ...result, localities: newLocalities }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const removeCredit = useCallback((jobId: string, localidad: string, index: number) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      const locIdx = result.localities.findIndex(l => l.localidad === localidad)
      if (locIdx === -1 || !result.localities[locIdx]?.creditos) return prev
      const newCreditos = result.localities[locIdx].creditos.filter((_, i) => i !== index)
      const newLocalities = [...result.localities]
      newLocalities[locIdx] = { ...newLocalities[locIdx], creditos: newCreditos }
      const newResult = { ...result, localities: newLocalities }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const addLocality = useCallback((jobId: string, locality: CapturaLocalityResult) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      // Dedupe: si ya existe por leadId, ignorar
      if (result.localities.some(l => l.leadId === locality.leadId)) return prev
      // Resolver colisión de nombre: si ya existe con otro leadId, sufijo numérico
      let finalName = locality.localidad
      let suffix = 2
      while (result.localities.some(l => l.localidad === finalName)) {
        finalName = `${locality.localidad} ${suffix++}`
      }
      const newLocality = { ...locality, localidad: finalName }
      const newResult = { ...result, localities: [...result.localities, newLocality] }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const removeLocality = useCallback((jobId: string, localidad: string) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      const newLocalities = result.localities.filter(l => l.localidad !== localidad)
      if (newLocalities.length === result.localities.length) return prev
      const newResult = { ...result, localities: newLocalities }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const updateResumen = useCallback((jobId: string, localidad: string, changes: Partial<CapturaResumenInferior>) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      const locIdx = result.localities.findIndex(l => l.localidad === localidad)
      if (locIdx === -1 || !result.localities[locIdx]?.resumenInferior) return prev
      const newLocalities = [...result.localities]
      newLocalities[locIdx] = {
        ...newLocalities[locIdx],
        resumenInferior: { ...newLocalities[locIdx].resumenInferior, ...changes } as CapturaResumenInferior,
      }
      const newResult = { ...result, localities: newLocalities }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const updateGasto = useCallback((jobId: string, index: number, changes: Partial<CapturaGasto>) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result?.gastos?.[index]) return prev
      const newGastos = [...result.gastos]
      newGastos[index] = { ...newGastos[index], ...changes }
      const newResult = { ...result, gastos: newGastos }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const addGasto = useCallback((jobId: string) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      const newGastos = [...(result.gastos || []), { concepto: '', monto: 0, expenseSource: 'OTRO', sourceAccountType: 'EMPLOYEE_CASH_FUND' } as CapturaGasto]
      const newResult = { ...result, gastos: newGastos }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const removeGasto = useCallback((jobId: string, index: number) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result?.gastos) return prev
      const newGastos = result.gastos.filter((_, i) => i !== index)
      const newResult = { ...result, gastos: newGastos }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const setAllRegular = useCallback((jobId: string, localidad: string) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      const locIdx = result.localities.findIndex(l => l.localidad === localidad)
      if (locIdx === -1) return prev
      const newLocalities = [...result.localities]
      newLocalities[locIdx] = { ...newLocalities[locIdx], excepciones: [] }
      const newResult = { ...result, localities: newLocalities }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const setAllFalta = useCallback((jobId: string, localidad: string) => {
    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev
      const locIdx = result.localities.findIndex(l => l.localidad === localidad)
      if (locIdx === -1 || !result.localities[locIdx]?.clientsList) return prev
      const newExcepciones = result.localities[locIdx].clientsList.map(client => ({
        pos: client.pos,
        marca: 'FALTA',
        montoPagado: 0,
        paymentMethod: 'CASH',
        clientCode: client.clientCode,
        loanId: client.loanId,
        borrowerId: client.borrowerId,
      }))
      const newLocalities = [...result.localities]
      newLocalities[locIdx] = { ...newLocalities[locIdx], excepciones: newExcepciones }
      const newResult = { ...result, localities: newLocalities }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [])

  const resetToOriginal = useCallback((jobId: string, localidad: string) => {
    const upload = uploads.find(u => u.jobId === jobId)
    const originalResult = upload?.result
    if (!originalResult) return

    setEditedResults(prev => {
      const result = prev.get(jobId)
      if (!result) return prev

      const originalLoc = originalResult.localities.find(l => l.localidad === localidad)
      const locIdx = result.localities.findIndex(l => l.localidad === localidad)
      if (!originalLoc || locIdx === -1) return prev

      const newLocalities = [...result.localities]
      newLocalities[locIdx] = {
        ...newLocalities[locIdx],
        excepciones: JSON.parse(JSON.stringify(originalLoc.excepciones || [])),
      }
      const newResult = { ...result, localities: newLocalities }
      const next = new Map(prev)
      next.set(jobId, newResult)
      return next
    })
  }, [uploads])

  const getEditedResult = useCallback((jobId: string) => {
    return editedResults.get(jobId)
  }, [editedResults])

  // Ensure the Map has an entry for this jobId. Called by CapturaPreviewDialog
  // on mount to guarantee the Map is populated before child components try to
  // call updateCredit (which silently no-ops if the entry doesn't exist).
  const ensureEditedResult = useCallback((jobId: string, result: CapturaResult) => {
    setEditedResults(prev => {
      if (prev.has(jobId)) return prev // Already initialized — no-op
      const next = new Map(prev)
      next.set(jobId, JSON.parse(JSON.stringify(result)))
      return next
    })
  }, [])

  // --- Extracobranza operations ---

  const addExtracobranza = useCallback((jobId: string, entry: Omit<CapturaExtracobranzaEntry, 'id'>) => {
    setEditedResults(prev => {
      const current = prev.get(jobId)
      if (!current) return prev
      const extras = current.extracobranzas || []
      const newEntry: CapturaExtracobranzaEntry = { ...entry, id: crypto.randomUUID() }
      const next = new Map(prev)
      next.set(jobId, { ...current, extracobranzas: [...extras, newEntry] })
      return next
    })
  }, [])

  const updateExtracobranza = useCallback((jobId: string, entryId: string, changes: Partial<CapturaExtracobranzaEntry>) => {
    setEditedResults(prev => {
      const current = prev.get(jobId)
      if (!current) return prev
      const extras = (current.extracobranzas || []).map(e =>
        e.id === entryId ? { ...e, ...changes } : e
      )
      const next = new Map(prev)
      next.set(jobId, { ...current, extracobranzas: extras })
      return next
    })
  }, [])

  const removeExtracobranza = useCallback((jobId: string, entryId: string) => {
    setEditedResults(prev => {
      const current = prev.get(jobId)
      if (!current) return prev
      const extras = (current.extracobranzas || []).filter(e => e.id !== entryId)
      const next = new Map(prev)
      next.set(jobId, { ...current, extracobranzas: extras })
      return next
    })
  }, [])

  return (
    <CapturaOcrContext.Provider
      value={{
        uploads,
        addMultipleUploads,
        addPreAssignedUpload,
        removeUpload,
        assignUpload,
        unassignUpload,
        startProcessing,
        startAllAssigned,
        clearAll,
        weekJobs,
        weekJobsLoading,
        loadWeekJobs,
        editedResults,
        updateException,
        updateCredit,
        addCredit,
        removeCredit,
        addLocality,
        removeLocality,
        updateResumen,
        updateGasto,
        addGasto,
        removeGasto,
        addExtracobranza,
        updateExtracobranza,
        removeExtracobranza,
        getEditedResult,
        ensureEditedResult,
        setAllRegular,
        setAllFalta,
        resetToOriginal,
        systemSummaries,
        cashFundBalances,
        fetchSystemSummary,
        refreshRouteData,
        saveEditsToDb,
        savingJobId,
        loadJobFromDb,
        deleteJobFromDb,
        confirmCaptura,
        rollbackCaptura,
        confirmingJobId,
        rollingBackJobId,
      }}
    >
      {children}
    </CapturaOcrContext.Provider>
  )
}

export function useCapturaOcr() {
  const context = useContext(CapturaOcrContext)
  if (context === undefined) {
    throw new Error('useCapturaOcr must be used within a CapturaOcrProvider')
  }
  return context
}
