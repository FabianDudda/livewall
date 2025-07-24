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

  // Fly-in state + Richtung
  const [flyingUploads, setFlyingUploads] = useState<{ upload: Upload; fromLeft: boolean }[]>([])
  const flyDirectionRef = useRef(true) // true = left, false = right

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

  // Realtime listeners
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
          pendingUploadsRef.current = [...pendingUploadsRef.current, newUpload]
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
          const updated = payload.new as Upload
          if (!updated.approved) {
            queueRef.current = queueRef.current.filter((u) => u.id !== updated.id)
            setQueue(queueRef.current)
            return
          }
          const idx = queueRef.current.findIndex((u) => u.id === updated.id)
          if (idx !== -1) {
            const updatedQueue = [...queueRef.current]
            updatedQueue[idx] = updated
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
          const deleted = payload.old as Upload
          queueRef.current = queueRef.current.filter((u) => u.id !== deleted.id)
          setQueue(queueRef.current)
          if (currentIndexRef.current >= queueRef.current.length) {
            currentIndexRef.current = Math.max(0, queueRef.current.length - 1)
            setCurrentIndex(currentIndexRef.current)
          }
        }
      )
      .subscribe()

    return () => {channel.unsubscribe()}
  }, [event.id])

  // Slideshow Loop
  useEffect(() => {
    if (queue.length === 0) return

    const duration = (event.image_display_duration || 10) * 1000

    intervalRef.current = setInterval(() => {
      let nextIndex = currentIndexRef.current + 1

      // Insert new uploads from buffer
      if (pendingUploadsRef.current.length > 0) {
        const sorted = [...pendingUploadsRef.current].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        // Fly in
        const flying = sorted.map((upload) => {
          const fromLeft = flyDirectionRef.current
          flyDirectionRef.current = !flyDirectionRef.current
          return { upload, fromLeft }
        })

        setFlyingUploads((prev) => [...prev, ...flying])

        // Insert into queue
        const updatedQueue = [...queueRef.current]
        updatedQueue.splice(currentIndexRef.current + 1, 0, ...sorted)

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
    }, duration)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [queue.length, event.image_display_duration])

  // Fly-In-Bilder nach Zeit entfernen
  useEffect(() => {
    if (flyingUploads.length === 0) return
    const timer = setTimeout(() => setFlyingUploads([]), 3500)
    return () => clearTimeout(timer)
  }, [flyingUploads])

  // Keep refs synced
  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  if (queue.length === 0) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${event?.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900'} flex items-center justify-center`}>
        <p className="text-white text-xl">Warten auf die ersten Fotos…</p>
      </div>
    )
  }

  const currentImage = queue[currentIndex]
  const uploadUrl = `${window.location.origin}/event/${eventCode}/upload`

  return (
    <div className={`min-h-screen bg-gradient-to-br ${event?.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900'} flex flex-col items-center justify-center p-4 relative overflow-hidden`}>
      {/* Fly-in Animation */}
      <AnimatePresence>
  {flyingUploads.map(({ upload, fromLeft }) => (
    <motion.img
      key={`fly-${upload.id}`}
      src={upload.file_url}
      initial={{
        y: window.innerHeight * 0.5, // Start: unterhalb des Bildschirms
      }}
      animate={{
        y: -window.innerHeight, // Ziel: oberhalb des Bildschirms
        transition: { duration: 3.5, ease: 'linear' }, // gleichmäßig, ohne Beschleunigung
      }}
      exit={{}} // kein Exit nötig
      style={{
        position: 'fixed',
        bottom: 0,
        width: 240,
        zIndex: 9999,
        borderRadius: 12,
        boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        userSelect: 'none',
        left: fromLeft ? '20%' : '60%',
        transform: 'translateX(-50%)',
      }}
    />
  ))}
</AnimatePresence>








      {/* Hauptbild */}
      <div className="bg-white p-6 pb-20 rounded-lg shadow-2xl rotate-1 transition-transform duration-300 max-w-6xl max-h-[90vh] mx-auto">
        <div className="relative">
          <img
            src={currentImage.file_url || "https://csswouhdugmztnnglcdn.supabase.co/storage/v1/object/public/app//fallback.jpg"}
            alt={currentImage.comment || 'Photo'}
            className="w-full h-auto max-h-[75vh] object-contain rounded-sm"
            style={{ aspectRatio: 'auto' }}
          />
        </div>

        {/* Caption */}
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
      </div>

      {/* QR Code */}
      <div className="absolute bottom-8 right-8 z-50">
        <QRCode value={uploadUrl} size={120} />
      </div>
    </div>
  )
}
