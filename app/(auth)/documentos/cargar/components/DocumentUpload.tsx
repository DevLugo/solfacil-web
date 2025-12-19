import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Camera, Upload, Loader2, X } from 'lucide-react'
import { useDocumentUpload } from '../hooks/useDocumentUpload'
import Image from 'next/image'

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
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<string>(presetDocumentType || '')

  const { handleUpload, isProcessing, uploadProgress } = useDocumentUpload(loanId, personalDataId)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setSelectedFile(file)
  }

  const handleClearPreview = () => {
    setPreview(null)
    setSelectedFile(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!selectedFile || !documentType) return

    try {
      await handleUpload(selectedFile, documentType)
      handleClearPreview()
      setDocumentType('')
      onSuccess?.()
    } catch (error) {
      // Error is handled by the hook
      console.error('Upload failed:', error)
    }
  }

  // Compact mode for inline upload
  if (compact) {
    return (
      <div className="space-y-2">
        {/* Hidden file inputs */}
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

        {/* Upload progress */}
        {isProcessing && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {uploadProgress < 50 ? 'Comprimiendo...' : 'Subiendo...'}
              </span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1" />
          </div>
        )}

        {!preview ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1"
            >
              <Camera className="h-3 w-3 mr-1" />
              Foto
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1"
            >
              <Upload className="h-3 w-3 mr-1" />
              Galería
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative aspect-video bg-muted rounded overflow-hidden">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-3 w-3 mr-1" />
                    Subir
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  handleClearPreview()
                  onCancel?.()
                }}
                disabled={isProcessing}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full mode with document type selector
  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
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

      {/* Document type selector - only show if not preset */}
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

      {/* Preview */}
      {preview && (
        <div className="relative">
          <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleClearPreview}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Upload progress */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {uploadProgress < 50 ? 'Comprimiendo imagen...' : 'Subiendo documento...'}
            </span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!preview ? (
          <>
            <Button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing || !documentType}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Tomar foto
            </Button>

            <Button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isProcessing || !documentType}
              variant="outline"
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing || !documentType}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir documento
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
