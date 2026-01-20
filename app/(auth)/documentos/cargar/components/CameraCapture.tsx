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
  const containerRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isInitializingRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight)

  // Request fullscreen and lock body scroll on mount
  useEffect(() => {
    // Lock body scroll
    const originalOverflow = document.body.style.overflow
    const originalPosition = document.body.style.position
    const originalWidth = document.body.style.width
    const originalHeight = document.body.style.height

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'

    // Try to enter fullscreen (may fail if not triggered by user gesture)
    const enterFullscreen = async () => {
      try {
        if (containerRef.current && document.fullscreenEnabled) {
          await containerRef.current.requestFullscreen()
        }
      } catch (err) {
        // Fullscreen may fail silently - that's OK, the camera still works
        console.log('Fullscreen not available:', err)
      }
    }

    // Small delay to ensure component is mounted
    const timer = setTimeout(enterFullscreen, 100)

    return () => {
      clearTimeout(timer)
      // Restore body scroll
      document.body.style.overflow = originalOverflow
      document.body.style.position = originalPosition
      document.body.style.width = originalWidth
      document.body.style.height = originalHeight

      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

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
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black touch-none overflow-hidden"
      style={{
        height: '100dvh',
        width: '100dvw',
        top: 0,
        left: 0,
      }}
    >
      {/* Video/Image fills entire screen */}
      <div className="absolute inset-0">
        {/* Video preview */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover',
            (capturedImage || isLoading || error) && 'hidden'
          )}
        />

        {/* Captured image preview */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-contain bg-black"
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4" />
              <p>Iniciando cámara...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center p-4">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={startCamera} variant="secondary">
                Reintentar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Frame guide - overlayed on video */}
      {!capturedImage && !isLoading && !error && (
        <div className="absolute inset-4 sm:inset-6 border-2 border-white/40 rounded-lg pointer-events-none">
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-white/70 rounded-tl" />
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-white/70 rounded-tr" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-white/70 rounded-bl" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-white/70 rounded-br" />
        </div>
      )}

      {/* Orientation hint - only in portrait */}
      {!isLandscape && !capturedImage && !isLoading && !error && (
        <div className="absolute top-20 left-0 right-0 z-20 flex justify-center">
          <div className="bg-yellow-500/90 text-yellow-950 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Gira el teléfono para mejor encuadre
          </div>
        </div>
      )}

      {/* Header - overlayed */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
        <span className="text-white font-medium text-shadow">
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

      {/* Bottom controls - overlayed */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-6 p-4 bg-gradient-to-t from-black/60 to-transparent">
        {!capturedImage ? (
          /* Capture button */
          <button
            onClick={capturePhoto}
            disabled={isLoading || !!error}
            className={cn(
              'w-16 h-16 rounded-full border-4 border-white flex items-center justify-center',
              'bg-white/10 hover:bg-white/20 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95'
            )}
          >
            <div className="w-12 h-12 rounded-full bg-white" />
          </button>
        ) : (
          /* Confirm/Retake buttons */
          <>
            <Button
              onClick={retakePhoto}
              variant="outline"
              className="bg-black/50 border-white text-white hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Repetir
            </Button>
            <Button
              onClick={confirmCapture}
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
