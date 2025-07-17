'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LogOut, Plus, BarChart3, Settings, QrCode, Calendar, Users, Image, ExternalLink } from 'lucide-react'
import EventModal from '@/components/EventModal'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']

export default function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchEvents()
    }
  }, [user])

  const fetchEvents = async () => {
    try {
      setIsLoadingEvents(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setEvents(data || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('Fehler beim Laden der Events')
    } finally {
      setIsLoadingEvents(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/')
    }
  }

  const handleEventCreated = (newEvent: {
    id: string
    name: string
    event_code: string
    cover_image_url?: string | null
    created_at: string
  }) => {
    // Convert the partial event to a full Event object with defaults
    const fullEvent: Event = {
      id: newEvent.id,
      name: newEvent.name,
      event_code: newEvent.event_code,
      cover_image_url: newEvent.cover_image_url || null,
      auto_approval: false,
      password_protected: false,
      password: null,
      created_at: newEvent.created_at,
      updated_at: newEvent.created_at,
      user_id: user?.id || ''
    }
    setEvents(prev => [fullEvent, ...prev])
    setIsEventModalOpen(false)
  }

  const handleEventClick = (eventId: string) => {
    router.push(`/event/${eventId}/dashboard`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">LiveWall</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Willkommen, {user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Verwalten Sie Ihre Events und Live-Fotowände</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button 
            onClick={() => setIsEventModalOpen(true)}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
          >
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Neues Event</h3>
            <p className="text-gray-600 text-sm">Erstellen Sie ein neues Event</p>
          </button>

          <button className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <QrCode className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">QR-Codes</h3>
            <p className="text-gray-600 text-sm">QR-Codes verwalten</p>
          </button>

          <button className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600 text-sm">Event-Statistiken ansehen</p>
          </button>

          <button className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left">
            <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Settings className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Einstellungen</h3>
            <p className="text-gray-600 text-sm">Konto verwalten</p>
          </button>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Ihre Events</h3>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Neues Event
            </button>
          </div>
          
          <div className="p-6">
            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <button
                  onClick={fetchEvents}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Erneut versuchen
                </button>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Noch keine Events</h4>
                <p className="text-gray-600 mb-4">
                  Erstellen Sie Ihr erstes Event, um loszulegen
                </p>
                <button 
                  onClick={() => setIsEventModalOpen(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Erstes Event erstellen
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleEventClick(event.id)}
                  >
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt={event.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <Image className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 truncate">{event.name}</h4>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(event.created_at)}
                        </div>
                        <div className="flex items-center gap-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {event.event_code}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        {event.auto_approval && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            Auto-Freigabe
                          </span>
                        )}
                        {event.password_protected && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            Passwort-geschützt
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event.id)
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Event öffnen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  )
}