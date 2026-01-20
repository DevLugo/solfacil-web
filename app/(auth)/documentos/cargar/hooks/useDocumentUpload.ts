import { useState } from 'react'
import { useMutation, useApolloClient, gql } from '@apollo/client'
import imageCompression from 'browser-image-compression'
import { UPLOAD_DOCUMENT_PHOTO, UPDATE_DOCUMENT_PHOTO } from '@/graphql/mutations/documents'
import { useToast } from '@/hooks/use-toast'
import { uploadFileWithGraphQL } from '@/lib/apollo-client'

export interface ValidationOptions {
  isError?: boolean
  isMissing?: boolean
  errorDescription?: string
}

export interface UploadOptions extends ValidationOptions {
  title?: string
  description?: string
}

/**
 * Hook for handling document upload with image compression
 * Optimized for mobile devices with low RAM
 */
export function useDocumentUpload(loanId: string, personalDataId?: string) {
  const { toast } = useToast()
  const apolloClient = useApolloClient()
  const [isCompressing, setIsCompressing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [updateDocument, { loading: isUpdating }] = useMutation(UPDATE_DOCUMENT_PHOTO)

  const isLowEndDevice = () => {
    const cores = navigator.hardwareConcurrency || 2
    // navigator.deviceMemory returns GB (e.g., 2, 4, 8) - only available in Chrome/Edge
    const memory = (navigator as any).deviceMemory || 4
    return cores <= 2 || memory < 4
  }

  const canUseWebWorker = () => {
    const hasWorkerSupport = typeof Worker !== 'undefined'
    const hasEnoughCores = navigator.hardwareConcurrency === undefined || navigator.hardwareConcurrency > 2
    return hasWorkerSupport && hasEnoughCores
  }

  const createCompressedFile = (compressedBlob: Blob, originalName: string): File => {
    return new File(
      [compressedBlob],
      originalName.replace(/\.[^.]+$/, '.jpg'),
      { type: 'image/jpeg', lastModified: Date.now() }
    )
  }

  const isMemoryError = (error: unknown): boolean => {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase()
      return msg.includes('memory') ||
             msg.includes('memoria') ||
             msg.includes('heap') ||
             msg.includes('allocation') ||
             msg.includes('aw, snap') // Chrome crash message
    }
    return false
  }

  // Help garbage collector by clearing any lingering references
  const triggerGarbageCollection = () => {
    // Create and immediately discard a large array to hint GC to run
    // This is a common trick to encourage browser GC
    if (isLowEndDevice()) {
      try {
        const temp = new Array(1000000).fill(0)
        temp.length = 0
      } catch {
        // Ignore if this itself causes memory issues
      }
    }
  }

  const compressImage = async (file: File): Promise<File> => {
    const lowEnd = isLowEndDevice()
    const fileSizeMB = file.size / 1024 / 1024

    // For very large files on low-end devices, warn immediately
    if (lowEnd && fileSizeMB > 5) {
      toast({
        title: 'Imagen muy grande',
        description: 'Tu dispositivo tiene poca memoria. Intenta tomar la foto con menor resolución.',
        variant: 'destructive',
      })
      throw new Error('Archivo demasiado grande para este dispositivo')
    }

    // More aggressive compression for low-end devices
    const options = {
      maxSizeMB: lowEnd ? 0.3 : 0.5,
      maxWidthOrHeight: lowEnd ? 600 : 800,
      useWebWorker: canUseWebWorker(),
      fileType: 'image/jpeg' as const,
      initialQuality: lowEnd ? 0.5 : 0.7,
    }

    setIsCompressing(true)
    try {
      const compressedBlob = await imageCompression(file, options)
      const compressedFile = createCompressedFile(compressedBlob, file.name)

      const toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2)
      console.log(`Compressed: ${toMB(file.size)}MB → ${toMB(compressedFile.size)}MB`)

      // Help release memory after compression
      triggerGarbageCollection()

      return compressedFile
    } catch (error) {
      console.error('Error compressing image:', error)

      // Specific message for memory errors
      if (isMemoryError(error)) {
        toast({
          title: 'Memoria insuficiente',
          description: 'Tu dispositivo no tiene suficiente memoria. Cierra otras apps y recarga la página antes de intentar de nuevo.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error al comprimir imagen',
          description: 'No se pudo comprimir la imagen. Intenta con una imagen más pequeña.',
          variant: 'destructive',
        })
      }
      throw error
    } finally {
      setIsCompressing(false)
      // Always try to help GC after compression attempt
      triggerGarbageCollection()
    }
  }

  const UPLOAD_TIMEOUT_MS = 120000
  const QUERIES_TO_REFETCH = ['GetLoansByWeekAndLocation', 'GetLoanDocuments']

  const DOCUMENT_FRAGMENT = gql`
    fragment UploadedDoc on DocumentPhoto {
      id
      photoUrl
      publicId
      documentType
      isError
      isMissing
      errorDescription
      title
      description
      personalData {
        id
        fullName
      }
      createdAt
      updatedAt
    }
  `

  const writeToCacheFragment = (uploadedDoc: any) => {
    apolloClient.cache.writeFragment({
      id: apolloClient.cache.identify({
        __typename: 'DocumentPhoto',
        id: uploadedDoc.id
      }),
      fragment: DOCUMENT_FRAGMENT,
      data: uploadedDoc
    })
  }

  const handleUpload = async (
    file: File,
    documentType: string,
    options?: UploadOptions
  ) => {
    try {
      setUploadProgress(10)

      const compressedFile = await compressImage(file)
      setUploadProgress(50)

      setIsUploading(true)
      const result = await uploadFileWithGraphQL({
        file: compressedFile,
        query: UPLOAD_DOCUMENT_PHOTO.loc!.source.body,
        variables: {
          input: {
            documentType,
            loanId,
            personalDataId,
            isError: options?.isError || false,
            isMissing: options?.isMissing || false,
            errorDescription: options?.errorDescription,
            title: options?.title,
            description: options?.description,
          },
        },
        operationName: 'UploadDocumentPhoto',
        timeoutMs: UPLOAD_TIMEOUT_MS,
      })

      setUploadProgress(100)

      if (result.uploadDocumentPhoto) {
        writeToCacheFragment(result.uploadDocumentPhoto)
      }

      await apolloClient.refetchQueries({
        include: QUERIES_TO_REFETCH,
        onQueryUpdated: () => true,
      })

      toast({
        title: 'Documento subido',
        description: 'El documento se ha subido correctamente.',
      })

      return result.uploadDocumentPhoto
    } catch (error) {
      console.error('Error uploading document:', error)
      toast({
        title: 'Error al subir documento',
        description: error instanceof Error ? error.message : 'No se pudo subir el documento.',
        variant: 'destructive',
      })
      throw error
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const getValidationStatus = (options: ValidationOptions): string => {
    if (options.isError) return 'con error'
    if (options.isMissing) return 'faltante'
    return 'correcto'
  }

  const handleValidation = async (
    documentId: string,
    options: ValidationOptions
  ) => {
    try {
      const result = await updateDocument({
        variables: {
          id: documentId,
          input: {
            isError: options.isError || false,
            isMissing: options.isMissing || false,
            errorDescription: options.errorDescription,
          },
        },
        refetchQueries: QUERIES_TO_REFETCH,
        awaitRefetchQueries: true,
      })

      toast({
        title: 'Documento validado',
        description: `El documento ha sido marcado como ${getValidationStatus(options)}.`,
      })

      return result.data?.updateDocumentPhoto
    } catch (error) {
      console.error('Error validating document:', error)
      throw error
    }
  }

  return {
    // Upload functions
    handleUpload,
    handleValidation,
    compressImage,

    // States
    isCompressing,
    isUploading,
    isUpdating,
    uploadProgress,
    isProcessing: isCompressing || isUploading || isUpdating,
  }
}
