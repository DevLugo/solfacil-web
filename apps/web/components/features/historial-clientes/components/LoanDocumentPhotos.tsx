'use client'

import { useState, useCallback } from 'react'
import { useLazyQuery } from '@apollo/client'
import { ChevronDown, ChevronUp, Image, AlertCircle, Loader2, ImageOff, User, UserCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { GET_LOAN_DOCUMENT_PHOTOS_QUERY } from '@/graphql/queries/clients'

interface PersonalDataInfo {
  id: string
  fullName: string
}

interface LoanInfo {
  id: string
  borrower: {
    id: string
    personalData: PersonalDataInfo | null
  } | null
  collaterals: PersonalDataInfo[]
}

interface DocumentPhoto {
  id: string
  title: string | null
  description: string | null
  photoUrl: string
  publicId: string
  documentType: string
  isError: boolean
  errorDescription: string | null
  isMissing: boolean
  createdAt: string
  personalData: PersonalDataInfo | null
  loan: LoanInfo | null
}

interface LoanDocumentPhotosProps {
  loanId: string
  loanDate: string
}

interface PhotoGroup {
  ownerId: string
  ownerName: string
  ownerType: 'CLIENT' | 'COLLATERAL'
  photos: DocumentPhoto[]
}

const documentTypeLabels: Record<string, string> = {
  INE: 'INE',
  DOMICILIO: 'Comprobante de Domicilio',
  PAGARE: 'Pagaré',
  OTRO: 'Otro',
}

function ImageWithFallback({
  src,
  alt,
  className,
  onImageClick,
  isMissing,
}: {
  src: string
  alt: string
  className?: string
  onImageClick: () => void
  isMissing?: boolean
}) {
  const [hasError, setHasError] = useState(false)

  // Si el documento está marcado como faltante, mostrar placeholder directamente
  if (isMissing) {
    return (
      <div
        className={cn(
          'w-full h-full flex flex-col items-center justify-center bg-muted cursor-pointer',
          className
        )}
        onClick={onImageClick}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground mb-1" />
        <span className="text-[10px] text-muted-foreground text-center px-2">
          No capturado
        </span>
      </div>
    )
  }

  // Si hubo error al cargar
  if (hasError) {
    return (
      <div
        className={cn(
          'w-full h-full flex flex-col items-center justify-center bg-muted cursor-pointer',
          className
        )}
        onClick={onImageClick}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground mb-1" />
        <span className="text-[10px] text-muted-foreground text-center px-2">
          Error al cargar
        </span>
      </div>
    )
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn('w-full h-full object-cover cursor-pointer', className)}
        loading="lazy"
        onClick={onImageClick}
        onError={() => {
          setHasError(true)
        }}
      />
    </>
  )
}

