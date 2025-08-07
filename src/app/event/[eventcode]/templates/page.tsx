'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Database } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TemplateConfig } from '@/lib/templateGenerator'
import { decryptEventPassword } from '@/lib/eventPasswordEncryption'
import CustomizationPanel from './components/CustomizationPanel'
import PreviewCanvas from './components/PreviewCanvas'
import ExportButton from './components/ExportButton'

type Event = Database['public']['Tables']['events']['Row']

export default function TemplatesPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const eventCode = params.eventcode as string

  // State
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [config, setConfig] = useState<TemplateConfig>({
    templateType: 'a5',
    eventName: '',
    customMessage: 'Share your best moments with me',
    instructions: 'Scan to upload your photos & videos',
    footer: 'www.livewall.de',
    colorScheme: 'blue',
    font: 'Inter',
    qrCodeSize: 'medium',
    uploadUrl: '',
    eventPassword: '',
    isPasswordProtected: false
  })

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data: eventData, error } = await supabase
          .from('events')
          .select('*')
          .eq('event_code', eventCode)
          .single()

        if (error) {
          console.error('Error fetching event:', error)
          if (error.code === 'PGRST116') {
            // Event not found
            router.push('/dashboard')
            return
          }
          throw error
        }

        // Check if user owns this event
        if (eventData.user_id !== user?.id) {
          router.push('/dashboard')
          return
        }

        setEvent(eventData)
        
        // Initialize config with event data
        const uploadUrl = `${window.location.origin}/event/${eventCode}/upload`
        
        // Decrypt password if it exists
        let decryptedPassword = ''
        if (eventData.password && eventData.password_protected) {
          try {
            decryptedPassword = decryptEventPassword(eventData.password, eventData.event_code)
          } catch (error) {
            console.error('Error decrypting password:', error)
            decryptedPassword = ''
          }
        }
        
        setConfig(prev => ({
          ...prev,
          eventName: `Welcome to\n${eventData.name}`,
          customMessage: 'Share your best moments with me',
          uploadUrl,
          instructions: 'Scan to upload your photos & videos',
          eventPassword: decryptedPassword,
          isPasswordProtected: eventData.password_protected || false
        }))

      } catch (error) {
        console.error('Error fetching event:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    if (user && eventCode) {
      fetchEvent()
    } else if (!user) {
      router.push('/auth')
    }
  }, [eventCode, user, router])

  // Handle config updates
  const handleConfigChange = (updates: Partial<TemplateConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  // Handle canvas ready
  const handleCanvasReady = (canvasElement: HTMLCanvasElement) => {
    setCanvas(canvasElement)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    )
  }

  // Error state - shouldn't happen due to redirects, but just in case
  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600 mb-4">The requested event could not be found.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/event/${eventCode}/dashboard`)}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Template Generator</h1>
              </div>
            </div>
            
            <ExportButton 
              config={config} 
              canvas={canvas}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Editor Layout */}
        <div className="flex gap-8">
          {/* Customization Panel */}
          <CustomizationPanel
            config={config}
            onConfigChange={handleConfigChange}
            isLoading={loading}
          />

          {/* Preview Area */}
          <PreviewCanvas
            config={config}
            onCanvasReady={handleCanvasReady}
          />
        </div>
      </div>

    </div>
  )
}