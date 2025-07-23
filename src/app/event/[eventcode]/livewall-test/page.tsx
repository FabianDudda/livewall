'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Database } from '@/lib/supabase'
import Slideshow from './Slideshow'

type Event = Database['public']['Tables']['events']['Row']

export default function SlideshowPage() {
  const params = useParams()
  const eventCode = params.eventcode as string
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvent = async () => {
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', eventCode)
        .single()

      setEvent(event)
      setLoading(false)
    }

    if (eventCode) {
      fetchEvent()
    }
  }, [eventCode])

  if (loading) return <div>Loading...</div>
  if (!event) return <div>Event not found</div>

  return <Slideshow event={event} />
}