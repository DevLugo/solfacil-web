'use client'

import { useState, useRef, DragEvent } from 'react'
import {
  Plus,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Upload,
  X,
  MapPin,
  Clock,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { CapturaJobSummary, UploadItem } from './types'

type CellState = 'empty' | 'assigned' | 'uploading' | 'queued' | 'processing' | 'completed' | 'edited' | 'confirmed' | 'error'

interface CapturaGridCellProps {
  /** DB job for this cell (if any) */
  dbJob?: CapturaJobSummary
  /** Local upload assigned to this cell (if any) */
  localUpload?: UploadItem
  /** Whether real financial data (payments/loans) exists in DB for this route+date */
  hasFinancialData?: boolean
  /** Called when a PDF is dropped or selected via file picker */
  onAssign: (uploadId: string) => void
  /** Called to directly add a file to this cell */
  onFileAdd: (file: File) => void
  /** Called to remove the local upload from this cell */
  onUnassign: () => void
  /** Called to open preview dialog */
  onPreview: (jobId: string) => void
  /** Called to delete an existing OCR job */
  onDelete?: (jobId: string) => void
}

export function CapturaGridCell({
  dbJob,
  localUpload,
  hasFinancialData,
  onAssign,
  onFileAdd,
  onUnassign,
  onPreview,
  onDelete,
}: CapturaGridCellProps) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const state = getCellState(dbJob, localUpload)
  const isDropTarget = state === 'empty'

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!isDropTarget) return

    // Check if it's a file drop (from OS)
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onFileAdd(file)
      }
      return
    }

    // Otherwise it's an upload chip drag
    const uploadId = e.dataTransfer.getData('text/plain')
    if (uploadId) {
      onAssign(uploadId)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (isDropTarget) setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleClick = () => {
    if (state === 'empty') {
      fileInputRef.current?.click()
    } else if (state === 'completed' || state === 'edited' || state === 'confirmed') {
      const jobId = dbJob?.id || localUpload?.jobId
      if (jobId) onPreview(jobId)
    }
  }

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-md border p-2 min-h-[80px] transition-all text-center',
        // Empty state: neutral if no data, teal if captured
        state === 'empty' && !hasFinancialData && 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 cursor-pointer',
        state === 'empty' && hasFinancialData && 'border-teal-300 bg-teal-50 hover:bg-teal-100/80 cursor-pointer',
        // Other states
        state === 'assigned' && 'border-orange-300 bg-orange-50/50',
        state === 'uploading' && 'border-blue-300 bg-blue-50/50',
        state === 'queued' && 'border-purple-300 bg-purple-50/50',
        state === 'processing' && 'border-yellow-300 bg-yellow-50/50',
        state === 'completed' && 'border-green-300 bg-green-50/50 cursor-pointer hover:bg-green-50',
        state === 'edited' && 'border-blue-400 bg-blue-50/50 cursor-pointer hover:bg-blue-50',
        state === 'confirmed' && 'border-emerald-400 bg-emerald-50/50 cursor-pointer hover:bg-emerald-50',
        state === 'error' && 'border-destructive/50 bg-destructive/5',
        // Drag overlay
        dragOver && 'border-primary bg-primary/10 ring-2 ring-primary/30',
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileAdd(file)
          e.target.value = ''
        }}
      />

      {state === 'empty' && <EmptyCell hasFinancialData={hasFinancialData} />}

      {/* Financial data indicator dot (for non-empty states) */}
      {state !== 'empty' && hasFinancialData && (
        <div className="absolute top-1 left-1 h-2 w-2 rounded-full bg-teal-500" title="Datos capturados" />
      )}
      {state === 'assigned' && localUpload && (
        <AssignedCell fileName={localUpload.file?.name} onUnassign={onUnassign} />
      )}
      {state === 'uploading' && localUpload && (
        <UploadingCell upload={localUpload} />
      )}
      {state === 'queued' && (
        <QueuedCell upload={localUpload} onCancel={onUnassign} />
      )}
      {state === 'processing' && localUpload && (
        <ProcessingCell upload={localUpload} onCancel={onUnassign} />
      )}
      {state === 'completed' && (
        <CompletedCell dbJob={dbJob} localUpload={localUpload} onDelete={onDelete} />
      )}
      {state === 'edited' && dbJob && (
        <EditedCell dbJob={dbJob} onDelete={onDelete} />
      )}
      {state === 'confirmed' && dbJob && (
        <ConfirmedCell dbJob={dbJob} onDelete={onDelete} />
      )}
      {state === 'error' && localUpload && (
        <ErrorCell error={localUpload.error} onRemove={onUnassign} />
      )}
    </div>
  )
}

function getCellState(dbJob?: CapturaJobSummary, localUpload?: UploadItem): CellState {
  // Local upload states take priority during active processing
  if (localUpload) {
    if (localUpload.status === 'uploading') return 'uploading'
    if (localUpload.status === 'queued') return 'queued'
    if (localUpload.status === 'processing') return 'processing'
    if (localUpload.status === 'failed') return 'error'
    if (localUpload.status === 'completed') return 'completed'
    if (localUpload.status === 'pending' && localUpload.routeId && localUpload.date) return 'assigned'
  }

  // DB job states
  if (dbJob) {
    if (dbJob.confirmedAt) return 'confirmed'
    if (dbJob.status === 'COMPLETED') return 'completed'
    if (dbJob.status === 'QUEUED') return 'queued'
    if (dbJob.status === 'PROCESSING') return 'processing'
    if (dbJob.status === 'FAILED') return 'error'
  }

  return 'empty'
}

