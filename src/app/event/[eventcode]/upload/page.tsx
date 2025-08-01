'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Upload, Image as ImageIcon, X, Check, AlertCircle } from 'lucide-react'
import SimpleImageGallery from '@/components/SimpleImageGallery'
import { supabase } from '@/lib/supabase'
import { uploadGuestImage } from '@/lib/guestUpload'
import { Database } from '@/lib/supabase'
import { verifyEventPassword } from '@/lib/eventPasswordEncryption'
import { checkStoredPassword, storePasswordAuthentication } from '@/lib/authStorage'

type Event = Database['public']['Tables']['events']['Row']
type Upload = Database['public']['Tables']['uploads']['Row']
type Challenge = Database['public']['Tables']['challenges']['Row']

interface UploadPageState {
  event: Event | null
  uploads: Upload[]
  challenges: Challenge[]
  isLoading: boolean
  isUploading: boolean
  uploadProgress: number
  showUploadForm: boolean
  selectedFile: File | null
  previewUrl: string | null
  error: string | null
  success: string | null
  isPasswordProtected: boolean
  isAuthenticated: boolean
  passwordError: string | null
}

// Utility functions for uploader name persistence
const UPLOADER_NAME_KEY = (eventId: string) => `livewall_uploader_name_${eventId}`

const saveUploaderName = (eventId: string, name: string) => {
  if (typeof window !== 'undefined' && eventId && name.trim()) {
    localStorage.setItem(UPLOADER_NAME_KEY(eventId), name.trim())
  }
}

const loadUploaderName = (eventId: string): string => {
  if (typeof window !== 'undefined' && eventId) {
    return localStorage.getItem(UPLOADER_NAME_KEY(eventId)) || ''
  }
  return ''
}

