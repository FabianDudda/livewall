'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Database } from '@/lib/supabase'
import QRCode from '@/components/QRCode'
import { AnimatePresence, motion } from 'framer-motion'

type Upload = Database['public']['Tables']['uploads']['Row']
type Event = Database['public']['Tables']['events']['Row']

interface SlideshowProps {
  event: Event
}

export default function Slideshow({ event }: SlideshowProps) {
  const params = useParams()
  const eventCode = params.eventcode as string
  const [queue, setQueue] = useState<Upload[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const queueRef = useRef<Upload[]>([])
  const currentIndexRef = useRef<number>(0)
  const pendingUploadsRef = useRef<Upload[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch approved uploads for this event
  const fetchUploads = async () => {
    const { data: uploads, error } = await supabase
      .from('uploads')
      .select('*')
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
  }

  useEffect(() => {
    fetchUploads()
  }, [event.id])

  // Realtime: handle INSERT, UPDATE, DELETE events
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
        (payload) => {
          const newUpload = payload.new as Upload
          if (!newUpload.approved) return
          // Add to pending buffer
          pendingUploadsRef.current = [
            ...pendingUploadsRef.current,
            newUpload,
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
        (payload) => {
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
            const updatedQueue = [...queueRef.current]
            updatedQueue[idx] = updatedUpload
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

  // Slideshow loop
  useEffect(() => {
    if (queue.length === 0) return

    const displayDuration = (event.image_display_duration || 10) * 1000

    intervalRef.current = setInterval(() => {
      let nextIndex = currentIndexRef.current + 1

      if (pendingUploadsRef.current.length > 0) {
        const sortedPending = [...pendingUploadsRef.current].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        const updatedQueue = [...queueRef.current]
        const insertAt = currentIndexRef.current + 1
        updatedQueue.splice(insertAt, 0, ...sortedPending)

        queueRef.current = updatedQueue
        setQueue(updatedQueue)

        pendingUploadsRef.current = []
        nextIndex = currentIndexRef.current + 1
      }

      if (nextIndex >= queueRef.current.length) {
        fetchUploads()
        return
      }

      currentIndexRef.current = nextIndex
      setCurrentIndex(nextIndex)
    }, displayDuration)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [queue.length, event.image_display_duration])

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  if (queue.length === 0) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${event?.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900'} flex items-center justify-center`}>
        <p className="text-white text-xl">Warten auf die ersten Fotos...</p>
      </div>
    )
  }

  const currentImage = queue[currentIndex]
  const uploadUrl = `${window.location.origin}/event/${eventCode}/upload`

  return (
    <div className={`min-h-screen bg-gradient-to-br ${event?.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900'} flex flex-col items-center justify-center p-4 relative overflow-hidden`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImage.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white p-6 pb-20 rounded-lg shadow-2xl rotate-1 transition-transform duration-300 max-w-6xl max-h-[90vh] mx-auto"
        >
          <div className="relative">
            <img
              src={currentImage.file_url}
              alt={currentImage.comment || 'Photo'}
              className="w-full h-auto max-h-[75vh] object-contain rounded-sm"
              style={{ aspectRatio: 'auto' }}
            />
          </div>

          <div className="mt-6 text-center">
            {currentImage.comment && (
              <p className="text-gray-800 text-xl leading-relaxed mb-2" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
                {currentImage.comment}
              </p>
            )}
            <p className="text-gray-600 text-base" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
              - {currentImage.uploader_name || 'Anonym'}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <motion.div
        key={currentImage.id + '-qr'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute bottom-8 right-8 z-50"
      >
        <QRCode value={uploadUrl} size={120} />
      </motion.div>
    </div>
  )
}
