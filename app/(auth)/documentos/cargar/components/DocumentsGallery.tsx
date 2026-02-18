'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Upload, FileImage, CheckCircle2, AlertCircle, XCircle, FileX, X as CloseIcon, Pencil, Phone, MapPin, Save, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { DocumentUpload } from './DocumentUpload'
import { useQuery, useMutation, gql } from '@apollo/client'
import { GET_LOAN_DOCUMENTS } from '@/graphql/queries/documents'
import { UPDATE_LOAN_EXTENDED } from '@/graphql/mutations/transactions'
import { useToast } from '@/hooks/use-toast'
import { useDocumentMutations } from '@/hooks/useDocumentMutations'
import type { DocumentPhoto, Collateral } from '@/types/documents'
import { DOCUMENT_TYPES_CLIENTE, DOCUMENT_TYPES_AVAL } from '@/constants/documents'
import {
  findDocumentByType,
  getDocumentStatus,
  isDocumentMarkedAsMissing,
  getDocumentThumbnail,
} from '@/lib/documents'
import { EditClientForm } from '@/components/features/transactions/creditos/components/UnifiedClientAutocomplete/EditClientForm'
import { UnifiedClientAutocomplete } from '@/components/features/transactions/creditos/components/UnifiedClientAutocomplete'
import type { UnifiedClientValue } from '@/components/features/transactions/creditos/types'

interface DocumentsGalleryProps {
  loan: {
    id: string
    borrower: {
      id: string
      personalData: {
        id: string
        fullName: string
        clientCode: string
        phones?: { id: string; number: string }[]
      }
    }
    collaterals?: Collateral[]
    documentPhotos?: DocumentPhoto[]
    lead?: {
      id: string
      location?: {
        id: string
        name: string
      }
    }
  }
  onUploadSuccess?: () => void
}

/**
 * Document gallery component showing thumbnails for client and collateral documents
 * Allows uploading documents for both client and collateral
 */
