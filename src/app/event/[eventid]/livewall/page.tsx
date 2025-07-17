'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Image as ImageIcon } from 'lucide-react'
import QRCode from '@/components/QRCode'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']
type Upload = Database['public']['Tables']['uploads']['Row']

export default function LivewallPage() {
  const params = useParams()
  const eventId = params.eventid as string

  const [event, setEvent] = useState<Event | null>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [preloadedImages, setPreloadedImages] = useState<{ [key: string]: HTMLImageElement }>({})

  useEffect(() => {
    if (eventId) {
      loadEventData()
    }
  }, [eventId])

  const loadEventData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch event by ID
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        setError('Event nicht gefunden')
        setIsLoading(false)
        return
      }

      setEvent(event)

      // Load only approved uploads
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('uploads')
        .select('*')
        .eq('event_id', eventId)
        .eq('approved', true)
        .order('created_at', { ascending: false })

      if (uploadsError) {
        throw uploadsError
      }

      setUploads(uploadsData || [])
      
      // Preload images for smooth transitions
      if (uploadsData && uploadsData.length > 0) {
        preloadImages(uploadsData)
      }
      
      setIsLoading(false)

    } catch (err) {
      console.error('Error loading event data:', err)
      setError('Fehler beim Laden der Event-Daten')
      setIsLoading(false)
    }
  }

  // Auto-refresh uploads only (not the whole page)
  useEffect(() => {
    const interval = setInterval(() => {
      if (eventId) {
        refreshUploads()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [eventId])

  // Refresh only uploads data without interrupting slideshow
  const refreshUploads = async () => {
    try {
      // Load only approved uploads
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('uploads')
        .select('*')
        .eq('event_id', eventId)
        .eq('approved', true)
        .order('created_at', { ascending: false })

      if (uploadsError) {
        console.error('Error refreshing uploads:', uploadsError)
        return
      }

      const newUploads = uploadsData || []
      
      // Only update if there are actually new uploads
      if (newUploads.length !== uploads.length) {
        // Check if we have new images to preload
        const newImages = newUploads.filter(upload => 
          !uploads.some(existingUpload => existingUpload.id === upload.id)
        )
        
        if (newImages.length > 0) {
          // Preload new images
          preloadNewImages(newImages)
        }
        
        setUploads(newUploads)
      }
    } catch (error) {
      console.error('Error refreshing uploads:', error)
    }
  }

  // Preload only new images
  const preloadNewImages = (newUploads: Upload[]) => {
    newUploads.forEach((upload) => {
      if (!preloadedImages[upload.id]) {
        const img = new Image()
        img.src = upload.file_url
        img.onload = () => {
          setPreloadedImages(prev => ({
            ...prev,
            [upload.id]: img
          }))
        }
      }
    })
  }

  // Preload images for smooth transitions
  const preloadImages = (uploads: Upload[]) => {
    const preloaded: { [key: string]: HTMLImageElement } = {}
    
    uploads.forEach((upload) => {
      const img = new Image()
      img.src = upload.file_url
      img.onload = () => {
        preloaded[upload.id] = img
      }
    })
    
    setPreloadedImages(preloaded)
  }

  // Update next index when current index changes
  useEffect(() => {
    if (uploads.length > 0) {
      setNextIndex((currentIndex + 1) % uploads.length)
    }
  }, [currentIndex, uploads.length])

  // Handle uploads array changes without disrupting slideshow
  useEffect(() => {
    if (uploads.length > 0) {
      // If current index is out of bounds due to uploads change, reset to 0
      if (currentIndex >= uploads.length) {
        setCurrentIndex(0)
      }
    }
  }, [uploads.length])

  // Slideshow functionality
  useEffect(() => {
    if (uploads.length === 0) return

    const interval = setInterval(() => {
      setIsTransitioning(true)
      
      // After transition completes, change image
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % uploads.length)
        setIsTransitioning(false)
      }, 500) // Smooth 500ms transition
    }, 10000) // 10 seconds total

    return () => clearInterval(interval)
  }, [uploads.length])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-xl">Lade Fotowand...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Event nicht gefunden</h1>
          <p className="text-purple-200">{error}</p>
        </div>
      </div>
    )
  }

  if (uploads.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative">
        {/* QR Code */}
        <div className="absolute bottom-8 right-8 z-10">
          <QRCode value={`${window.location.origin}/event/${eventId}/upload`} size={120} />
        </div>
        
        <div className="text-center">
          <ImageIcon className="w-24 h-24 text-white mx-auto mb-6" />
          <p className="text-purple-300 text-2xl">
            Warten auf die ersten Fotos...
          </p>
        </div>
      </div>
    )
  }

  const currentUpload = uploads[currentIndex]
  const uploadUrl = `${window.location.origin}/event/${eventId}/upload`

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
      {/* Main Polaroid Image */}
      <div className={`transition-all duration-500 ease-in-out transform ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="bg-white p-6 pb-20 rounded-lg shadow-2xl rotate-1 transition-transform duration-300 max-w-6xl max-h-[90vh] mx-auto">
          {/* Image */}
          <div className="relative">
            <img
              src={currentUpload.file_url}
              alt={currentUpload.comment || 'Foto'}
              className="w-full h-auto max-h-[75vh] object-contain rounded-sm"
              style={{ aspectRatio: 'auto' }}
              onLoad={() => {
                // Ensure smooth appearance when image loads
                if (isTransitioning) {
                  setIsTransitioning(false)
                }
              }}
            />
          </div>
          
          {/* Polaroid Caption */}
          <div className="mt-6 text-center">
            {currentUpload.comment && (
              <p className="text-gray-800 text-xl leading-relaxed mb-2" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
                {currentUpload.comment}
              </p>
            )}
            <p className="text-gray-600 text-base" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
              - {currentUpload.uploader_name || 'Anonym'}
            </p>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="absolute bottom-8 right-8 z-10">
        <QRCode value={uploadUrl} size={120} />
      </div>
    </div>
  )
}