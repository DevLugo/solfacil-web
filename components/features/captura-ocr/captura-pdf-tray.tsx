'use client'

import { useRef, useState, DragEvent } from 'react'
import { FileText, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useCapturaOcr } from './captura-ocr-context'

export function CapturaPdfTray() {
  const { uploads, addMultipleUploads, removeUpload } = useCapturaOcr()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Only unassigned PDFs (no routeId/date yet)
  const unassignedUploads = uploads.filter(u => !u.routeId && !u.date && u.status === 'pending')

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (pdfFiles.length > 0) {
      addMultipleUploads(pdfFiles)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone for new files */}
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />

        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">
          Arrastra PDFs aqui o
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="mr-1 h-3 w-3" />
          Seleccionar
        </Button>

        {/* Unassigned chips inline */}
        {unassignedUploads.length > 0 && (
          <div className="flex flex-wrap gap-1.5 ml-2">
            {unassignedUploads.map((upload) => (
              <PdfChip
                key={upload.id}
                uploadId={upload.id}
                fileName={upload.file?.name || 'Sin nombre'}
                onRemove={() => removeUpload(upload.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PdfChip({
  uploadId,
  fileName,
  onRemove,
}: {
  uploadId: string
  fileName: string
  onRemove: () => void
}) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', uploadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors"
    >
      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="max-w-[150px] truncate">{fileName}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="ml-0.5 rounded-sm hover:bg-destructive/20 p-0.5"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  )
}
