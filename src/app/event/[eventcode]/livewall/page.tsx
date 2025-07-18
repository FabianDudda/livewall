'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Image as ImageIcon } from 'lucide-react'
import QRCode from '@/components/QRCode'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']
type Upload = Database['public']['Tables']['uploads']['Row']
type Challenge = Database['public']['Tables']['challenges']['Row']

interface LiveMessage {
  id: string
  eventId: string
  message: string
  senderName?: string
  timestamp: number
  messageIndex?: number
}

export default function LivewallPage() {
  const params = useParams()
  const eventCode = params.eventcode as string
  const [eventId, setEventId] = useState<string | null>(null)

  const [event, setEvent] = useState<Event | null>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const messageCounterRef = useRef(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Helper functions for persistent position storage using upload ID
  const getStoredUploadId = () => {
    if (typeof window !== 'undefined' && eventId) {
      return localStorage.getItem(`livewall-upload-id-${eventId}`)
    }
    return null
  }
  
  const setStoredUploadId = (uploadId: string) => {
    if (typeof window !== 'undefined' && eventId) {
      localStorage.setItem(`livewall-upload-id-${eventId}`, uploadId)
    }
  }
  

  useEffect(() => {
    if (eventCode) {
      loadEventData()
    }
  }, [eventCode])

  // Initialize position from localStorage when uploads are loaded
  useEffect(() => {
    if (uploads.length > 0) {
      const storedUploadId = getStoredUploadId()
      if (storedUploadId) {
        const storedIndex = uploads.findIndex(upload => upload.id === storedUploadId)
        if (storedIndex !== -1) {
          setCurrentIndex(storedIndex)
        } else {
          setCurrentIndex(0)
        }
      } else {
        setCurrentIndex(0)
      }
    }
  }, [uploads.length])

  const loadEventData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch event by event_code
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', eventCode)
        .single()

      if (eventError || !event) {
        setError('Event nicht gefunden')
        setIsLoading(false)
        return
      }

      setEvent(event)
      setEventId(event.id)

      // Load only approved uploads and challenges
      const [uploadsResult, challengesResult] = await Promise.all([
        supabase
          .from('uploads')
          .select('*')
          .eq('event_id', event.id)
          .eq('approved', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('challenges')
          .select('*')
          .eq('event_id', event.id)
      ])

      if (uploadsResult.error) {
        throw uploadsResult.error
      }

      if (challengesResult.error) {
        throw challengesResult.error
      }

      const uploadData = uploadsResult.data || []
      setUploads(uploadData)
      setChallenges(challengesResult.data || [])
      
      setIsLoading(false)

    } catch (err) {
      console.error('Error loading event data:', err)
      setError('Fehler beim Laden der Event-Daten')
      setIsLoading(false)
    }
  }

  // Listen for real-time messages
  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`event-${eventId}`)
      .on('broadcast', { event: 'livewall_message' }, (payload) => {
        const message = payload.payload as LiveMessage
        
        // Add message to state with a unique index
        const currentIndex = messageCounterRef.current
        const messageWithIndex = { ...message, messageIndex: currentIndex }
        setMessages(prev => [...prev, messageWithIndex])
        messageCounterRef.current += 1
        
        // Remove message after 31 seconds (giving 1 second buffer after animation completes)
        setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== message.id))
        }, 31000)
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId])

  // Auto-refresh uploads only (not the whole page)
  useEffect(() => {
    const intervalTime = (event?.auto_refresh_interval || 30) * 1000
    const interval = setInterval(() => {
      if (eventId) {
        refreshUploads()
      }
    }, intervalTime)

    return () => clearInterval(interval)
  }, [eventId, event?.auto_refresh_interval])

  // Refresh only uploads data without interrupting slideshow
  const refreshUploads = async () => {
    try {
      if (!eventId) return

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
      setUploads(newUploads)
    } catch (error) {
      console.error('Error refreshing uploads:', error)
    }
  }

  // Slideshow functionality
  useEffect(() => {
    if (uploads.length === 0) return

    const displayDuration = (event?.image_display_duration || 10) * 1000
    const interval = setInterval(() => {
      setIsTransitioning(true)
      
      // After transition completes, change image
      setTimeout(() => {
        // Simple sequence through all uploads (newest to oldest)
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % uploads.length
          
          // Store the upload ID of the next image for persistence
          if (uploads[nextIndex]) {
            setStoredUploadId(uploads[nextIndex].id)
          }
          
          return nextIndex
        })
        setIsTransitioning(false)
      }, 500) // Smooth 500ms transition
    }, displayDuration)

    return () => clearInterval(interval)
  }, [uploads.length, event?.image_display_duration])

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${event?.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-xl">Lade Fotowand...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${event?.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900'} flex items-center justify-center`}>
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
      <div className={`min-h-screen bg-gradient-to-br ${event?.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900'} flex items-center justify-center relative`}>
        {/* QR Code */}
        <div className="absolute bottom-8 right-8 z-50">
          <QRCode value={`${window.location.origin}/event/${eventCode}/upload`} size={120} />
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
  const uploadUrl = `${window.location.origin}/event/${eventCode}/upload`

  // Get challenge for current upload
  const getCurrentChallenge = () => {
    if (!currentUpload?.challenge_id) return null
    return challenges.find(challenge => challenge.id === currentUpload.challenge_id)
  }

  const currentChallenge = getCurrentChallenge()

  return (
    <div className={`min-h-screen bg-gradient-to-br ${event?.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900'} flex items-center justify-center relative overflow-hidden`}>
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
            />
            
            {/* Challenge Hashtag */}
            {currentChallenge && (
              <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
                #{currentChallenge.hashtag || currentChallenge.title.toLowerCase().replace(/\s+/g, '')}
              </div>
            )}
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

      {/* Messages */}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`fixed z-20 animate-message-fly ${
            (message.messageIndex || 0) % 2 === 0 ? 'left-8' : 'right-8'
          }`}
          style={{
            zIndex: 20 + (message.messageIndex || 0)
          }}
        >
          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl p-4 shadow-lg max-w-xs">
            <p className="text-gray-900 font-medium text-sm leading-relaxed">
              {message.message}
            </p>
            {message.senderName && (
              <p className="text-gray-600 text-xs mt-2 font-medium">
                - {message.senderName}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* QR Code */}
      <div className="absolute bottom-8 right-8 z-50">
        <QRCode value={uploadUrl} size={120} />
      </div>
    </div>
  )
}