export function DocumentsGallery({ loan, onUploadSuccess }: DocumentsGalleryProps) {
  const [selectedPerson, setSelectedPerson] = useState<'cliente' | string>('cliente')
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [viewingImage, setViewingImage] = useState<{ url: string; label: string } | null>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorDocType, setErrorDocType] = useState<string | null>(null)
  const [errorDescription, setErrorDescription] = useState('')
  const { toast } = useToast()

  // Client editing state
  const [isEditingClient, setIsEditingClient] = useState(false)
  const [editClientName, setEditClientName] = useState('')
  const [editClientPhone, setEditClientPhone] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  // Aval editing state
  const [selectedAval, setSelectedAval] = useState<UnifiedClientValue | null>(null)
  const [originalAvalId, setOriginalAvalId] = useState<string | null>(null)
  const [savingAval, setSavingAval] = useState(false)

  const [updateLoanExtended] = useMutation(UPDATE_LOAN_EXTENDED)

  // Initialize aval state when loan changes
  useEffect(() => {
    if (loan.collaterals && loan.collaterals.length > 0) {
      const collateral = loan.collaterals[0]
      setOriginalAvalId(collateral.id)
      setSelectedAval({
        id: collateral.id,
        personalDataId: collateral.id,
        phoneId: collateral.phones?.[0]?.id,
        fullName: collateral.fullName,
        phone: collateral.phones?.[0]?.number,
        locationId: loan.lead?.location?.id,
        locationName: loan.lead?.location?.name,
        isFromCurrentLocation: true,
        originalFullName: collateral.fullName,
        originalPhone: collateral.phones?.[0]?.number,
        clientState: 'existing',
        action: 'connect',
      })
    } else {
      setSelectedAval(null)
      setOriginalAvalId(null)
    }
  }, [loan.id, loan.collaterals, loan.lead?.location])

  // Check if aval has changes
  const hasAvalChanges = Boolean(
    selectedAval &&
    (selectedAval.action === 'create' ||
      (selectedAval.id && selectedAval.id !== originalAvalId) ||
      (selectedAval.action === 'update' &&
        (selectedAval.fullName !== selectedAval.originalFullName ||
          selectedAval.phone !== selectedAval.originalPhone)))
  )

  // Handle client edit start
  const handleStartEditClient = () => {
    setEditClientName(loan.borrower.personalData.fullName || '')
    setEditClientPhone(loan.borrower.personalData.phones?.[0]?.number || '')
    setIsEditingClient(true)
  }

  // Handle client save
  const handleSaveClient = async () => {
    const originalName = loan.borrower.personalData.fullName || ''
    const originalPhone = loan.borrower.personalData.phones?.[0]?.number || ''

    const hasNameChange = editClientName !== originalName
    const hasPhoneChange = editClientPhone !== originalPhone

    if (!hasNameChange && !hasPhoneChange) {
      toast({ title: 'Sin cambios', description: 'No hay cambios que guardar' })
      setIsEditingClient(false)
      return
    }

    setSavingClient(true)
    try {
      const input: { borrowerName?: string; borrowerPhone?: string } = {}
      if (hasNameChange) input.borrowerName = editClientName
      if (hasPhoneChange) input.borrowerPhone = editClientPhone

      await updateLoanExtended({ variables: { id: loan.id, input } })

      toast({
        title: 'Cliente actualizado',
        description: 'Los datos del cliente se guardaron correctamente',
      })
      setIsEditingClient(false)
      onUploadSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el cliente',
        variant: 'destructive',
      })
    } finally {
      setSavingClient(false)
    }
  }

  // Handle aval save
  const handleSaveAval = async () => {
    if (!selectedAval || !hasAvalChanges) return

    const input: {
      collateralIds?: string[]
      collateralPhone?: string
      newCollateral?: {
        fullName: string
        phones?: { number: string }[]
        addresses?: { street: string; locationId: string }[]
      }
    } = {}

    if (selectedAval.action === 'create') {
      input.newCollateral = {
        fullName: selectedAval.fullName,
        phones: selectedAval.phone ? [{ number: selectedAval.phone }] : undefined,
        addresses: loan.lead?.location?.id ? [{ street: '', locationId: loan.lead.location.id }] : undefined,
      }
    } else if (selectedAval.id && selectedAval.id !== originalAvalId) {
      input.collateralIds = [selectedAval.id]
    } else if (selectedAval.action === 'update' && selectedAval.phone !== selectedAval.originalPhone) {
      input.collateralPhone = selectedAval.phone
    }

    if (Object.keys(input).length === 0) return

    setSavingAval(true)
    try {
      await updateLoanExtended({ variables: { id: loan.id, input } })

      if (selectedAval.id && selectedAval.id !== originalAvalId) {
        setOriginalAvalId(selectedAval.id)
      }

      toast({
        title: 'Aval actualizado',
        description: 'Los datos del aval se guardaron correctamente',
      })
      onUploadSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el aval',
        variant: 'destructive',
      })
    } finally {
      setSavingAval(false)
    }
  }

  // Use custom hook for mutations with consistent refetch queries
  const { markAsMissing, deleteDocument, updateDocument, loading } = useDocumentMutations({
    loanId: loan.id,
  })

  // Query to get updated documents - use cache-and-network to always check for updates
  const { data: loanData, loading: loanDataLoading, refetch } = useQuery(GET_LOAN_DOCUMENTS, {
    variables: { loanId: loan.id },
    fetchPolicy: 'cache-and-network', // Always check for updates while using cache
  })

  // Use documents from cache if available, otherwise use prop
  const currentLoan = loanData?.loan || loan

  // Get documents for current person
  // Use selectedAval.id when user changes aval via autocomplete, otherwise use tab value
  const currentPersonId = selectedPerson === 'cliente'
    ? loan.borrower.personalData.id
    : selectedAval?.id || selectedPerson

  const personDocuments = currentLoan.documentPhotos?.filter(
    (doc: DocumentPhoto) => doc.personalData?.id === currentPersonId
  ) || []

  // Get document types for current person
  const documentTypes = selectedPerson === 'cliente'
    ? DOCUMENT_TYPES_CLIENTE
    : DOCUMENT_TYPES_AVAL

  // Get person name - use selectedAval.fullName when aval is changed
  const personName = selectedPerson === 'cliente'
    ? loan.borrower.personalData.fullName
    : selectedAval?.fullName || loan.collaterals?.find(c => c.id === selectedPerson)?.fullName || ''

  const handleUploadSuccess = () => {
    setUploadingType(null)
    onUploadSuccess?.()
  }

  const handleMarkAsError = async (docType: string, description?: string) => {
    try {
      // Find the document using utility function
      const doc = findDocumentByType(personDocuments, docType)

      if (!doc) {
        toast({
          title: 'Error',
          description: 'No se encontró el documento para marcar como error',
          variant: 'destructive',
        })
        return
      }

      await updateDocument({
        variables: {
          id: doc.id,
          input: {
            isError: true,
            isMissing: false,
            errorDescription: description || 'Documento con error',
          },
        },
      })

      toast({
        title: 'Documento marcado con error',
        description: 'El documento ha sido marcado como erróneo',
      })

      // Close the error dialog
      setErrorDialogOpen(false)
      setErrorDocType(null)
      setErrorDescription('')

      // Trigger refetch
      onUploadSuccess?.()
    } catch (error) {
      console.error('Error marking document as error:', error)
      toast({
        title: 'Error',
        description: 'No se pudo marcar el documento como erróneo',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteDocument = async (docType: string) => {
    try {
      // Find any document with this type (missing or with image) using utility function
      const doc = findDocumentByType(personDocuments, docType)

      if (!doc) {
        console.error('No document found to delete')
        toast({
          title: 'Error',
          description: 'No se encontró el documento',
          variant: 'destructive',
        })
        return
      }

      console.log('Attempting to delete document:', {
        id: doc.id,
        documentType: doc.documentType,
        isMissing: doc.isMissing,
        hasPhotoUrl: !!doc.photoUrl,
        photoUrl: doc.photoUrl
      })

      const isMissingDoc = doc.isMissing
      const hasImage = !!(doc.photoUrl && doc.photoUrl !== '')

      const result = await deleteDocument({
        variables: {
          id: doc.id,
        },
      })

      console.log('Delete result:', result)

      // Show appropriate message based on what was deleted
      if (isMissingDoc) {
        toast({
          title: 'Documento desmarcado',
          description: 'El documento ya no está marcado como "Sin documento"',
        })
      } else if (hasImage) {
        toast({
          title: 'Documento eliminado',
          description: 'La imagen del documento ha sido eliminada',
        })
      } else {
        toast({
          title: 'Documento eliminado',
          description: 'El documento ha sido eliminado',
        })
      }

      // Call the onUploadSuccess callback to trigger a refetch
      onUploadSuccess?.()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el documento',
        variant: 'destructive',
      })
    }
  }

  const handleMarkAsMissing = async (docType: string) => {
    try {
      await markAsMissing({
        variables: {
          input: {
            loanId: loan.id,
            personalDataId: currentPersonId,
            documentType: docType,
          },
        },
        // Optimistic response to update UI immediately
        optimisticResponse: {
          markDocumentAsMissing: {
            __typename: 'DocumentPhoto',
            id: `temp-${Date.now()}`,
            documentType: docType,
            isMissing: true,
            isError: false,
            errorDescription: null,
            photoUrl: '',
            publicId: '',
            title: `${docType} - Sin documento`,
            description: 'Documento marcado como no disponible',
            personalData: {
              __typename: 'PersonalData',
              id: currentPersonId,
              fullName: personName,
            },
            loan: {
              __typename: 'Loan',
              id: loan.id,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        update: (cache, { data }) => {
          if (!data?.markDocumentAsMissing) return

          const newDocument = data.markDocumentAsMissing

          // Update the loan's documentPhotos in cache
          cache.modify({
            id: cache.identify({ __typename: 'Loan', id: loan.id }),
            fields: {
              documentPhotos(existingDocs = [], { readField }) {
                // Check if document already exists
                const existingIndex = existingDocs.findIndex(
                  (docRef: { __ref: string }) => {
                    const docPersonalDataId = readField('id', readField('personalData', docRef))
                    return (
                      readField('documentType', docRef) === docType &&
                      docPersonalDataId === currentPersonId
                    )
                  }
                )

                const newDocRef = cache.writeFragment({
                  data: newDocument,
                  fragment: gql`
                    fragment NewDoc on DocumentPhoto {
                      id
                      documentType
                      isMissing
                      isError
                      photoUrl
                      publicId
                      title
                      description
                      personalData {
                        id
                        fullName
                      }
                    }
                  `,
                })

                if (existingIndex >= 0) {
                  // Replace existing
                  const updated = [...existingDocs]
                  updated[existingIndex] = newDocRef
                  return updated
                }

                // Add new
                return [...existingDocs, newDocRef]
              },
            },
          })
        },
      })

      // Show success toast only
      toast({
        title: 'Documento marcado',
        description: 'El documento ha sido marcado como "Sin documento"',
      })

      // Call the onUploadSuccess callback to trigger a refetch
      onUploadSuccess?.()
    } catch (error) {
      // Error toast is now handled by Apollo error link automatically
      console.error('Error marking document as missing:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Person selector */}
      <Tabs value={selectedPerson} onValueChange={setSelectedPerson}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${1 + (loan.collaterals?.length || 0)}, 1fr)` }}>
          <TabsTrigger value="cliente">
            Cliente
          </TabsTrigger>
          {loan.collaterals?.map((collateral) => (
            <TabsTrigger key={collateral.id} value={collateral.id}>
              Aval
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedPerson} className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          {/* Location info - always visible */}
          {loan.lead?.location?.name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
              <MapPin className="h-3 w-3" />
              <span>{loan.lead.location.name}</span>
            </div>
          )}

          {/* Person info - unified structure for client and aval */}
          <div className="space-y-2">
            {/* Header with label and save button (for aval with changes) */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                {selectedPerson === 'cliente' ? 'Cliente (Titular)' : 'Aval'}
              </Label>
              {selectedPerson !== 'cliente' && hasAvalChanges && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveAval}
                  disabled={savingAval}
                  className="h-7 text-xs"
                >
                  {savingAval ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      Guardar
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Content - client or aval */}
            {selectedPerson === 'cliente' ? (
              // Client editing
              isEditingClient ? (
                <EditClientForm
                  mode="borrower"
                  name={editClientName}
                  phone={editClientPhone}
                  isSaving={savingClient}
                  onNameChange={setEditClientName}
                  onPhoneChange={setEditClientPhone}
                  onConfirm={handleSaveClient}
                  onCancel={() => setIsEditingClient(false)}
                />
              ) : (
                <div className="flex items-center gap-2 py-1.5 px-2.5 border rounded-md bg-background">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{personName || 'Sin nombre'}</span>
                    {loan.borrower.personalData.phones?.[0]?.number && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Phone className="h-3 w-3" />
                        {loan.borrower.personalData.phones[0].number}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={handleStartEditClient}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            ) : (
              // Aval editing with visual indicator for unsaved changes
              <div className={`rounded-md transition-all ${hasAvalChanges ? 'ring-2 ring-amber-400' : ''}`}>
                <UnifiedClientAutocomplete
                  mode="aval"
                  value={selectedAval}
                  onValueChange={setSelectedAval}
                  excludeBorrowerId={loan.borrower.id}
                  locationId={loan.lead?.location?.id}
                  placeholder="Buscar o crear aval..."
                  allowCreate
                  allowEdit
                />
              </div>
            )}

            {/* Client code - unified styling */}
            <p className="text-xs text-muted-foreground px-1">
              Código: {selectedPerson === 'cliente'
                ? loan.borrower.personalData.clientCode
                : loan.collaterals?.find(c => c.id === selectedPerson)?.clientCode || '-'}
            </p>
          </div>

          {/* Document grid - responsive and compact */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            {documentTypes.map((docType) => {
              const status = getDocumentStatus(personDocuments, docType.value)
              const thumbnail = getDocumentThumbnail(personDocuments, docType.value)
              const isUploading = uploadingType === docType.value

              return (
                <Card
                  key={docType.value}
                  className={`overflow-hidden ${
                    status === 'missing' ? 'border-2 border-yellow-500' :
                    status === 'error' ? 'border-2 border-red-500' :
                    ''
                  }`}
                >
                  <CardContent className="p-0">
                    {/* Thumbnail or placeholder - much smaller on mobile */}
                    <div
                      className={`relative aspect-square bg-muted ${thumbnail ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                      onClick={() => {
                        if (thumbnail) {
                          const doc = findDocumentByType(personDocuments, docType.value)
                          if (doc?.photoUrl) {
                            setViewingImage({ url: doc.photoUrl, label: docType.label })
                          }
                        }
                      }}
                    >
                      {thumbnail ? (
                        <Image
                          src={thumbnail}
                          alt={docType.label}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <FileImage className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground/30" />
                        </div>
                      )}

                      {/* Overlay for missing documents - very visible */}
                      {status === 'missing' && (
                        <div className="absolute inset-0 bg-yellow-500/20 backdrop-blur-[2px] flex flex-col items-center justify-center">
                          <FileX className="w-10 h-10 md:w-16 md:h-16 text-yellow-600 mb-1 md:mb-2" />
                          <span className="text-yellow-700 font-bold text-xs md:text-sm">SIN DOCUMENTO</span>
                        </div>
                      )}

                      {/* Overlay for error documents - very visible */}
                      {status === 'error' && (
                        <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[2px] flex flex-col items-center justify-center">
                          <AlertCircle className="w-10 h-10 md:w-16 md:h-16 text-red-600 mb-1 md:mb-2" />
                          <span className="text-red-700 font-bold text-xs md:text-sm">ERROR</span>
                        </div>
                      )}

                      {/* Status badge - only show for problematic documents */}
                      {(status === 'error' || status === 'missing') && (
                        <div className="absolute top-1 right-1 md:top-2 md:right-2">
                          {status === 'error' && (
                            <Badge variant="destructive" className="text-[10px] md:text-xs px-1 py-0 md:px-2 md:py-1">
                              <AlertCircle className="w-2 h-2 md:w-3 md:h-3 md:mr-1" />
                              <span className="hidden md:inline">Error</span>
                            </Badge>
                          )}
                          {status === 'missing' && (
                            <Badge variant="secondary" className="bg-yellow-600 text-white text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1">
                              <FileX className="w-2.5 h-2.5 md:w-3 md:h-3 md:mr-1" />
                              <span>Sin doc</span>
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Document info and actions - compact on mobile */}
                    <div className="p-2 md:p-3 space-y-2">
                      <div>
                        <p className="font-medium text-xs md:text-sm flex items-center gap-1">
                          <span className="text-sm md:text-base">{docType.icon}</span>
                          <span className="line-clamp-1">{docType.label}</span>
                        </p>
                      </div>

                      {isUploading ? (
                        <DocumentUpload
                          loanId={loan.id}
                          personalDataId={currentPersonId}
                          documentType={docType.value}
                          onSuccess={handleUploadSuccess}
                          onCancel={() => setUploadingType(null)}
                          compact
                        />
                      ) : status === 'missing' ? (
                        // Document is marked as missing - show upload button and unmark option
                        <div className="space-y-1.5">
                          <p className="text-[10px] md:text-xs text-yellow-700 font-medium text-center">
                            Marcado como no disponible
                          </p>
                          <Button
                            size="sm"
                            variant="default"
                            className="w-full text-xs md:text-sm h-7 md:h-8"
                            onClick={() => setUploadingType(docType.value)}
                            disabled={loading.deletingDocument}
                          >
                            <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            Subir documento
                          </Button>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs md:text-sm h-7 md:h-8"
                              onClick={() => handleDeleteDocument(docType.value)}
                              disabled={loading.deletingDocument}
                            >
                              <XCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              Desmarcar
                            </Button>
                          </div>
                        </div>
                      ) : status === 'error' ? (
                        // Document marked as error - show actions
                        <div className="space-y-1.5">
                          <p className="text-[10px] md:text-xs text-red-700 font-medium text-center truncate">
                            {findDocumentByType(personDocuments, docType.value)?.errorDescription || 'Documento con error'}
                          </p>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 text-xs md:text-sm h-7 md:h-8"
                              onClick={() => setUploadingType(docType.value)}
                            >
                              <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              Reemplazar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs md:text-sm h-7 md:h-8 px-2"
                              onClick={() => handleDeleteDocument(docType.value)}
                              disabled={loading.deletingDocument}
                              title="Eliminar"
                            >
                              <XCircle className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Normal state - show upload and action buttons
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant={thumbnail ? "outline" : "default"}
                              className="flex-1 text-xs md:text-sm h-7 md:h-8"
                              onClick={() => setUploadingType(docType.value)}
                            >
                              <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              {thumbnail ? 'Reemplazar' : 'Subir'}
                            </Button>
                            {thumbnail && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs md:text-sm h-7 md:h-8 px-2"
                                onClick={() => handleDeleteDocument(docType.value)}
                                disabled={loading.deletingDocument}
                                title="Eliminar imagen"
                              >
                                <XCircle className="w-3 h-3 md:w-4 md:h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            {!thumbnail && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs md:text-sm h-7 md:h-8 border-yellow-300 hover:bg-yellow-50"
                                onClick={() => handleMarkAsMissing(docType.value)}
                                disabled={loading.markingAsMissing}
                              >
                                <FileX className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                Sin doc
                              </Button>
                            )}
                            {thumbnail && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs md:text-sm h-7 md:h-8 border-red-300 hover:bg-red-50"
                                onClick={() => {
                                  setErrorDocType(docType.value)
                                  setErrorDialogOpen(true)
                                }}
                                disabled={loading.updatingDocument}
                              >
                                <AlertCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                Marcar error
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[95vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{viewingImage?.label}</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <div className="relative w-full h-[70vh] md:h-[80vh] bg-black">
              <Image
                src={viewingImage.url}
                alt={viewingImage.label}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 95vw, 80vw"
                quality={100}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar documento con error</DialogTitle>
            <DialogDescription>
              Describe qué está mal con el documento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="error-description">Descripción del error</Label>
              <Textarea
                id="error-description"
                placeholder="Ej: La imagen está borrosa, el documento está cortado, etc."
                value={errorDescription}
                onChange={(e) => setErrorDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setErrorDialogOpen(false)
                  setErrorDocType(null)
                  setErrorDescription('')
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (errorDocType) {
                    handleMarkAsError(errorDocType, errorDescription || undefined)
                  }
                }}
                disabled={loading.updatingDocument}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Marcar con error
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