export function LoanDocumentPhotos({ loanId, loanDate }: LoanDocumentPhotosProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<DocumentPhoto | null>(null)

  const [fetchPhotos, { data, loading, error, called }] = useLazyQuery(
    GET_LOAN_DOCUMENT_PHOTOS_QUERY,
    {
      variables: { loanId, limit: 50 },
      fetchPolicy: 'cache-first',
    }
  )

  const photos: DocumentPhoto[] = data?.documentPhotos || []

  // Agrupar fotos por propietario (cliente o aval)
  const photoGroups: PhotoGroup[] = photos.reduce((groups: PhotoGroup[], photo) => {
    if (!photo.personalData || !photo.loan) {
      // Omitir fotos sin identificación
      return groups
    }

    const borrowerPersonalDataId = photo.loan.borrower?.personalData?.id
    const isClient = photo.personalData.id === borrowerPersonalDataId

    let ownerType: 'CLIENT' | 'COLLATERAL' = 'COLLATERAL'
    if (isClient) {
      ownerType = 'CLIENT'
    }

    // Buscar grupo existente para este propietario
    let group = groups.find((g) => g.ownerId === photo.personalData!.id)

    if (!group) {
      group = {
        ownerId: photo.personalData.id,
        ownerName: photo.personalData.fullName,
        ownerType,
        photos: [],
      }
      groups.push(group)
    }

    group.photos.push(photo)
    return groups
  }, [])

  // Ordenar grupos: cliente primero, luego avales
  photoGroups.sort((a, b) => {
    if (a.ownerType === 'CLIENT' && b.ownerType !== 'CLIENT') return -1
    if (a.ownerType !== 'CLIENT' && b.ownerType === 'CLIENT') return 1
    return a.ownerName.localeCompare(b.ownerName)
  })

  const handleToggle = useCallback(() => {
    if (!isExpanded && !called) {
      fetchPhotos()
    }
    setIsExpanded((prev) => !prev)
  }, [isExpanded, called, fetchPhotos])

  const handlePhotoClick = useCallback((photo: DocumentPhoto) => {
    setSelectedPhoto(photo)
  }, [])

  const hasPhotos = called && photos.length > 0
  const hasNoPhotos = called && !loading && photos.length === 0

  return (
    <>
      <Card className="mb-4 overflow-hidden">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-3 h-auto"
          onClick={handleToggle}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              Documentos ({loanDate})
            </span>
            {hasPhotos && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">
                {photos.length}
              </span>
            )}
            {hasNoPhotos && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                Sin docs
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </Button>

        {isExpanded && (
          <div className="px-3 pb-3">
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Cargando documentos...
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 py-4 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Error al cargar documentos</span>
              </div>
            )}

            {hasNoPhotos && (
              <div className="text-center py-4 text-muted-foreground">
                <Image className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin documentos asociados</p>
              </div>
            )}

            {hasPhotos && (
              <div className="space-y-4">
                {photoGroups.map((group) => (
                  <div key={group.ownerId} className="space-y-2">
                    {/* Encabezado del grupo */}
                    <div className="flex items-center gap-2 py-1 border-b border-border">
                      {group.ownerType === 'CLIENT' ? (
                        <UserCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                      )}
                      <span className="text-sm font-medium">
                        {group.ownerType === 'CLIENT' ? 'Cliente' : 'Aval'}: {group.ownerName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {group.photos.length} {group.photos.length === 1 ? 'documento' : 'documentos'}
                      </span>
                    </div>

                    {/* Cuadrícula de fotos */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {group.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className={cn(
                            'relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:scale-105',
                            photo.isError
                              ? 'border-destructive'
                              : photo.isMissing
                              ? 'border-yellow-500 dark:border-yellow-400'
                              : 'border-transparent hover:border-primary'
                          )}
                        >
                          <ImageWithFallback
                            src={photo.photoUrl}
                            alt={photo.title || documentTypeLabels[photo.documentType] || 'Documento'}
                            onImageClick={() => handlePhotoClick(photo)}
                            isMissing={photo.isMissing}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                            <span className="text-[10px] text-white font-medium truncate block">
                              {documentTypeLabels[photo.documentType] || photo.documentType}
                            </span>
                          </div>
                          {photo.isError && (
                            <div className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[8px] px-1 rounded">
                              Error
                            </div>
                          )}
                          {photo.isMissing && (
                            <div className="absolute top-1 right-1 bg-yellow-500 text-black dark:bg-yellow-400 text-[8px] px-1 rounded">
                              Falta
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modal de foto a tamaño completo */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">
            {selectedPhoto?.title || documentTypeLabels[selectedPhoto?.documentType || ''] || 'Documento'}
          </DialogTitle>
          {selectedPhoto && (
            <div className="space-y-2">
              {selectedPhoto.isMissing ? (
                <div className="flex flex-col items-center justify-center p-12 bg-muted rounded-lg min-h-[40vh]">
                  <ImageOff className="h-16 w-16 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">No capturado</p>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedPhoto.photoUrl}
                  alt={selectedPhoto.title || 'Documento'}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={(e) => {
                    const img = e.currentTarget
                    if (img.requestFullscreen) {
                      img.requestFullscreen()
                    }
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      const placeholder = document.createElement('div')
                      placeholder.className = 'flex flex-col items-center justify-center p-12 bg-muted rounded-lg'
                      placeholder.innerHTML = `
                        <svg class="h-16 w-16 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p class="text-muted-foreground text-sm">Error al cargar</p>
                      `
                      parent.insertBefore(placeholder, target)
                    }
                  }}
                />
              )}
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">
                      {documentTypeLabels[selectedPhoto.documentType] || selectedPhoto.documentType}
                    </span>
                    {selectedPhoto.title && (
                      <span className="text-muted-foreground ml-2">
                        {selectedPhoto.title}
                      </span>
                    )}
                  </div>
                  {selectedPhoto.isError && (
                    <span className="text-destructive text-xs">
                      Error: {selectedPhoto.errorDescription || 'Sin descripción'}
                    </span>
                  )}
                </div>
                {selectedPhoto.personalData && (
                  <div className="text-xs text-muted-foreground">
                    Propietario: {selectedPhoto.personalData.fullName}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
