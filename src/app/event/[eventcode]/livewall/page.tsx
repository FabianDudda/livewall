'use client'

import { useState, useEffect, useRef, useReducer, useCallback } from 'react'
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

// Slideshow ordering modes
type SlideshowOrderingMode = 'insertion' | 'newest-first'

// Slideshow state interface
interface SlideshowState {
  uploads: Upload[]
  stableUploads: Upload[]
  originalUploads: Upload[]
  currentImageIndex: number // Current image being displayed
  showingSlotA: boolean // Which display slot is currently visible
  isRefreshing: boolean
  lastRefreshTime: number
  orderingMode: SlideshowOrderingMode
  hasCompletedRound: boolean // Tracks if we've shown the oldest image
}

// Slideshow actions
type SlideshowAction =
  | { type: 'UPLOADS_LOADED'; payload: Upload[] }
  | { type: 'NEW_UPLOADS_DETECTED'; payload: Upload[] }
  | { type: 'ADVANCE_SLIDESHOW' }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'TOGGLE_ORDERING_MODE' }
  | { type: 'SET_ORDERING_MODE'; payload: SlideshowOrderingMode }
  | { type: 'REORDER_FOR_NEW_ROUND' }

// Slideshow reducer
function slideshowReducer(state: SlideshowState, action: SlideshowAction): SlideshowState {
  switch (action.type) {
    case 'UPLOADS_LOADED': {
      const uploads = action.payload
      return {
        ...state,
        uploads,
        stableUploads: uploads,
        originalUploads: uploads,
        currentImageIndex: 0,
        showingSlotA: true,
        isRefreshing: false,
        lastRefreshTime: Date.now(),
        hasCompletedRound: false
      }
    }
    
    case 'NEW_UPLOADS_DETECTED': {
      const latestUploads = action.payload
      
      console.log('✅ Processing NEW_UPLOADS_DETECTED with', latestUploads.length, 'uploads (was', state.stableUploads.length, ')')
      
      // Check for new uploads against original uploads
      const existingIds = new Set(state.originalUploads.map(upload => upload.id))
      const newUploadItems = latestUploads.filter(upload => !existingIds.has(upload.id))
      
      if (newUploadItems.length === 0) {
        // No new uploads, just update the base arrays
        return {
          ...state,
          uploads: latestUploads,
          originalUploads: latestUploads,
          isRefreshing: false,
          lastRefreshTime: Date.now()
        }
      }
      
      console.log('🎯 Found', newUploadItems.length, 'new uploads, inserting after current position', state.currentImageIndex)
      
      // Insert new images after the current position in the slideshow queue
      const insertPosition = state.currentImageIndex + 1
      const newStableQueue = [
        ...state.stableUploads.slice(0, insertPosition),
        ...newUploadItems,
        ...state.stableUploads.slice(insertPosition)
      ]
      
      return {
        ...state,
        uploads: latestUploads,
        stableUploads: newStableQueue,
        originalUploads: latestUploads,
        isRefreshing: false,
        lastRefreshTime: Date.now(),
        hasCompletedRound: false // Reset when new uploads arrive
      }
    }
    
    case 'ADVANCE_SLIDESHOW': {
      const uploadsLength = state.stableUploads.length
      if (uploadsLength <= 1) return state
      
      // Check if we're currently on the last image (about to complete a round)
      const isOnLastImage = state.currentImageIndex === uploadsLength - 1
      
      // Advance to next image and toggle which slot is visible
      const nextImageIndex = (state.currentImageIndex + 1) % uploadsLength
      const currentImage = state.stableUploads[nextImageIndex]
      
      // Log the image ID that is now being displayed
      console.log('📸 Now displaying image ID:', currentImage?.id)
      
      // Mark round as completed if we just showed the last image
      const hasCompletedRound = state.hasCompletedRound || isOnLastImage
      
      return {
        ...state,
        currentImageIndex: nextImageIndex,
        showingSlotA: !state.showingSlotA,
        hasCompletedRound
      }
    }
    
    case 'SET_REFRESHING':
      return {
        ...state,
        isRefreshing: action.payload
      }
    
    case 'TOGGLE_ORDERING_MODE':
      return {
        ...state,
        orderingMode: state.orderingMode === 'insertion' ? 'newest-first' : 'insertion',
        hasCompletedRound: false // Reset round tracking when mode changes
      }
    
    case 'SET_ORDERING_MODE':
      return {
        ...state,
        orderingMode: action.payload,
        hasCompletedRound: false // Reset round tracking when mode changes
      }
    
    case 'REORDER_FOR_NEW_ROUND': {
      if (state.orderingMode === 'insertion' || !state.hasCompletedRound) {
        return state // No reordering needed
      }
      
      // Reorder to newest-first (descending by created_at)
      const reorderedUploads = [...state.stableUploads].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      return {
        ...state,
        stableUploads: reorderedUploads,
        currentImageIndex: 0,
        hasCompletedRound: false
        // Keep the current showingSlotA to avoid slot conflicts
      }
    }
    
    default:
      return state
  }
}

