'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Upload, Image as ImageIcon, X, Check, AlertCircle, MessageSquare } from 'lucide-react'
import SimpleImageGallery from '@/components/SimpleImageGallery'
import MessageModal from '@/components/MessageModal'
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
  showMessageModal: boolean
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
    showMessageModal: false
  })

  const [formData, setFormData] = useState({
    name: '',
    comment: '',
    challengeId: ''
  })

  const isAndroid = /Android/i.test(navigator.userAgent)

  useEffect(() => {
    if (eventCode) {
      loadEventData()
    }
  }, [eventCode])


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
  
    // if (isAndroid) {
      // Custom Auswahl-Dialog z. B. via window.confirm (für MVP) oder eigenes Modal
      const useCamera = window.confirm("Möchtest du die Kamera verwenden? (Abbrechen = Galerie)")
      if (useCamera) {
        handleCameraCapture()
      } else {
        handleUpload()
      }
    // } else {
    //   // iOS & Desktop → direkt normal öffnen
    //   openFileInput({ capture: false })
    // }
  }

  // const openFileInput = ({ capture }: { capture: boolean }) => {
  //   const input = document.createElement('input')
  //   input.type = 'file'
  //   input.accept = 'image/*,video/*'
  //   if (capture) input.setAttribute('capture', 'environment')
  //   input.onchange = (e) => {
  //     const file = (e.target as HTMLInputElement).files?.[0]
  //     if (file) handleFileSelect(file)
  //   }
  //   input.click()
  // }
  

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
        
        setFormData({ name: '', comment: '', challengeId: '' })
        await loadEventData() // Refresh uploads
        
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
    setFormData({ name: '', comment: '', challengeId: '' })
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

  const handleMessageSent = (_message: { id: string; eventId: string; message: string; senderName?: string; timestamp: number }) => {
    setState(prev => ({ 
      ...prev, 
      success: 'Nachricht erfolgreich gesendet!',
      showMessageModal: false
    }))
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setState(prev => ({ ...prev, success: null }))
    }, 3000)
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Foto oder Nachricht senden</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                onClick={handleCameraCapture}
                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Camera className="w-5 h-5" />
                Kamera öffnen
              </button>
              <label className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium cursor-pointer inline-flex items-center justify-center gap-2 transition-opacity shadow-sm border border-gray-200">
                <ImageIcon className="w-5 h-5" />
                Aus Galerie wählen
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                  className="hidden"
                />
              </label>
         
              <label className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-medium cursor-pointer inline-flex items-center justify-center gap-2 transition-colors shadow-sm">
                  <Camera className="w-5 h-5" />
                  Foto aufnehmen oder auswählen
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                    className="hidden"
                  />
                </label>


                <button
  onClick={handleSmartUploadClick}
  className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
>
  <Camera className="w-5 h-5" />
  Foto aufnehmen oder auswählen
</button>



              <button
                onClick={() => setState(prev => ({ ...prev, showMessageModal: true }))}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <MessageSquare className="w-5 h-5" />
                Nachricht senden
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
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                  challengeTitle: challenge?.hashtag || challenge?.title.toLowerCase().replace(/\s+/g, '')
                }
              })}
            />
          )}
        </div>
      </div>
      
      {/* Message Modal */}
      <MessageModal
        isOpen={state.showMessageModal}
        onClose={() => setState(prev => ({ ...prev, showMessageModal: false }))}
        eventId={eventId!}
        onMessageSent={handleMessageSent}
      />
    </div>
  )
}