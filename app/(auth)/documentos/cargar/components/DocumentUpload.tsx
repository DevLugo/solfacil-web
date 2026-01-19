import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Camera, Upload, Loader2 } from 'lucide-react'
import { useDocumentUpload } from '../hooks/useDocumentUpload'

interface DocumentUploadProps {
  loanId: string
  personalDataId?: string
  documentType?: string
  onSuccess?: () => void
  onCancel?: () => void
  compact?: boolean
}

const DOCUMENT_TYPES = [
  { value: 'INE', label: 'INE' },
  { value: 'DOMICILIO', label: 'Comprobante de domicilio' },
  { value: 'PAGARE', label: 'Pagaré' },
  { value: 'OTRO', label: 'Otro' },
]

/**
 * Component for uploading documents from camera or gallery
 * Uploads immediately on file selection (no preview confirmation step)
 * Includes automatic image compression before upload
 */
export function DocumentUpload({
  loanId,
  personalDataId,
  documentType: presetDocumentType,
  onSuccess,
  onCancel,
  compact = false
}: DocumentUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [documentType, setDocumentType] = useState<string>(presetDocumentType || '')

  const { handleUpload, isProcessing, uploadProgress } = useDocumentUpload(loanId, personalDataId)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    clearFileInputs()

    try {
      await handleUpload(file, documentType)
      onSuccess?.()
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const clearFileInputs = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const getProgressLabel = () => uploadProgress < 50 ? 'Comprimiendo...' : 'Subiendo...'

  const renderFileInputs = () => (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isProcessing}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isProcessing}
      />
    </>
  )

  const renderProgress = (compact: boolean) => (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className="text-muted-foreground">{getProgressLabel()}</span>
        <span className="font-medium">{uploadProgress}%</span>
      </div>
      <Progress value={uploadProgress} className={compact ? "h-1" : ""} />
    </div>
  )

  const renderUploadButtons = (compact: boolean) => (
    <div className="flex gap-2">
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        onClick={() => cameraInputRef.current?.click()}
        disabled={isProcessing || (!compact && !documentType)}
        className="flex-1"
      >
        {!compact && isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <Camera className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} mr-${compact ? '1' : '2'}`} />
            {compact ? 'Foto' : 'Tomar foto'}
          </>
        )}
      </Button>
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        variant="outline"
        onClick={() => galleryInputRef.current?.click()}
        disabled={isProcessing || (!compact && !documentType)}
        className="flex-1"
      >
        <Upload className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} mr-${compact ? '1' : '2'}`} />
        {compact ? 'Galería' : 'Seleccionar'}
      </Button>
      {!compact && onCancel && (
        <Button type="button" onClick={onCancel} variant="ghost" disabled={isProcessing}>
          Cancelar
        </Button>
      )}
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-2">
        {renderFileInputs()}
        {isProcessing ? renderProgress(true) : renderUploadButtons(true)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {renderFileInputs()}

      {!presetDocumentType && (
        <div className="space-y-2">
          <Label htmlFor="document-type">
            Tipo de documento <span className="text-destructive">*</span>
          </Label>
          <Select value={documentType} onValueChange={setDocumentType} disabled={isProcessing}>
            <SelectTrigger id="document-type">
              <SelectValue placeholder="Selecciona el tipo de documento..." />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isProcessing && renderProgress(false)}
      {renderUploadButtons(false)}
    </div>
  )
}
