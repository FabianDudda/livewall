'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Database } from '@/lib/supabase'
import QRCode from '@/components/QRCode'
import { AnimatePresence, motion } from 'framer-motion'
import { imagePreloader } from '@/lib/imagePreloader'

type Upload = Database['public']['Tables']['uploads']['Row']
type Event = Database['public']['Tables']['events']['Row']
type Challenge = Database['public']['Tables']['challenges']['Row']

type UploadWithChallenge = Upload & {
  challenges?: Challenge | null
}

interface SlideshowProps {
  event: Event
}

export default function Slideshow({ event }: SlideshowProps) {
  const params = useParams()
  const eventCode = params.eventcode as string
  const [queue, setQueue] = useState<UploadWithChallenge[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [imageLoadError, setImageLoadError] = useState<string | null>(null)

  const queueRef = useRef<UploadWithChallenge[]>([])
  const currentIndexRef = useRef<number>(0)
  const pendingUploadsRef = useRef<UploadWithChallenge[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const preloadingRef = useRef(false)

  const fetchUploads = async () => {
    const { data: uploads, error } = await supabase
      .from('uploads')
      .select(`
        *,
        challenges (
          id,
          title,
          hashtag
        )
      `)
      .eq('event_id', event.id)
      .eq('approved', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching uploads:', error)
      return
    }

    queueRef.current = uploads || []
    setQueue(queueRef.current)
    currentIndexRef.current = 0
    setCurrentIndex(0)
    pendingUploadsRef.current = []
    
    // Start preloading images after queue is set
    if (uploads && uploads.length > 0) {
      preloadUpcomingImages(0, uploads)
    }
  }

  // Preload upcoming images (next 3 images)
  const preloadUpcomingImages = async (startIndex: number, currentQueue: UploadWithChallenge[]) => {
    if (preloadingRef.current) return // Prevent multiple simultaneous preloading
    
    preloadingRef.current = true
    try {
      const PRELOAD_COUNT = 3
      const imagesToPreload: string[] = []
      
      // Get next 3 images (including videos, but they'll be filtered out)
      for (let i = 1; i <= PRELOAD_COUNT; i++) {
        const nextIndex = (startIndex + i) % currentQueue.length
        const upload = currentQueue[nextIndex]
        if (upload && !upload.file_type?.startsWith('video/')) {
          imagesToPreload.push(upload.file_url)
        }
      }

      if (imagesToPreload.length > 0) {
        console.log(`🖼️ Preloading ${imagesToPreload.length} upcoming images...`)
        const results = await imagePreloader.preloadBatch(imagesToPreload)
        const successCount = results.filter(r => r.success).length
        console.log(`✅ Preloaded ${successCount}/${imagesToPreload.length} images`)
        
        if (successCount < imagesToPreload.length) {
          console.warn('⚠️ Some images failed to preload:', results.filter(r => !r.success))
        }
      }
    } catch (error) {
      console.error('❌ Error preloading images:', error)
    } finally {
      preloadingRef.current = false
    }
  }

  // Check if current image is loaded, with loading state management
  const ensureCurrentImageLoaded = async (upload: UploadWithChallenge): Promise<boolean> => {
    if (!upload || upload.file_type?.startsWith('video/')) {
      return true // Videos don't need preloading
    }

    setIsImageLoading(true)
    setImageLoadError(null)

    try {
      const result = await imagePreloader.preload(upload.file_url)
      if (result.success) {
        console.log(`✅ Current image loaded: ${upload.uploader_name} (${result.loadTime}ms)`)
        setIsImageLoading(false)
        return true
      } else {
        console.error(`❌ Failed to load current image: ${result.error}`)
        setImageLoadError(result.error || 'Failed to load image')
        setIsImageLoading(false)
        return false
      }
    } catch (error) {
      console.error('❌ Error loading current image:', error)
      setImageLoadError('Error loading image')
      setIsImageLoading(false)
      return false
    }
  }

  useEffect(() => {
    fetchUploads()
  }, [event.id])

  useEffect(() => {
    const channel = supabase
      .channel(`uploads-${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'uploads',
          filter: `event_id=eq.${event.id}`,
        },
        async (payload) => {
          const newUpload = payload.new as Upload
          if (!newUpload.approved) return
          
          // Fetch challenge data for new upload
          let uploadWithChallenge: UploadWithChallenge = newUpload
          if (newUpload.challenge_id) {
            const { data: challenge } = await supabase
              .from('challenges')
              .select('id, title, hashtag')
              .eq('id', newUpload.challenge_id)
              .single()
            
            if (challenge) {
              uploadWithChallenge = { ...newUpload, challenges: challenge }
            }
          }
          
          pendingUploadsRef.current = [
            ...pendingUploadsRef.current,
            uploadWithChallenge,
          ]
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'uploads',
          filter: `event_id=eq.${event.id}`,
        },
        async (payload) => {
          const updatedUpload = payload.new as Upload
          if (!updatedUpload.approved) {
            const updatedQueue = queueRef.current.filter(
              (upload) => upload.id !== updatedUpload.id
            )
            queueRef.current = updatedQueue
            setQueue(updatedQueue)
            return
          }

          const idx = queueRef.current.findIndex(
            (upload) => upload.id === updatedUpload.id
          )
          if (idx !== -1) {
            // Fetch challenge data for updated upload
            let uploadWithChallenge: UploadWithChallenge = updatedUpload
            if (updatedUpload.challenge_id) {
              const { data: challenge } = await supabase
                .from('challenges')
                .select('id, title, hashtag')
                .eq('id', updatedUpload.challenge_id)
                .single()
              
              if (challenge) {
                uploadWithChallenge = { ...updatedUpload, challenges: challenge }
              }
            }
            
            const updatedQueue = [...queueRef.current]
            updatedQueue[idx] = uploadWithChallenge
            queueRef.current = updatedQueue
            setQueue(updatedQueue)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'uploads',
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          const deletedUpload = payload.old as Upload
          const updatedQueue = queueRef.current.filter(
            (upload) => upload.id !== deletedUpload.id
          )
          queueRef.current = updatedQueue
          setQueue(updatedQueue)

          if (currentIndexRef.current >= updatedQueue.length) {
            currentIndexRef.current = Math.max(0, updatedQueue.length - 1)
            setCurrentIndex(currentIndexRef.current)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [event.id])

  const goToNextSlide = async () => {
    let nextIndex = currentIndexRef.current + 1

    if (pendingUploadsRef.current.length > 0) {
      const sortedPending = [...pendingUploadsRef.current].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      )

      const updatedQueue = [...queueRef.current]
      const insertAt = currentIndexRef.current + 1
      updatedQueue.splice(insertAt, 0, ...sortedPending)

      queueRef.current = updatedQueue
      setQueue(updatedQueue)

      pendingUploadsRef.current = []
      nextIndex = currentIndexRef.current + 1
      
      // Preload new images after queue update
      preloadUpcomingImages(nextIndex, updatedQueue)
    }

    if (nextIndex >= queueRef.current.length) {
      fetchUploads()
      return
    }

    // Ensure next image is loaded before switching
    const nextUpload = queueRef.current[nextIndex]
    if (nextUpload) {
      const isLoaded = await ensureCurrentImageLoaded(nextUpload)
      if (!isLoaded) {
        // If image failed to load, try the next one
        console.warn('⚠️ Skipping failed image, trying next...')
        nextIndex = (nextIndex + 1) % queueRef.current.length
      }
    }

    currentIndexRef.current = nextIndex
    setCurrentIndex(nextIndex)
    
    // Preload upcoming images for the new position
    preloadUpcomingImages(nextIndex, queueRef.current)
  }

  const currentUpload = queue[currentIndex]
  const isVideo = currentUpload?.file_type?.startsWith('video/')

  useEffect(() => {
    if (!currentUpload || isVideo) return

    const displayDuration = (event.image_display_duration || 10) * 1000

    intervalRef.current = setInterval(() => {
      goToNextSlide()
    }, displayDuration)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [currentUpload?.id, isVideo, event.image_display_duration])

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  // Preload current image when index changes
  useEffect(() => {
    if (currentUpload && !isVideo) {
      ensureCurrentImageLoaded(currentUpload)
    }
  }, [currentUpload?.id, isVideo])

  const uploadUrl = `${window.location.origin}/event/${eventCode}/upload`

  if (queue.length === 0) {
    return (
      <>
      <div
        className={`min-h-screen bg-gradient-to-br ${
          event?.livewall_background_gradient ||
          'from-purple-900 via-blue-900 to-indigo-900'
        } flex items-center justify-center`}
      >
        <p className="text-white text-xl">Warten auf die ersten Fotos...</p>
      </div>
       <div className="absolute bottom-8 right-8 z-50">
       <QRCode value={uploadUrl} size={120} />
       </div>
       </>
    )
  }



  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${
        event?.livewall_background_gradient ||
        'from-purple-900 via-blue-900 to-indigo-900'
      } flex flex-col items-center justify-center p-4 relative overflow-hidden`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentUpload.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white p-6 pb-20 rounded-lg shadow-2xl transition-transform duration-300 max-w-6xl max-h-[90vh] mx-auto"
        >
          <div className="relative">
            {/* Loading indicator */}
            {isImageLoading && !isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-gray-600 text-sm">Bild wird geladen...</p>
                </div>
              </div>
            )}
            
            {/* Error state */}
            {imageLoadError && !isVideo && !isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-sm border-2 border-red-200">
                <div className="text-center p-6">
                  <div className="text-red-500 text-4xl mb-3">⚠️</div>
                  <p className="text-red-700 font-medium mb-2">Bild konnte nicht geladen werden</p>
                  <p className="text-red-600 text-sm">{imageLoadError}</p>
                </div>
              </div>
            )}
            
            {/* Hashtag overlay */}
            {currentUpload.challenges?.hashtag && (
              <div className="absolute top-3 right-3 z-10">
                <div className="flex items-center gap-1 text-white text-base font-semibold px-3 py-1 bg-black bg-opacity-70 rounded-full backdrop-blur-sm">
                  <span className="text-sm">🎯</span>
                  <p
                    className="m-0"
                    style={{ fontFamily: 'var(--font-kalam), cursive' }}
                  >
                    #{currentUpload.challenges.hashtag}
                  </p>
                </div>
              </div>
            )}
            
            {/* Content */}
            {isVideo ? (
              <video
                src={currentUpload.file_url}
                className="w-full h-auto max-h-[75vh] object-contain rounded-sm"
                autoPlay
                muted
                playsInline
                onEnded={goToNextSlide}
              />
            ) : (
              <img
                src={currentUpload.file_url}
                alt={currentUpload.comment || 'Photo'}
                className={`w-full h-auto max-h-[75vh] object-contain rounded-sm transition-opacity duration-300 ${
                  isImageLoading || imageLoadError ? 'opacity-0' : 'opacity-100'
                }`}
                style={{ aspectRatio: 'auto' }}
                onLoad={() => {
                  setIsImageLoading(false)
                  setImageLoadError(null)
                }}
                onError={() => {
                  setIsImageLoading(false)
                  setImageLoadError('Bild konnte nicht angezeigt werden')
                }}
              />
            )}
          </div>

          <div className="mt-6 text-center">
            {currentUpload.comment && (
              <p
                className="text-gray-800 text-xl leading-relaxed mb-2"
                style={{ fontFamily: 'var(--font-kalam), cursive' }}
              >
                {currentUpload.comment}
              </p>
            )}
            <p
              className="text-gray-600 text-base"
              style={{ fontFamily: 'var(--font-kalam), cursive' }}
            >
              {currentUpload.uploader_name || 'Anonym'}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-8 left-8 z-50 bg-black bg-opacity-50 text-white p-3 rounded-lg text-xs">
          <div>Queue: {queue.length} images</div>
          <div>Current: {currentIndex + 1}</div>
          <div>Cache: {imagePreloader.getCacheSize()} preloaded</div>
          <div>Loading: {isImageLoading ? 'Yes' : 'No'}</div>
          {imageLoadError && <div className="text-red-300">Error: {imageLoadError}</div>}
        </div>
      )}

      <div className="absolute bottom-8 right-8 z-50">
        <QRCode value={uploadUrl} size={120} />
        </div>
    </div>
  )
}