export default function UploadPage() {
  const params = useParams()
  const eventCode = params.eventcode as string
  const [eventId, setEventId] = useState<string | null>(null)

  const [state, setState] = useState<UploadPageState>({
    event: null,
    uploads: [],
    challenges: [],
    isLoading: true,
    isUploading: false,
    uploadProgress: 0,
    showUploadForm: false,
    selectedFile: null,
    previewUrl: null,
    error: null,
    success: null,
    isPasswordProtected: false,
    isAuthenticated: false,
    passwordError: null,
  })

  const [formData, setFormData] = useState({
    name: '',
    comment: '',
    challengeId: ''
  })

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const bottomSheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isDragging = useRef(false)


  useEffect(() => {
    if (eventCode) {
      loadEventData()
    }
  }, [eventCode])

  // Load saved uploader name when eventId is available
  useEffect(() => {
    if (eventId) {
      const savedName = loadUploaderName(eventId)
      if (savedName) {
        setFormData(prev => ({ ...prev, name: savedName }))
      }
    }
  }, [eventId])

  // Handle escape key and focus management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showUploadModal) {
        handleCloseModal()
      }
    }

    if (showUploadModal) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      
      // Focus the bottom sheet for accessibility
      setTimeout(() => {
        bottomSheetRef.current?.focus()
      }, 100)
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showUploadModal])

  const handleCloseModal = () => {
    setIsClosing(true)
    setTimeout(() => {
      setShowUploadModal(false)
      setIsClosing(false)
    }, 300)
  }

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    currentY.current = startY.current
    isDragging.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !bottomSheetRef.current) return

    currentY.current = e.touches[0].clientY
    const deltaY = Math.max(0, currentY.current - startY.current)
    
    // Apply transform during drag
    bottomSheetRef.current.style.transform = `translateY(${deltaY}px)`
    
    // Fade backdrop based on drag distance
    const backdrop = bottomSheetRef.current.parentElement
    if (backdrop) {
      const opacity = Math.max(0.4 - (deltaY / 400), 0)
      backdrop.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging.current || !bottomSheetRef.current) return
    
    const deltaY = currentY.current - startY.current
    const threshold = 100 // Close if dragged more than 100px down
    
    if (deltaY > threshold) {
      handleCloseModal()
    } else {
      // Snap back to original position
      bottomSheetRef.current.style.transform = 'translateY(0)'
      const backdrop = bottomSheetRef.current.parentElement
      if (backdrop) {
        backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'
      }
    }
    
    isDragging.current = false
  }

  const loadEventData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Fetch event by event_code
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', eventCode)
        .single()

      if (eventError || !event) {
        setState(prev => ({ ...prev, error: 'Event nicht gefunden', isLoading: false }))
        return
      }

      // Set password protection state
      const isAuthenticated = !event.password_protected || checkStoredPassword(event.id)
      setEventId(event.id)
      setState(prev => ({
        ...prev,
        isPasswordProtected: event.password_protected,
        isAuthenticated: isAuthenticated
      }))

      // Load uploads and challenges
      const [uploadsResult, challengesResult] = await Promise.all([
        supabase
          .from('uploads')
          .select('*')
          .eq('event_id', event.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('challenges')
          .select('*')
          .eq('event_id', event.id)
          .order('created_at', { ascending: false })
      ])

      if (uploadsResult.error) throw uploadsResult.error
      if (challengesResult.error) throw challengesResult.error

      setState(prev => ({
        ...prev,
        event,
        uploads: uploadsResult.data || [],
        challenges: challengesResult.data || [],
        isLoading: false
      }))

    } catch (error) {
      console.error('Error loading event data:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Fehler beim Laden der Event-Daten',
        isLoading: false
      }))
    }
  }

  const loadUploads = async () => {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    if (!error) setState(prev => ({ ...prev, uploads: data || [] }))
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setState(prev => ({ ...prev, error: 'Nur Bilder und Videos sind erlaubt' }))
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setState(prev => ({ ...prev, error: 'Datei ist zu groß. Maximum 10MB erlaubt.' }))
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setState(prev => ({
      ...prev,
      selectedFile: file,
      previewUrl,
      showUploadForm: true,
      error: null
    }))
  }

  const handleSmartUploadClick = () => {
    const isAndroid = /Android/i.test(navigator.userAgent)
    if (isAndroid) {
      setShowUploadModal(true)
    } else {
      handleGallerySelect()
    }
  }
  
  const handleCameraCapture = async () => {
    try {
      // Create file input that specifically opens camera
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'camera' // This forces camera to open directly on mobile
      input.setAttribute('capture', 'camera') // Additional attribute for better support
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          handleFileSelect(file)
        }
      }
      input.click()
    } catch (error) {
      console.error('Camera access error:', error)
      setState(prev => ({ ...prev, error: 'Kamera-Zugriff nicht möglich' }))
    }
  }

  const handleVideoCameraCapture = async () => {
    try {
      // Create file input that specifically opens video camera
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'video/*'
      input.setAttribute('capture', 'camcorder') // This forces video camera to open
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          handleFileSelect(file)
        }
      }
      input.click()
    } catch (error) {
      console.error('Video camera access error:', error)
      setState(prev => ({ ...prev, error: 'Video-Kamera-Zugriff nicht möglich' }))
    }
  }

  const handleGallerySelect = () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*,video/*'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          handleFileSelect(file)
        }
      }
      input.click()
    } catch (error) {
      console.error('Galeriezugriff fehlgeschlagen:', error)
      setState(prev => ({ ...prev, error: 'Zugriff auf Galerie nicht möglich' }))
    }
  }

  const handleUpload = async () => {
    if (!state.selectedFile || !state.event) return

    setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0, error: null }))

    try {
      const result = await uploadGuestImage({
        eventCode: state.event?.event_code || '',
        file: state.selectedFile,
        uploaderName: formData.name || undefined,
        comment: formData.comment || undefined,
        challengeId: formData.challengeId || undefined
      })

      if (result.success) {
        const successMessage = result.autoApproved 
          ? 'Upload erfolgreich! Das Bild wurde automatisch freigegeben.'
          : 'Upload erfolgreich! Das Bild wartet auf Freigabe.'
        
        setState(prev => ({
          ...prev,
          success: successMessage,
          showUploadForm: false,
          selectedFile: null,
          previewUrl: null,
          isUploading: false,
          uploadProgress: 100
        }))
        
        // Reset form but preserve the name for next upload
        setFormData(prev => ({ name: prev.name, comment: '', challengeId: '' }))
        await loadUploads() // Refresh uploads
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setState(prev => ({ ...prev, success: null }))
        }, 3000)
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Upload fehlgeschlagen',
          isUploading: false,
          uploadProgress: 0
        }))
      }
    } catch (error) {
      console.error('Upload error:', error)
      setState(prev => ({
        ...prev,
        error: 'Upload fehlgeschlagen',
        isUploading: false,
        uploadProgress: 0
      }))
    }
  }

  const handleCancelUpload = () => {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl)
    }
    setState(prev => ({
      ...prev,
      showUploadForm: false,
      selectedFile: null,
      previewUrl: null,
      error: null
    }))
    // Reset form but preserve the name
    setFormData(prev => ({ name: prev.name, comment: '', challengeId: '' }))
  }

  const handlePasswordSubmit = async (password: string) => {
    if (!state.event || !state.event.password) {
      setState(prev => ({ ...prev, passwordError: 'Fehler bei der Passwort-Überprüfung' }))
      return
    }

    try {
      const isValid = verifyEventPassword(password, state.event.password, state.event.event_code)
      if (isValid) {
        // Store authentication in localStorage
        storePasswordAuthentication(eventId!)
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          passwordError: null
        }))
      } else {
        setState(prev => ({ ...prev, passwordError: 'Falsches Passwort' }))
      }
    } catch (error) {
      console.error('Password verification error:', error)
      setState(prev => ({ ...prev, passwordError: 'Fehler bei der Passwort-Überprüfung' }))
    }
  }

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (state.error && !state.event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event nicht gefunden</h1>
          <p className="text-gray-600">{state.error}</p>
        </div>
      </div>
    )
  }

  // Show password form if event is password protected and user is not authenticated
  if (state.isPasswordProtected && !state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Passwort erforderlich</h1>
              <p className="text-gray-600">Dieses Event ist passwortgeschützt</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const password = formData.get('password') as string
              handlePasswordSubmit(password)
            }}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Event-Passwort eingeben"
                />
              </div>

              {state.passwordError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{state.passwordError}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Zugang freischalten
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }



  return (
    <div className="min-h-screen bg-white">
      {/* Minimalistic Header */}
      <div className="border-b border-gray-100">
        <div className={`bg-gradient-to-br ${state.event?.upload_header_gradient || 'from-gray-50 to-white'} max-w-6xl mx-auto px-6 py-8`}>
          <div className="text-center">
            {/* Circular Event Cover Image */}
            {state.event?.cover_image_url && (
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-52 lg:h-52 xl:w-56 xl:h-56 max-w-[200px] max-h-[200px] rounded-full overflow-hidden border-4 border-gray-100 shadow-lg">
                  <img
                    src={state.event.cover_image_url}
                    alt={state.event.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-white whitespace-nowrap overflow-hidden text-ellipsis px-4">{state.event?.name}</h1>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {state.success && (
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="bg-green-50 border border-green-100 text-green-800 px-6 py-4 rounded-2xl flex items-center shadow-sm">
            <Check className="w-5 h-5 mr-3 text-green-600" />
            {state.success}
          </div>
        </div>
      )}

      {state.error && (
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="bg-red-50 border border-red-100 text-red-800 px-6 py-4 rounded-2xl flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 text-red-600" />
            {state.error}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {!state.showUploadForm ? (
          <div className="text-center mb-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">

              <button
                onClick={handleSmartUploadClick}
                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                <Camera className="w-5 h-5" />
                Foto aufnehmen oder auswählen
              </button>

            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Upload Details</h2>
              <button
                onClick={handleCancelUpload}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Preview */}
            {state.previewUrl && (
              <div className="mb-6">
                {state.selectedFile?.type.startsWith('image/') ? (
                  <img
                    src={state.previewUrl}
                    alt="Preview"
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                  />
                ) : (
                  <video
                    src={state.previewUrl}
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                    controls
                  />
                )}
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dein Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value
                    setFormData(prev => ({ ...prev, name: newName }))
                    // Automatically save name to localStorage when user types
                    if (eventId) {
                      saveUploaderName(eventId, newName)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Wie heißt du?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung (optional)
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Beschreibe dein Foto/Video..."
                />
              </div>

              {state.challenges.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challenge (optional)
                  </label>
                  <select
                    value={formData.challengeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, challengeId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Keine Challenge</option>
                    {state.challenges.map(challenge => (
                      <option key={challenge.id} value={challenge.id}>
                        {challenge.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleUpload}
                  disabled={state.isUploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {state.isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Wird hochgeladen...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Hochladen
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelUpload}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>

                {state.isUploading && state.uploadProgress > 0 && (
                  <>
                    <div className="mt-2 text-sm text-gray-600 text-center">
                      {state.uploadProgress}%
                    </div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-200"
                        style={{ width: `${state.uploadProgress}%` }}
                      ></div>
                    </div>
                  </>
                )}
            
              </div>
            </div>
          </div>
        )}

        {/* Bottom Sheet Upload Modal */}
        {showUploadModal && (
          <div 
            className={`fixed inset-0 z-50 transition-all duration-300 ease-out ${
              isClosing ? 'bg-black/0' : 'bg-black/40'
            }`}
            onClick={handleCloseModal}
          >
            <div
              ref={bottomSheetRef}
              tabIndex={-1}
              className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl transition-transform duration-300 ease-out focus:outline-none ${
                isClosing ? 'translate-y-full' : 'translate-y-0'
              }`}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Content */}
              <div className="px-6 pb-6">
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Was möchtest du tun?</h2>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleCloseModal()
                      setTimeout(() => handleCameraCapture(), 300)
                    }}
                    className="w-full bg-gray-800 hover:bg-gray-900 active:bg-gray-700 text-white px-6 py-4 rounded-xl font-medium flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] touch-manipulation"
                  >
                    <span className="text-xl">📸</span>
                    <span>Kamera Foto</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleCloseModal()
                      setTimeout(() => handleVideoCameraCapture(), 300)
                    }}
                    className="w-full bg-gray-800 hover:bg-gray-900 active:bg-gray-700 text-white px-6 py-4 rounded-xl font-medium flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] touch-manipulation"
                  >
                    <span className="text-xl">🎥</span>
                    <span>Kamera Video</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleCloseModal()
                      setTimeout(() => handleGallerySelect(), 300)
                    }}
                    className="w-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 px-6 py-4 rounded-xl font-medium flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] touch-manipulation"
                  >
                    <span className="text-xl">🖼️</span>
                    <span>Galerie auswählen</span>
                  </button>
                </div>
                
                <div className="mt-6 text-center">
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-500 hover:text-gray-700 py-2 px-4 transition-colors touch-manipulation"
                  >
                    Abbrechen
                  </button>
                </div>
                
                {/* Safe area padding for devices with home indicators */}
                <div className="pb-safe-area-inset-bottom"></div>
              </div>
            </div>
          </div>
        )}


        {/* Uploads Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Bilder ({state.uploads.length})
          </h2>
          
          {state.uploads.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Noch keine Uploads vorhanden</p>
              <p className="text-sm text-gray-500">Sei der Erste, der ein Foto hochlädt!</p>
            </div>
          ) : (
            <SimpleImageGallery
              images={state.uploads.map((upload) => {
                const challenge = upload.challenge_id 
                  ? state.challenges.find(c => c.id === upload.challenge_id)
                  : null
                
                return {
                  id: upload.id,
                  url: upload.file_url || "https://csswouhdugmztnnglcdn.supabase.co/storage/v1/object/public/app//fallback.jpg",
                  alt: upload.uploader_name || 'Upload',
                  title: upload.uploader_name || 'Anonymer Nutzer',
                  description: upload.comment || undefined,
                  challengeTitle: challenge?.hashtag || challenge?.title.toLowerCase().replace(/\s+/g, ''),
                  file_type: upload.file_type
                }
              })}
            />
          )}
        </div>
      </div>
    </div>
  )
}