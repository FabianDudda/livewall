'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Database } from '@/lib/supabase'

type Upload = Database['public']['Tables']['uploads']['Row']
type Event = Database['public']['Tables']['events']['Row']

interface SlideshowProps {
  event: Event
}

export default function Slideshow({ event }: SlideshowProps) {
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
            // If it became unapproved, remove it from queue
            const updatedQueue = queueRef.current.filter(
              (upload) => upload.id !== updatedUpload.id
            )
            queueRef.current = updatedQueue
            setQueue(updatedQueue)
            return
          }

          // Otherwise, update the upload in queue if it exists
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

          // Adjust currentIndex if needed
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

      // Insert any new uploads from buffer at the next index, sorted by created_at ascending
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

        // Update nextIndex after inserting new images
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

  // Keep refs in sync
  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  if (queue.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No images to display</p>
      </div>
    )
  }

  const currentImage = queue[currentIndex]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <img
        src={currentImage.file_url}
        alt={currentImage.comment || 'Photo'}
        className="max-w-full max-h-screen object-contain"
      />

      {(currentImage.uploader_name || currentImage.comment) && (
        <div className="mt-4 text-center">
          {currentImage.comment && (
            <p className="text-lg mb-2">{currentImage.comment}</p>
          )}
          {currentImage.uploader_name && (
            <p className="text-gray-600">- {currentImage.uploader_name}</p>
          )}
        </div>
      )}
    </div>
  )
}
