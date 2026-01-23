'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { X, RotateCcw, Check, SwitchCamera, Zap, ZapOff, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
  /** Target width for captured image (default portrait 720) */
  targetWidth?: number
  /** Target height for captured image (default portrait 1280) */
  targetHeight?: number
  /** JPEG quality (0-1) */
  quality?: number
}

/**
 * Custom camera component with controlled resolution
 * Captures in portrait orientation for document photos
 */
export function CameraCapture({
  onCapture,
  onClose,
  targetWidth = 720,
  targetHeight = 1280,
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
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [zoomSupported, setZoomSupported] = useState(false)
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1 })
  const [showZoomSlider, setShowZoomSlider] = useState(false)

  // Request fullscreen and lock body/html scroll on mount
  useEffect(() => {
    // Save original styles
    const originalBodyOverflow = document.body.style.overflow
    const originalBodyPosition = document.body.style.position
    const originalBodyWidth = document.body.style.width
    const originalBodyHeight = document.body.style.height
    const originalBodyTop = document.body.style.top
    const originalBodyLeft = document.body.style.left
    const originalHtmlOverflow = document.documentElement.style.overflow

    // Get current scroll position
    const scrollY = window.scrollY

    // Lock body and html scroll completely
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.documentElement.style.overflow = 'hidden'

    // Prevent touchmove on document
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault()
    }
    document.addEventListener('touchmove', preventScroll, { passive: false })

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
      document.removeEventListener('touchmove', preventScroll)

      // Restore body scroll
      document.body.style.overflow = originalBodyOverflow
      document.body.style.position = originalBodyPosition
      document.body.style.width = originalBodyWidth
      document.body.style.height = originalBodyHeight
      document.body.style.top = originalBodyTop
      document.body.style.left = originalBodyLeft
      document.documentElement.style.overflow = originalHtmlOverflow

      // Restore scroll position
      window.scrollTo(0, scrollY)

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
      // First, get a basic stream to check capabilities
      // Don't request specific resolution to avoid digital zoom/crop
      const initialStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
        },
        audio: false,
      })

      const initialTrack = initialStream.getVideoTracks()[0]
      let zoomMin = 1
      let zoomMax = 1
      let hasZoom = false

      // Check zoom capabilities
      if (initialTrack) {
        try {
          const capabilities = initialTrack.getCapabilities() as MediaTrackCapabilities & {
            zoom?: { min: number; max: number; step: number }
          }
          if (capabilities.zoom) {
            zoomMin = capabilities.zoom.min
            zoomMax = capabilities.zoom.max
            hasZoom = true
            console.log(`Zoom detected: min=${zoomMin}, max=${zoomMax}`)
          }
        } catch (e) {
          console.log('Could not get zoom capabilities:', e)
        }
      }

      // Stop initial stream
      initialStream.getTracks().forEach(track => track.stop())

      // Request stream WITHOUT specific resolution to get widest field of view
      // The device will use its native resolution without digital zoom/crop
      // We'll resize during capture if needed
      const videoConstraints: MediaTrackConstraints = {
        facingMode: facingMode,
        // Don't specify width/height - avoids digital zoom when device
        // crops to meet resolution requirements
        // @ts-expect-error - resizeMode prevents automatic cropping
        resizeMode: 'none',
      }

      // Add zoom constraint if supported - request minimum zoom
      if (hasZoom) {
        // @ts-expect-error - zoom is not in standard types but supported by many devices
        videoConstraints.zoom = zoomMin
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
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

      const track = stream.getVideoTracks()[0]
      if (track) {
        // Set zoom state
        if (hasZoom) {
          setZoomSupported(true)
          setZoomRange({ min: zoomMin, max: zoomMax })
          setZoomLevel(zoomMin)

          // Apply zoom constraint again after stream starts (belt and suspenders)
          try {
            await track.applyConstraints({
              // @ts-expect-error - zoom constraint
              zoom: zoomMin
            })
            console.log('Zoom applied via direct constraint:', zoomMin)
          } catch (e) {
            // Try advanced format as fallback
            try {
              await track.applyConstraints({
                advanced: [{ zoom: zoomMin } as MediaTrackConstraintSet]
              })
              console.log('Zoom applied via advanced constraint:', zoomMin)
            } catch (e2) {
              console.log('Could not apply zoom constraint:', e2)
            }
          }
        } else {
          setZoomSupported(false)
        }

        try {
          const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
            torch?: boolean
          }
          console.log('Camera capabilities:', JSON.stringify(capabilities, null, 2))

          // Check torch/flash support
          if (capabilities.torch) {
            console.log('Torch supported via capabilities')
            setTorchSupported(true)
          } else {
            // Try to enable torch to see if it works (then disable it)
            try {
              await track.applyConstraints({
                advanced: [{ torch: true } as MediaTrackConstraintSet]
              })
              console.log('Torch supported via test activation')
              setTorchSupported(true)
              await track.applyConstraints({
                advanced: [{ torch: false } as MediaTrackConstraintSet]
              })
            } catch {
              console.log('Torch not supported')
              setTorchSupported(false)
            }
          }
        } catch (err) {
          console.log('Error checking capabilities:', err)
          setTorchSupported(false)
          setZoomSupported(false)
        }
        setTorchOn(false)
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

    // Capture in the video's native orientation (preserve portrait for documents)
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight
    const isVideoPortrait = videoHeight > videoWidth

    // Set canvas dimensions based on video orientation
    if (isVideoPortrait) {
      // Video is portrait - capture as portrait
      canvas.width = targetWidth
      canvas.height = targetHeight
    } else {
      // Video is landscape - capture as landscape (swap dimensions)
      canvas.width = targetHeight
      canvas.height = targetWidth
    }

    // Calculate crop to fill canvas while maintaining aspect ratio
    const canvasAspect = canvas.width / canvas.height
    const { sx, sy, sw, sh } = calculateCropDimensions(videoWidth, videoHeight, canvasAspect)

    // Draw video to canvas (fills entire canvas)
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

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

  // Toggle flash/torch
  const toggleTorch = async () => {
    console.log('Toggle torch clicked, current state:', torchOn)
    try {
      const track = streamRef.current?.getVideoTracks()[0]
      if (!track) {
        console.log('No video track found')
        return
      }

      const newTorchState = !torchOn

      // Toggle torch via track constraints
      console.log('Applying torch constraint:', newTorchState)
      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as MediaTrackConstraintSet]
      })
      console.log('Torch toggled successfully to:', newTorchState)
      setTorchOn(newTorchState)
    } catch (err) {
      console.error('Failed to toggle torch:', err)
      setTorchSupported(false)
    }
  }

  // Handle zoom change
  const handleZoomChange = async (value: number[]) => {
    const newZoom = value[0]
    try {
      const track = streamRef.current?.getVideoTracks()[0]
      if (!track) return

      // Try direct constraint first (better compatibility)
      try {
        await track.applyConstraints({
          // @ts-expect-error - zoom constraint not in standard types
          zoom: newZoom
        })
      } catch {
        // Fallback to advanced format
        await track.applyConstraints({
          advanced: [{ zoom: newZoom } as MediaTrackConstraintSet]
        })
      }
      setZoomLevel(newZoom)
    } catch (err) {
      console.error('Failed to change zoom:', err)
    }
  }

  // Toggle zoom slider visibility
  const toggleZoomSlider = () => {
    setShowZoomSlider(prev => !prev)
  }

  // Tap to focus
  const handleTapToFocus = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (capturedImage || isLoading || error) return

    // Get tap coordinates
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Show focus indicator
    setFocusPoint({ x, y })

    // Hide focus indicator after animation
    setTimeout(() => setFocusPoint(null), 1000)

    // Try to actually focus the camera (if supported)
    try {
      const track = streamRef.current?.getVideoTracks()[0]
      if (track) {
        const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
          focusMode?: string[]
        }

        // Check if focus is supported
        if (capabilities.focusMode?.includes('manual') || capabilities.focusMode?.includes('single-shot')) {
          // Calculate normalized coordinates (0-1)
          const focusX = x / rect.width
          const focusY = y / rect.height

          await track.applyConstraints({
            advanced: [{
              // @ts-expect-error - focusMode and pointsOfInterest are not in standard types
              focusMode: 'single-shot',
              pointsOfInterest: [{ x: focusX, y: focusY }]
            }]
          })
        }
      }
    } catch (err) {
      // Focus not supported on this device/browser - that's OK
      console.log('Auto-focus not supported:', err)
    }
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
      {/* Video/Image fills entire screen - tap to focus */}
      <div
        className="absolute inset-0"
        onPointerDown={handleTapToFocus}
      >
        {/* Video preview */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-contain',
            (capturedImage || isLoading || error) && 'hidden'
          )}
        />

        {/* Focus indicator */}
        {focusPoint && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: focusPoint.x - 40,
              top: focusPoint.y - 40,
            }}
          >
            <div className="w-20 h-20 border-2 border-yellow-400 rounded-lg animate-pulse">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              </div>
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-yellow-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-yellow-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-yellow-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-yellow-400" />
            </div>
          </div>
        )}

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
        <div className="flex items-center gap-1">
          {/* Zoom button */}
          {!capturedImage && zoomSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleZoomSlider}
              disabled={isLoading}
              className={cn(
                "text-white hover:bg-white/20",
                showZoomSlider && "bg-white/20"
              )}
            >
              <ZoomIn className="h-6 w-6" />
            </Button>
          )}
          {/* Flash button - always show, disabled if not supported */}
          {!capturedImage && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTorch}
              disabled={isLoading || !torchSupported}
              className={cn(
                "text-white hover:bg-white/20",
                torchOn && "bg-yellow-500/30",
                !torchSupported && "opacity-30"
              )}
            >
              {torchOn ? <Zap className="h-6 w-6 text-yellow-400" /> : <ZapOff className="h-6 w-6" />}
            </Button>
          )}
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
      </div>

      {/* Zoom slider - shown when zoom button is clicked */}
      {showZoomSlider && zoomSupported && !capturedImage && !isLoading && !error && (
        <div className="absolute top-16 left-4 right-4 z-20 flex items-center gap-3 px-4 py-3 bg-black/70 rounded-lg">
          <ZoomOut className="h-5 w-5 text-white/70 flex-shrink-0" />
          <Slider
            value={[zoomLevel]}
            min={zoomRange.min}
            max={zoomRange.max}
            step={0.1}
            onValueChange={handleZoomChange}
            className="flex-1"
          />
          <ZoomIn className="h-5 w-5 text-white/70 flex-shrink-0" />
          <span className="text-white text-sm font-medium min-w-[3rem] text-right">
            {zoomLevel.toFixed(1)}x
          </span>
        </div>
      )}

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