function EmptyCell({ hasFinancialData }: { hasFinancialData?: boolean }) {
  if (hasFinancialData) {
    return (
      <div className="flex flex-col items-center gap-1 text-teal-600">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-[10px] font-medium">Capturado</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
      <Plus className="h-5 w-5" />
      <span className="text-[10px]">Drop PDF</span>
    </div>
  )
}

function AssignedCell({ fileName, onUnassign }: { fileName?: string; onUnassign: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <FileText className="h-4 w-4 text-orange-600" />
      <span className="text-[10px] text-muted-foreground truncate max-w-full px-1">
        {fileName || 'PDF'}
      </span>
      <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-orange-50 text-orange-700 border-orange-200">
        Pendiente
      </Badge>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onUnassign()
        }}
        className="absolute top-1 right-1 rounded-sm hover:bg-destructive/20 p-0.5"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  )
}

function UploadingCell({ upload }: { upload: UploadItem }) {
  const pct = upload.uploadProgress
    ? Math.round((upload.uploadProgress.loaded / upload.uploadProgress.total) * 100)
    : 0
  return (
    <div className="flex flex-col items-center gap-1">
      <Upload className="h-4 w-4 animate-pulse text-blue-500" />
      <span className="text-[10px] text-muted-foreground">{pct}%</span>
      <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-blue-50 text-blue-700 border-blue-200">
        Subiendo
      </Badge>
    </div>
  )
}

function QueuedCell({ upload, onCancel }: { upload?: UploadItem; onCancel: () => void }) {
  const pos = upload?.queuePosition ?? '?'
  const total = upload?.queueTotal ?? '?'

  return (
    <div className="flex flex-col items-center gap-1">
      <Clock className="h-4 w-4 animate-pulse text-purple-500" />
      <span className="text-[10px] text-muted-foreground tabular-nums">{pos} de {total}</span>
      <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-purple-50 text-purple-700 border-purple-200">
        En cola
      </Badge>
      <button
        onClick={(e) => { e.stopPropagation(); onCancel() }}
        className="absolute top-1 right-1 rounded-sm hover:bg-destructive/20 p-0.5"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  )
}

function ProcessingCell({ upload, onCancel }: { upload: UploadItem; onCancel: () => void }) {
  const elapsed = upload.elapsedSeconds || 0
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`

  return (
    <div className="flex flex-col items-center gap-1">
      <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
      <span className="text-[10px] text-muted-foreground tabular-nums">{timeStr}</span>
      <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-yellow-50 text-yellow-700 border-yellow-200">
        Procesando
      </Badge>
      <button
        onClick={(e) => { e.stopPropagation(); onCancel() }}
        className="absolute top-1 right-1 rounded-sm hover:bg-destructive/20 p-0.5"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  )
}

function CompletedCell({ dbJob, localUpload, onDelete }: { dbJob?: CapturaJobSummary; localUpload?: UploadItem; onDelete?: (jobId: string) => void }) {
  const locCount = dbJob?.localityCount ?? localUpload?.result?.localities?.length ?? 0
  const cost = dbJob?.costUsd ?? localUpload?.result?.usage?.totalCostUsd
  const jobId = dbJob?.id || localUpload?.jobId

  return (
    <div className="flex flex-col items-center gap-1">
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin className="h-2.5 w-2.5" />
        {locCount} loc
      </div>
      {cost != null && (
        <span className="text-[10px] font-mono text-muted-foreground">${cost.toFixed(2)}</span>
      )}
      <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-green-50 text-green-700 border-green-200">
        Listo
      </Badge>
      {onDelete && jobId && (
        <DeleteButton onDelete={() => onDelete(jobId)} />
      )}
    </div>
  )
}

function EditedCell({ dbJob, onDelete }: { dbJob: CapturaJobSummary; onDelete?: (jobId: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Save className="h-4 w-4 text-blue-500" />
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin className="h-2.5 w-2.5" />
        {dbJob.localityCount} loc
      </div>
      <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-blue-50 text-blue-700 border-blue-200">
        Guardado
      </Badge>
      {onDelete && (
        <DeleteButton onDelete={() => onDelete(dbJob.id)} />
      )}
    </div>
  )
}

function ConfirmedCell({ dbJob, onDelete }: { dbJob: CapturaJobSummary; onDelete?: (jobId: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin className="h-2.5 w-2.5" />
        {dbJob.localityCount} loc
      </div>
      <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-0.5">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Confirmado
      </Badge>
      {onDelete && (
        <DeleteButton onDelete={() => onDelete(dbJob.id)} />
      )}
    </div>
  )
}

function ErrorCell({ error, onRemove }: { error?: string; onRemove: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <AlertCircle className="h-4 w-4 text-destructive" />
      <span className="text-[10px] text-destructive truncate max-w-full px-1">
        {error ? (error.length > 30 ? error.slice(0, 30) + '...' : error) : 'Error'}
      </span>
      <Badge variant="destructive" className="h-4 px-1.5 text-[9px]">
        Error
      </Badge>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute top-1 right-1 rounded-sm hover:bg-destructive/20 p-0.5"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  )
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onDelete()
      }}
      className="absolute top-1 right-1 rounded-sm hover:bg-destructive/20 p-0.5"
      title="Eliminar OCR"
    >
      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
    </button>
  )
}
