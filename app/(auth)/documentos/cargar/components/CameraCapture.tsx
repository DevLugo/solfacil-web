'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, RotateCcw, Check, SwitchCamera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
  /** Target width for captured image */
  targetWidth?: number
  /** Target height for captured image */
  targetHeight?: number
  /** JPEG quality (0-1) */
  quality?: number
}

/**
 * Custom camera component with controlled resolution
 * Always captures in landscape orientation for document photos
 */
export function CameraCapture({
  onCapture,
  onClose,
  targetWidth = 1280,
  targetHeight = 720,
  quality = 0.8,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isInitializingRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight)

  // Start camera stream
  const startCamera = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) return
    isInitializingRef.current = true

    setIsLoading(true)
    setError(null)

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: targetWidth },
          height: { ideal: targetHeight },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Use play().catch() to handle the AbortError gracefully
        videoRef.current.play().catch(err => {
          // Ignore AbortError - happens when play is interrupted by new load
          if (err.name !== 'AbortError') {
            console.error('Video play error:', err)
          }
        })
      }

      setIsLoading(false)
    } catch (err) {
      console.error('Camera error:', err)
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
      setIsLoading(false)
    } finally {
      isInitializingRef.current = false
    }
  }, [facingMode, targetWidth, targetHeight])

  // Initialize camera on mount
  useEffect(() => {
    startCamera()

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [startCamera])

  // Handle orientation changes
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  // Calculate crop dimensions to maintain aspect ratio
  const calculateCropDimensions = (
    videoWidth: number,
    videoHeight: number,
    targetAspect: number
  ) => {
    const videoAspect = videoWidth / videoHeight
    let sx = 0, sy = 0, sw = videoWidth, sh = videoHeight

    if (videoAspect > targetAspect) {
      // Video is wider - crop sides
      sw = videoHeight * targetAspect
      sx = (videoWidth - sw) / 2
    } else {
      // Video is taller - crop top/bottom
      sh = videoWidth / targetAspect
      sy = (videoHeight - sh) / 2
    }

    return { sx, sy, sw, sh }
  }

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Always capture in landscape orientation
    // If video is portrait, we'll rotate it
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight
    const isVideoLandscape = videoWidth > videoHeight

    canvas.width = targetWidth
    canvas.height = targetHeight

    if (isVideoLandscape) {
      // Video is already landscape - capture as is
      const targetAspect = targetWidth / targetHeight
      const { sx, sy, sw, sh } = calculateCropDimensions(videoWidth, videoHeight, targetAspect)
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)
    } else {
      // Video is portrait - rotate 90° to make landscape
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(-Math.PI / 2)

      const rotatedWidth = targetHeight
      const rotatedHeight = targetWidth
      const targetAspect = rotatedWidth / rotatedHeight
      const { sx, sy, sw, sh } = calculateCropDimensions(videoWidth, videoHeight, targetAspect)

      ctx.drawImage(
        video,
        sx, sy, sw, sh,
        -rotatedWidth / 2, -rotatedHeight / 2, rotatedWidth, rotatedHeight
      )
      ctx.restore()
    }

    // Get image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', quality)
    setCapturedImage(imageDataUrl)
  }

  // Convert data URL to File
  const dataUrlToFile = async (dataUrl: string): Promise<File> => {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    return new File(
      [blob],
      `documento_${Date.now()}.jpg`,
      { type: 'image/jpeg', lastModified: Date.now() }
    )
  }

  // Convert captured image to File and return
  const confirmCapture = async () => {
    if (!capturedImage) return
    const file = await dataUrlToFile(capturedImage)
    onCapture(file)
  }

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null)
  }

  // Switch camera (front/back)
  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 absolute top-0 left-0 right-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
        <span className="text-white font-medium">
          {capturedImage ? 'Vista previa' : 'Tomar foto'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={switchCamera}
          disabled={isLoading || !!capturedImage}
          className="text-white hover:bg-white/20"
        >
          <SwitchCamera className="h-6 w-6" />
        </Button>
      </div>

      {/* Camera/Preview area */}
      <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
        {/* Orientation hint overlay */}
        {!isLandscape && !capturedImage && !isLoading && !error && (
          <div className="absolute top-20 left-0 right-0 z-20 flex justify-center">
            <div className="bg-yellow-500/90 text-yellow-950 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Gira el teléfono para mejor encuadre
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4" />
            <p>Iniciando cámara...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-white text-center p-4">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={startCamera} variant="secondary">
              Reintentar
            </Button>
          </div>
        )}

        {/* Video preview (hidden when captured) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'max-h-full max-w-full object-contain',
            (capturedImage || isLoading || error) && 'hidden'
          )}
        />

        {/* Captured image preview */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="max-h-full max-w-full object-contain"
          />
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Landscape frame guide */}
        {!capturedImage && !isLoading && !error && (
          <div className="absolute inset-8 border-2 border-white/30 rounded-lg pointer-events-none">
            <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-white/60 rounded-tl" />
            <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-white/60 rounded-tr" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-white/60 rounded-bl" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-white/60 rounded-br" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="p-6 bg-black/50 flex items-center justify-center gap-8">
        {!capturedImage ? (
          /* Capture button */
          <button
            onClick={capturePhoto}
            disabled={isLoading || !!error}
            className={cn(
              'w-20 h-20 rounded-full border-4 border-white flex items-center justify-center',
              'bg-white/10 hover:bg-white/20 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95'
            )}
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>
        ) : (
          /* Confirm/Retake buttons */
          <>
            <Button
              onClick={retakePhoto}
              variant="outline"
              size="lg"
              className="bg-transparent border-white text-white hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Repetir
            </Button>
            <Button
              onClick={confirmCapture}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-5 w-5 mr-2" />
              Usar foto
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
