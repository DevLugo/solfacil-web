import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Camera, Upload, Loader2 } from 'lucide-react'
import { useDocumentUpload } from '../hooks/useDocumentUpload'
import { useToast } from '@/hooks/use-toast'
import { CameraCapture } from './CameraCapture'

// Max file size in MB before even attempting to process
// Lower for low-end devices to prevent browser memory crashes
const MAX_FILE_SIZE_MB = 8
const MAX_FILE_SIZE_LOW_END_MB = 3

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
  const [showCamera, setShowCamera] = useState(false)
  const { toast } = useToast()

  const { handleUpload, isProcessing, uploadProgress } = useDocumentUpload(loanId, personalDataId)

  const isLowEndDevice = () => {
    const cores = navigator.hardwareConcurrency || 2
    const memory = (navigator as any).deviceMemory || 4
    return cores <= 2 || memory < 4
  }

  const validateFileSize = (file: File): boolean => {
    const fileSizeMB = file.size / 1024 / 1024
    const maxSize = isLowEndDevice() ? MAX_FILE_SIZE_LOW_END_MB : MAX_FILE_SIZE_MB

    if (fileSizeMB > maxSize) {
      toast({
        title: 'Archivo muy grande',
        description: `La imagen pesa ${fileSizeMB.toFixed(1)}MB. El máximo es ${maxSize}MB. Toma la foto con menor resolución o usa la cámara directamente.`,
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const uploadFile = async (file: File) => {
    try {
      await handleUpload(file, documentType)
      onSuccess?.()
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    clearFileInputs()

    if (!validateFileSize(file)) return

    await uploadFile(file)
  }

  const clearFileInputs = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const handleCameraCapture = async (file: File) => {
    setShowCamera(false)
    await uploadFile(file)
  }

  const openCamera = () => {
    // On low-end devices, use custom camera with controlled resolution
    // On other devices, also use custom camera for consistent landscape photos
    setShowCamera(true)
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

  const renderProgress = (isCompact: boolean) => (
    <div className={isCompact ? "space-y-1" : "space-y-2"}>
      <div className={`flex items-center justify-between ${isCompact ? 'text-xs' : 'text-sm'}`}>
        <span className="text-muted-foreground">{getProgressLabel()}</span>
        <span className="font-medium">{uploadProgress}%</span>
      </div>
      <Progress value={uploadProgress} className={isCompact ? "h-1" : ""} />
    </div>
  )

  const renderUploadButtons = (isCompact: boolean) => {
    const isDisabled = isProcessing || (!isCompact && !documentType)
    const buttonSize = isCompact ? "sm" : "default"
    const iconSize = isCompact ? 'h-3 w-3' : 'h-4 w-4'
    const iconMargin = isCompact ? 'mr-1' : 'mr-2'

    return (
      <div className="flex gap-2">
        <Button
          type="button"
          size={buttonSize}
          onClick={openCamera}
          disabled={isDisabled}
          className="flex-1"
        >
          {!isCompact && isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Camera className={`${iconSize} ${iconMargin}`} />
              {isCompact ? 'Foto' : 'Tomar foto'}
            </>
          )}
        </Button>
        <Button
          type="button"
          size={buttonSize}
          variant="outline"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isDisabled}
          className="flex-1"
        >
          <Upload className={`${iconSize} ${iconMargin}`} />
          {isCompact ? 'Galería' : 'Seleccionar'}
        </Button>
        {!isCompact && onCancel && (
          <Button type="button" onClick={onCancel} variant="ghost" disabled={isProcessing}>
            Cancelar
          </Button>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <>
        {showCamera && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
        <div className="space-y-2">
          {renderFileInputs()}
          {isProcessing ? renderProgress(true) : renderUploadButtons(true)}
        </div>
      </>
    )
  }

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
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
    </>
  )
}