export default function LivewallPage() {
  const params = useParams()
  const eventCode = params.eventcode as string
  const [eventId, setEventId] = useState<string | null>(null)
  
  // Initialize reducer state
  const [state, dispatch] = useReducer(slideshowReducer, {
    uploads: [],
    stableUploads: [],
    originalUploads: [],
    currentImageIndex: 0,
    showingSlotA: true,
    isRefreshing: false,
    lastRefreshTime: 0,
    orderingMode: 'insertion' as SlideshowOrderingMode,
    hasCompletedRound: false
  })

  const [event, setEvent] = useState<Event | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const messageCounterRef = useRef(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for accessing current state in callbacks
  const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Refs to maintain stable slot contents during transitions
  const slotAImageRef = useRef<Upload | null>(null)
  const slotBImageRef = useRef<Upload | null>(null)
  
  // Create a ref to always access current state in interval
  const stateRef = useRef(state)

  // Sync stateRef with current state
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (eventCode) {
      loadEventData()
    }
  }, [eventCode])


  // Debounced refresh with specific event ID
  const debouncedRefreshWithId = useCallback((targetEventId: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      refreshUploadsWithId(targetEventId)
    }, 300) // 300ms debounce
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

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
      dispatch({ type: 'UPLOADS_LOADED', payload: uploadData })
      setChallenges(challengesResult.data || [])
      
      // Set ordering mode from event data
      if (event.ordering_mode && event.ordering_mode !== state.orderingMode) {
        const orderingMode = event.ordering_mode as SlideshowOrderingMode
        if (orderingMode === 'insertion' || orderingMode === 'newest-first') {
          dispatch({ type: 'SET_ORDERING_MODE', payload: orderingMode })
        }
      }
      
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

  // Listen for real-time uploads changes - debounced to handle simultaneous events
  useEffect(() => {
    const currentEventId = eventId || event?.id
    if (!currentEventId) return

    const channel = supabase
      .channel(`uploads-${currentEventId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'uploads',
          filter: `event_id=eq.${currentEventId}`
        }, 
        (payload) => {
          const uploadId = (payload.new as Record<string, unknown>)?.id || 'unknown'
          console.log('🔔 Realtime upload change detected:', payload.eventType, uploadId)
          dispatch({ type: 'SET_REFRESHING', payload: true })
          
          // Use debounced refresh to handle multiple rapid events
          debouncedRefreshWithId(currentEventId)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId, event?.id])

  // Listen for real-time event settings changes (ordering mode)
  useEffect(() => {
    const currentEventId = eventId || event?.id
    if (!currentEventId) return

    const channel = supabase
      .channel(`event-settings-${currentEventId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'events',
          filter: `id=eq.${currentEventId}`
        }, 
        (payload) => {
          const updatedEvent = payload.new as Event
          console.log('🔔 Event settings updated:', updatedEvent.ordering_mode)
          
          if (updatedEvent.ordering_mode && updatedEvent.ordering_mode !== state.orderingMode) {
            const orderingMode = updatedEvent.ordering_mode as SlideshowOrderingMode
            if (orderingMode === 'insertion' || orderingMode === 'newest-first') {
              dispatch({ type: 'SET_ORDERING_MODE', payload: orderingMode })
            }
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId, event?.id, state.orderingMode])

  // Refresh uploads data with specific event ID
  const refreshUploadsWithId = async (targetEventId: string) => {
    console.log('🔄 refreshUploadsWithId called! eventId:', targetEventId)
    try {
      console.log('🔄 Refreshing uploads...')

      // Load only approved uploads
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('uploads')
        .select('*')
        .eq('event_id', targetEventId)
        .eq('approved', true)
        .order('created_at', { ascending: false })

      if (uploadsError) {
        console.error('Error refreshing uploads:', uploadsError)
        return
      }

      const latestUploads = uploadsData || []
      console.log('📥 Loaded uploads:', latestUploads.length)
      
      // Dispatch the new uploads - reducer will handle all logic atomically
      dispatch({ type: 'NEW_UPLOADS_DETECTED', payload: latestUploads })
      
    } catch (error) {
      console.error('Error refreshing uploads:', error)
      dispatch({ type: 'SET_REFRESHING', payload: false })
    }
  }

  // Refresh uploads data and handle new uploads atomically
  const refreshUploads = async () => {
    const currentEventId = eventId || event?.id
    console.log('🔄 refreshUploads called! eventId:', currentEventId)
    if (!currentEventId) {
      console.log('❌ No eventId, returning early')
      return
    }
    
    await refreshUploadsWithId(currentEventId)
  }


  // Function to start slideshow interval
  const startSlideshowInterval = () => {
    const displayDuration = (event?.image_display_duration || 10) * 1000
    
    console.log('🎬 Starting slideshow interval with duration:', displayDuration)
    
    const interval = setInterval(() => {
      const currentState = stateRef.current
      
      console.log('⏰ Slideshow tick - current state:', {
        currentImageIndex: currentState.currentImageIndex,
        showingSlotA: currentState.showingSlotA,
        totalUploads: currentState.stableUploads.length
      })
      
      if (currentState.stableUploads.length <= 1) {
        console.log('⚠️ Not enough uploads for slideshow')
        return
      }
      
      console.log('➡️ Advancing slideshow')
      
      // Check if we're about to complete a round (on the last image) and need reordering
      const isOnLastImage = currentState.currentImageIndex === currentState.stableUploads.length - 1
      const shouldReorderAfter = isOnLastImage && currentState.orderingMode === 'newest-first'
      
      dispatch({ type: 'ADVANCE_SLIDESHOW' })
      
      // If we just completed a round, reorder for next round
      if (shouldReorderAfter) {
        // Clear the interval temporarily to prevent conflicts during reordering
        if (slideshowIntervalRef.current) {
          clearInterval(slideshowIntervalRef.current)
          slideshowIntervalRef.current = null
        }
        
        setTimeout(() => {
          console.log('🔄 Reordering for new round')
          dispatch({ type: 'REORDER_FOR_NEW_ROUND' })
          
          // Restart the slideshow interval after reordering
          setTimeout(() => {
            if (!slideshowIntervalRef.current) {
              startSlideshowInterval()
            }
          }, 100) // Small delay to ensure state is updated
        }, 1000) // Delay to allow current transition to complete
      }
    }, displayDuration)
    
    slideshowIntervalRef.current = interval
    return interval
  }

  // Slideshow effect - only start/stop based on having uploads, not on count changes
  useEffect(() => {
    const hasEnoughUploads = state.stableUploads.length > 1
    
    if (hasEnoughUploads && !slideshowIntervalRef.current) {
      // Start slideshow if we have enough uploads and no interval running
      console.log('🎬 Starting slideshow with', state.stableUploads.length, 'uploads')
      startSlideshowInterval()
    } else if (!hasEnoughUploads && slideshowIntervalRef.current) {
      // Stop slideshow if we don't have enough uploads
      console.log('🛑 Stopping slideshow - not enough uploads')
      clearInterval(slideshowIntervalRef.current)
      slideshowIntervalRef.current = null
    }

    return () => {
      if (slideshowIntervalRef.current) {
        clearInterval(slideshowIntervalRef.current)
        slideshowIntervalRef.current = null
      }
    }
  }, [state.stableUploads.length > 1, event?.image_display_duration])

  // Update slot images only when appropriate
  useEffect(() => {
    if (state.stableUploads.length === 0) return
    
    const currentImage = state.stableUploads[state.currentImageIndex]
    const nextImageIndex = (state.currentImageIndex + 1) % state.stableUploads.length
    const nextImage = state.stableUploads[nextImageIndex]
    
    if (state.showingSlotA) {
      // Slot A is visible - it should show current image
      slotAImageRef.current = currentImage
      // Only update slot B (hidden) if it doesn't already have the next image
      if (!slotBImageRef.current || slotBImageRef.current !== nextImage) {
        slotBImageRef.current = nextImage
      }
    } else {
      // Slot B is visible - it should show current image  
      slotBImageRef.current = currentImage
      // Only update slot A (hidden) if it doesn't already have the next image
      if (!slotAImageRef.current || slotAImageRef.current !== nextImage) {
        slotAImageRef.current = nextImage
      }
    }
  }, [state.currentImageIndex, state.showingSlotA, state.stableUploads])
  
  // Initialize refs on first load
  useEffect(() => {
    if (state.stableUploads.length > 0 && !slotAImageRef.current) {
      slotAImageRef.current = state.stableUploads[0]
      slotBImageRef.current = state.stableUploads[1] || state.stableUploads[0]
    }
  }, [state.stableUploads])

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

  if (state.stableUploads.length === 0) {
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

  
  const slotAImage = slotAImageRef.current
  const slotBImage = slotBImageRef.current
  
  const uploadUrl = `${window.location.origin}/event/${eventCode}/upload`

  // Get challenge for upload
  const getChallenge = (upload: Upload) => {
    if (!upload?.challenge_id) return null
    return challenges.find(challenge => challenge.id === upload.challenge_id)
  }


  return (
    <div className={`min-h-screen bg-gradient-to-br ${event?.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900'} flex items-center justify-center relative overflow-hidden`}>
      {/* Crossfade Images - Two overlapping image containers */}
      
      {/* Slot A */}
      {slotAImage && (
        <div 
          data-slot-a
          className={`absolute transition-opacity duration-1000 ease-in-out ${state.showingSlotA ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="bg-white p-6 pb-20 rounded-lg shadow-2xl rotate-1 transition-transform duration-300 max-w-6xl max-h-[90vh] mx-auto">
            <div className="relative">
              <img
                src={slotAImage.file_url}
                alt={slotAImage.comment || 'Foto'}
                className="w-full h-auto max-h-[75vh] object-contain rounded-sm"
                style={{ aspectRatio: 'auto' }}
              />
              
              {getChallenge(slotAImage) && (
                <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
                  #{getChallenge(slotAImage)?.hashtag || getChallenge(slotAImage)?.title.toLowerCase().replace(/\s+/g, '')}
                </div>
              )}
            </div>
            
            <div className="mt-6 text-center">
              {slotAImage.comment && (
                <p className="text-gray-800 text-xl leading-relaxed mb-2" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
                  {slotAImage.comment}
                </p>
              )}
              <p className="text-gray-600 text-base" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
                - {slotAImage.uploader_name || 'Anonym'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slot B */}
      {slotBImage && (
        <div 
          data-slot-b
          className={`absolute transition-opacity duration-1000 ease-in-out ${!state.showingSlotA ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="bg-white p-6 pb-20 rounded-lg shadow-2xl rotate-1 transition-transform duration-300 max-w-6xl max-h-[90vh] mx-auto">
            <div className="relative">
              <img
                src={slotBImage.file_url}
                alt={slotBImage.comment || 'Foto'}
                className="w-full h-auto max-h-[75vh] object-contain rounded-sm"
                style={{ aspectRatio: 'auto' }}
              />
              
              {getChallenge(slotBImage) && (
                <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
                  #{getChallenge(slotBImage)?.hashtag || getChallenge(slotBImage)?.title.toLowerCase().replace(/\s+/g, '')}
                </div>
              )}
            </div>
            
            <div className="mt-6 text-center">
              {slotBImage.comment && (
                <p className="text-gray-800 text-xl leading-relaxed mb-2" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
                  {slotBImage.comment}
                </p>
              )}
              <p className="text-gray-600 text-base" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
                - {slotBImage.uploader_name || 'Anonym'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* QR Code */}
      <div className="absolute bottom-8 right-8 z-50">
        <QRCode value={uploadUrl} size={120} />
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
    </div>
  )
}