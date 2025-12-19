import { useState } from 'react'
import { useMutation, useApolloClient, gql } from '@apollo/client'
import imageCompression from 'browser-image-compression'
import { UPLOAD_DOCUMENT_PHOTO, UPDATE_DOCUMENT_PHOTO } from '@/graphql/mutations/documents'
import { useToast } from '@/hooks/use-toast'
import { uploadFileWithGraphQL } from '@/lib/apollo-client'

export interface UploadOptions {
  isError?: boolean
  isMissing?: boolean
  errorDescription?: string
  title?: string
  description?: string
}

export interface ValidationOptions {
  isError?: boolean
  isMissing?: boolean
  errorDescription?: string
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

  /**
   * Compresses an image file before upload
   * Reduces file size by ~70% on average
   */
  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.5, // 500KB max
      maxWidthOrHeight: 800, // 800px max dimension
      useWebWorker: true, // Use web worker to avoid blocking UI
      fileType: 'image/jpeg', // Convert to JPEG
      initialQuality: 0.7, // 70% quality
    }

    setIsCompressing(true)
    try {
      const compressedBlob = await imageCompression(file, options)

      // Create a proper File object from the compressed blob with correct metadata
      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(/\.[^.]+$/, '.jpg'), // Replace extension with .jpg
        {
          type: 'image/jpeg',
          lastModified: Date.now(),
        }
      )

      // Log compression results
      console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2), 'MB')
      console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB')
      console.log(
        'Compression ratio:',
        ((1 - compressedFile.size / file.size) * 100).toFixed(2),
        '%'
      )

      return compressedFile
    } catch (error) {
      console.error('Error compressing image:', error)
      // Show specific error for compression
      toast({
        title: 'Error al comprimir imagen',
        description: 'No se pudo comprimir la imagen. Intenta con una imagen más pequeña.',
        variant: 'destructive',
      })
      throw error
    } finally {
      setIsCompressing(false)
    }
  }

  /**
   * Uploads a document photo with compression
   */
  const handleUpload = async (
    file: File,
    documentType: string,
    options?: UploadOptions
  ) => {
    try {
      setUploadProgress(10)

      // Compress image
      const compressedFile = await compressImage(file)
      setUploadProgress(50)

      // Debug: Log file object
      console.log('Uploading file:', {
        name: compressedFile.name,
        type: compressedFile.type,
        size: compressedFile.size,
        isFile: compressedFile instanceof File,
        isBlob: compressedFile instanceof Blob,
      })

      // Upload to server using fetch with FormData
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
      })

      setUploadProgress(100)

      // Write the result to Apollo cache manually since uploadFileWithGraphQL bypasses Apollo
      if (result.uploadDocumentPhoto) {
        const uploadedDoc = result.uploadDocumentPhoto

        // Write to cache fragment
        apolloClient.cache.writeFragment({
          id: apolloClient.cache.identify({
            __typename: 'DocumentPhoto',
            id: uploadedDoc.id
          }),
          fragment: gql`
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
          `,
          data: uploadedDoc
        })
      }

      // Refetch queries manually to update UI in real-time
      await apolloClient.refetchQueries({
        include: ['GetLoansByWeekAndLocation', 'GetLoanDocuments'],
      })

      toast({
        title: 'Documento subido',
        description: 'El documento se ha subido correctamente.',
      })

      return result.uploadDocumentPhoto
    } catch (error) {
      console.error('Error uploading document:', error)
      // Show error toast
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

  /**
   * Validates a document (mark as correct, error, or missing)
   */
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
        refetchQueries: ['GetLoansByWeekAndLocation', 'GetLoanDocuments'],
        awaitRefetchQueries: true,
      })

      // Determine validation status for toast
      let status = 'correcto'
      if (options.isError) status = 'con error'
      if (options.isMissing) status = 'faltante'

      toast({
        title: 'Documento validado',
        description: `El documento ha sido marcado como ${status}.`,
      })

      return result.data?.updateDocumentPhoto
    } catch (error) {
      console.error('Error validating document:', error)
      // Error toast is handled by Apollo error link automatically
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
