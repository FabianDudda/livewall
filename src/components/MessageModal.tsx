'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LiveMessage {
  id: string
  eventId: string
  message: string
  senderName?: string
  timestamp: number
}

interface MessageModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onMessageSent?: (message: LiveMessage) => void
}

export default function MessageModal({ 
  isOpen, 
  onClose, 
  eventId, 
  onMessageSent 
}: MessageModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    message: '',
    senderName: ''
  })
  const [errors, setErrors] = useState({
    message: ''
  })

  const modalRef = useRef<HTMLDivElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        message: '',
        senderName: ''
      })
      setErrors({
        message: ''
      })
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.message.trim()) {
      setErrors({ message: 'Nachricht darf nicht leer sein' })
      return
    }

    setIsLoading(true)
    setErrors({ message: '' })

    try {
      // Create message object
      const message: LiveMessage = {
        id: crypto.randomUUID(),
        eventId: eventId,
        message: formData.message.trim(),
        senderName: formData.senderName.trim() || undefined,
        timestamp: Date.now()
      }

      // Send message via Supabase real-time broadcast
      const channel = supabase.channel(`event-${eventId}`)
      
      await channel.send({
        type: 'broadcast',
        event: 'livewall_message',
        payload: message
      })

      if (onMessageSent) {
        onMessageSent(message)
      }

      handleClose()
    } catch (error) {
      console.error('Error sending message:', error)
      setErrors({ message: 'Fehler beim Senden der Nachricht' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Nachricht an die Fotowand</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Nachricht *
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              onKeyPress={handleKeyPress}
              placeholder="Deine Nachricht..."
              rows={3}
              maxLength={200}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-600">{errors.message}</span>
              <span className="text-xs text-gray-500">
                {formData.message.length}/200
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="senderName" className="block text-sm font-medium text-gray-700 mb-2">
              Name (optional)
            </label>
            <input
              type="text"
              id="senderName"
              value={formData.senderName}
              onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
              placeholder="Dein Name..."
              maxLength={50}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.message.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Senden
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}