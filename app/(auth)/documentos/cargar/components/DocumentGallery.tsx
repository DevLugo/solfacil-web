import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { XCircle, AlertTriangle, CheckCircle, ZoomIn } from 'lucide-react'
import { CloudinaryPresets } from '../utils/cloudinary'
import Image from 'next/image'

interface DocumentPhoto {
  id: string
  photoUrl: string
  publicId: string
  documentType: string
  isError: boolean
  errorDescription?: string
  isMissing: boolean
}

interface DocumentGalleryProps {
  documents: DocumentPhoto[]
  onValidate?: (documentId: string) => void
}

/**
 * Gallery component for viewing uploaded documents
 * Uses Cloudinary thumbnails for optimized mobile loading
 */
export function DocumentGallery({ documents, onValidate }: DocumentGalleryProps) {
  const [selectedDocument, setSelectedDocument] = useState<DocumentPhoto | null>(null)

  const getDocumentStatus = (doc: DocumentPhoto) => {
    if (doc.isMissing) return { label: 'Faltante', variant: 'destructive' as const, icon: AlertTriangle }
    if (doc.isError) return { label: 'Con error', variant: 'destructive' as const, icon: XCircle }
    return { label: 'Correcto', variant: 'default' as const, icon: CheckCircle }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hay documentos cargados</p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const status = getDocumentStatus(doc)
            const StatusIcon = status.icon

            return (
              <div key={doc.id} className="space-y-2">
                <div
                  className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedDocument(doc)}
                >
                  <Image
                    src={CloudinaryPresets.gridThumbnail(doc.publicId)}
                    alt={doc.documentType}
                    fill
                    className="object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2">
                    <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium truncate">{doc.documentType}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  {doc.errorDescription && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {doc.errorDescription}
                    </p>
                  )}
                </div>

                {onValidate && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => onValidate(doc.id)}
                  >
                    Validar
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Modal for viewing full image */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.documentType}</DialogTitle>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                <Image
                  src={CloudinaryPresets.modalPreview(selectedDocument.publicId)}
                  alt={selectedDocument.documentType}
                  fill
                  className="object-contain"
                />
              </div>

              <div className="flex items-center justify-between">
                <Badge variant={getDocumentStatus(selectedDocument).variant}>
                  {getDocumentStatus(selectedDocument).label}
                </Badge>

                {selectedDocument.errorDescription && (
                  <p className="text-sm text-muted-foreground">
                    {selectedDocument.errorDescription}
                  </p>
                )}
              </div>

              {onValidate && (
                <Button
                  className="w-full"
                  onClick={() => {
                    onValidate(selectedDocument.id)
                    setSelectedDocument(null)
                  }}
                >
                  Validar documento
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
