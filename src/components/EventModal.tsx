'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { generateUniqueEventCode } from '@/lib/eventCode'
import { encryptEventPassword } from '@/lib/eventPasswordEncryption'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onEventCreated?: (event: {
    id: string
    name: string
    event_code: string
    cover_image_url?: string | null
    created_at: string
  }) => void
}

export default function EventModal({ isOpen, onClose, onEventCreated }: EventModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    coverImage: null as File | null,
    autoApproval: false,
    passwordProtected: false,
    password: ''
  })
  const [errors, setErrors] = useState({
    name: '',
    coverImage: '',
    password: ''
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

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
      name: '',
      coverImage: null,
      autoApproval: false,
      passwordProtected: false,
      password: ''
    })
    setErrors({ name: '', coverImage: '', password: '' })
    setImagePreview(null)
    setShowPassword(false)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const handleInputChange = (field: string, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, coverImage: 'Bitte wählen Sie eine Bilddatei aus' }))
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, coverImage: 'Die Datei ist zu groß. Maximum 5MB erlaubt.' }))
        return
      }

      handleInputChange('coverImage', file)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = () => {
    const newErrors = { name: '', coverImage: '', password: '' }
    let isValid = true

    if (!formData.name.trim()) {
      newErrors.name = 'Event-Name ist erforderlich'
      isValid = false
    }

    if (formData.passwordProtected && !formData.password.trim()) {
      newErrors.password = 'Passwort ist erforderlich wenn Event passwortgeschützt ist'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  // Note: Folder structure is created automatically when files are uploaded
  // We don't need to create placeholder files anymore

  const uploadCoverImage = async (file: File, eventCode: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `cover.${fileExt}`
      const filePath = `${eventCode}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Create a signed URL for the private bucket (expires in 1 year)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('event-media')
        .createSignedUrl(filePath, 31536000) // 1 year in seconds

      if (signedUrlError) {
        throw signedUrlError
      }

      return signedUrlData.signedUrl
    } catch (error) {
      console.error('Error uploading cover image:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !user) return

    setIsLoading(true)

    try {
      const eventCode = await generateUniqueEventCode()

      let coverImageUrl = null
      
      if (formData.coverImage) {
        coverImageUrl = await uploadCoverImage(formData.coverImage, eventCode)
        if (!coverImageUrl) {
          throw new Error('Fehler beim Hochladen des Cover-Bildes')
        }
      }

      // Encrypt password if password protection is enabled
      let encryptedPassword = null
      if (formData.passwordProtected && formData.password) {
        encryptedPassword = encryptEventPassword(formData.password, eventCode)
      }

      const eventData = {
        name: formData.name.trim(),
        event_code: eventCode,
        cover_image_url: coverImageUrl,
        auto_approval: formData.autoApproval,
        password_protected: formData.passwordProtected,
        password: encryptedPassword,
        user_id: user.id
      }

      const { data: event, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single()

      if (error) {
        throw error
      }

      onEventCreated?.(event)
      handleClose()
    } catch (error) {
      console.error('Error creating event:', error)
      setErrors(prev => ({ 
        ...prev, 
        name: 'Fehler beim Erstellen des Events. Bitte versuchen Sie es erneut.' 
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
          <h2 className="text-xl font-semibold text-gray-900">Event erstellen</h2>
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
            <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-2">
              Event-Name *
            </label>
            <input
              id="eventName"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="z.B. Hochzeit Anna & Max"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover-Bild
            </label>
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                {imagePreview ? (
                  <div className="space-y-2">
                    <img
                      src={imagePreview}
                      alt="Cover Vorschau"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <p className="text-sm text-gray-600">Klicken Sie, um das Bild zu ändern</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      Klicken Sie, um ein Bild hochzuladen
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG bis zu 5MB
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isLoading}
              />
            </div>
            {errors.coverImage && (
              <p className="mt-1 text-sm text-red-600">{errors.coverImage}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="autoApproval" className="text-sm font-medium text-gray-700">
                Auto-Freigabe
              </label>
              <p className="text-xs text-gray-500">
                Uploads werden automatisch freigegeben
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleInputChange('autoApproval', !formData.autoApproval)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                formData.autoApproval ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              disabled={isLoading}
              aria-label="Auto-Freigabe umschalten"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.autoApproval ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="passwordProtected" className="text-sm font-medium text-gray-700">
                Passwort-geschützt
              </label>
              <p className="text-xs text-gray-500">
                Teilnehmer benötigen ein Passwort
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleInputChange('passwordProtected', !formData.passwordProtected)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                formData.passwordProtected ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              disabled={isLoading}
              aria-label="Passwort-Schutz umschalten"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.passwordProtected ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {formData.passwordProtected && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Passwort *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Passwort eingeben"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Passwort verstecken' : 'Passwort anzeigen'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          )}

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
                'Event erstellen'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}