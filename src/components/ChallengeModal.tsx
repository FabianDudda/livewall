'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase, Database } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Challenge = Database['public']['Tables']['challenges']['Row']

interface ChallengeModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  challenge?: Challenge | null
  onChallengeCreated?: (challenge: Challenge) => void
  onChallengeUpdated?: (challenge: Challenge) => void
}

export default function ChallengeModal({ 
  isOpen, 
  onClose, 
  eventId, 
  challenge,
  onChallengeCreated,
  onChallengeUpdated
}: ChallengeModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    hashtag: ''
  })
  const [errors, setErrors] = useState({
    title: '',
    hashtag: ''
  })

  const modalRef = useRef<HTMLDivElement>(null)

  // Initialize form data when challenge changes
  useEffect(() => {
    if (challenge) {
      setFormData({
        title: challenge.title,
        hashtag: challenge.hashtag || challenge.title.toLowerCase().replace(/\s+/g, '')
      })
    } else {
      setFormData({
        title: '',
        hashtag: ''
      })
    }
  }, [challenge])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleClose = () => {
    if (isLoading) return
    
    setFormData({
      title: '',
      hashtag: ''
    })
    setErrors({ title: '', hashtag: '' })
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-generate hashtag from title if hashtag is empty or was auto-generated
      if (field === 'title' && (!prev.hashtag || prev.hashtag === prev.title.toLowerCase().replace(/\s+/g, ''))) {
        newData.hashtag = value.toLowerCase().replace(/\s+/g, '')
      }
      
      return newData
    })
    
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = { title: '', description: '', hashtag: '' }
    let isValid = true

    if (!formData.title.trim()) {
      newErrors.title = 'Titel ist erforderlich'
      isValid = false
    }

    if (!formData.hashtag.trim()) {
      newErrors.hashtag = 'Hashtag ist erforderlich'
      isValid = false
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.hashtag)) {
      newErrors.hashtag = 'Hashtag darf nur Buchstaben und Zahlen enthalten'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !user) return

    setIsLoading(true)

    try {
      const challengeData = {
        title: formData.title.trim(),
        hashtag: formData.hashtag.trim().toLowerCase(),
        event_id: eventId
      }

      if (challenge?.id) {
        // Update existing challenge
        const { data: updatedChallenge, error } = await supabase
          .from('challenges')
          .update(challengeData)
          .eq('id', challenge.id)
          .eq('event_id', eventId)
          .select()
          .single()

        if (error) {
          throw error
        }

        onChallengeUpdated?.(updatedChallenge)
      } else {
        // Create new challenge
        const { data: newChallenge, error } = await supabase
          .from('challenges')
          .insert(challengeData)
          .select()
          .single()

        if (error) {
          throw error
        }

        onChallengeCreated?.(newChallenge)
      }

      handleClose()
    } catch (error) {
      console.error('Error saving challenge:', error)
      setErrors(prev => ({ 
        ...prev, 
        title: 'Fehler beim Speichern der Challenge. Bitte versuchen Sie es erneut.' 
      }))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {challenge ? 'Challenge bearbeiten' : 'Neue Challenge erstellen'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            aria-label="Modal schließen"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Challenge-Titel *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="z.B. Lustigste Gruppe, Beste Tanzpose..."
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>


          <div>
            <label htmlFor="hashtag" className="block text-sm font-medium text-gray-700 mb-2">
              Hashtag *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">#</span>
              <input
                id="hashtag"
                type="text"
                value={formData.hashtag}
                onChange={(e) => handleInputChange('hashtag', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="hashtag"
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.hashtag ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.hashtag && (
              <p className="mt-1 text-sm text-red-600">{errors.hashtag}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Wird automatisch aus dem Titel generiert, kann aber angepasst werden
            </p>
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
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                challenge ? 'Challenge aktualisieren' : 'Challenge erstellen'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}