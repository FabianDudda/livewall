'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { LogOut, ArrowLeft, Users, Image, Target, Copy, ExternalLink, QrCode, Plus, Grid, List, Check, X, Eye, Trash2, EyeOff } from 'lucide-react'
import SimpleImageGallery from '@/components/SimpleImageGallery'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import { clearStoredPassword } from '@/lib/authStorage'
import { encryptEventPassword, decryptEventPassword } from '@/lib/eventPasswordEncryption'
import { generateEventUploadQRCode, generateEventUploadQRCodeForDownload } from '@/lib/qrcode'
import ChallengeModal from '@/components/ChallengeModal'

type Event = Database['public']['Tables']['events']['Row']
type Upload = Database['public']['Tables']['uploads']['Row']
type Challenge = Database['public']['Tables']['challenges']['Row']

interface EventStats {
  totalUploads: number
  totalContributors: number
  totalChallenges: number
}

export default function EventDetail() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const params = useParams()
  const eventCode = params.eventcode as string
  const [eventId, setEventId] = useState<string | null>(null)

  const [event, setEvent] = useState<Event | null>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [stats, setStats] = useState<EventStats>({ totalUploads: 0, totalContributors: 0, totalChallenges: 0 })
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'challenges' | 'settings'>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [autoApprovalEnabled, setAutoApprovalEnabled] = useState(false)
  const [passwordProtectedEnabled, setPasswordProtectedEnabled] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [imageDisplayDuration, setImageDisplayDuration] = useState(10)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30)
  const [uploadHeaderGradient, setUploadHeaderGradient] = useState('from-gray-50 to-white')
  const [livewallBackgroundGradient, setLivewallBackgroundGradient] = useState('from-purple-900 via-blue-900 to-indigo-900')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && eventCode) {
      fetchEventData()
    }
  }, [user, eventCode])

  const fetchEventData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', eventCode)
        .eq('user_id', user?.id)
        .single()

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          setError('Event nicht gefunden oder Sie haben keine Berechtigung')
        } else {
          throw eventError
        }
        return
      }

      setEvent(eventData)
      setEventId(eventData.id)
      
      // Initialize toggle states
      setAutoApprovalEnabled(eventData.auto_approval)
      setPasswordProtectedEnabled(eventData.password_protected)
      
      // Initialize timing settings
      setImageDisplayDuration(eventData.image_display_duration || 10)
      setAutoRefreshInterval(eventData.auto_refresh_interval || 30)
      
      // Initialize gradient settings
      setUploadHeaderGradient(eventData.upload_header_gradient || 'from-gray-50 to-white')
      setLivewallBackgroundGradient(eventData.livewall_background_gradient || 'from-purple-900 via-blue-900 to-indigo-900')
      
      // Retrieve current password if exists
      if (eventData.password) {
        const decryptedPassword = decryptEventPassword(eventData.password, eventData.event_code)
        setCurrentPassword(decryptedPassword)
      } else {
        setCurrentPassword('')
      }

      const [uploadsResult, challengesResult] = await Promise.all([
        supabase
          .from('uploads')
          .select('*')
          .eq('event_id', eventData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('challenges')
          .select('*')
          .eq('event_id', eventData.id)
          .order('created_at', { ascending: false })
      ])

      if (uploadsResult.error) throw uploadsResult.error
      if (challengesResult.error) throw challengesResult.error

      const uploadsData = uploadsResult.data || []
      const challengesData = challengesResult.data || []

      setUploads(uploadsData)
      setChallenges(challengesData)

      const uniqueContributors = new Set(
        uploadsData.filter(upload => upload.uploader_name).map(upload => upload.uploader_name)
      ).size

      setStats({
        totalUploads: uploadsData.length,
        totalContributors: uniqueContributors,
        totalChallenges: challengesData.length
      })

      // Generate QR code for event upload page
      try {
        const qrCode = await generateEventUploadQRCode(eventData.event_code)
        setQrCodeDataUrl(qrCode)
      } catch (qrError) {
        console.error('Error generating QR code:', qrError)
      }

    } catch (err) {
      console.error('Error fetching event data:', err)
      setError('Fehler beim Laden der Event-Daten')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/')
    }
  }

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
  }

  const uploadCoverImage = async (file: File): Promise<string | null> => {
    try {
      if (!event) return null
      
      const fileExt = file.name.split('.').pop()
      const fileName = `cover.${fileExt}`
      const filePath = `${event.event_code}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(filePath, file, {
          upsert: true // Allow overwriting the existing cover image
        })

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

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return

    setIsUpdating(true)
    setUpdateError(null)

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const name = formData.get('name') as string
      const autoApproval = autoApprovalEnabled
      const passwordProtected = passwordProtectedEnabled
      const password = currentPassword // Use state instead of form data
      const coverImageFile = formData.get('coverImage') as File

      let coverImageUrl = event.cover_image_url

      // Upload new cover image if provided
      if (coverImageFile && coverImageFile.size > 0) {
        const uploadedUrl = await uploadCoverImage(coverImageFile)
        if (uploadedUrl) {
          coverImageUrl = uploadedUrl
        } else {
          throw new Error('Fehler beim Hochladen des Cover-Bildes')
        }
      }

      // Encrypt password if password protection is enabled and password is provided
      let encryptedPassword = event.password // Keep existing password if no new one provided
      let passwordChanged = false
      
      if (passwordProtected && password && password.trim() !== '') {
        encryptedPassword = encryptEventPassword(password, event.event_code)
        passwordChanged = true
      } else if (!passwordProtected) {
        encryptedPassword = null // Clear password if protection is disabled
        passwordChanged = event.password_protected // Only if it was previously protected
      }

      const updateData = {
        name: name.trim(),
        cover_image_url: coverImageUrl,
        auto_approval: autoApproval,
        password_protected: passwordProtected,
        password: encryptedPassword,
        image_display_duration: imageDisplayDuration,
        auto_refresh_interval: autoRefreshInterval,
        upload_header_gradient: uploadHeaderGradient,
        livewall_background_gradient: livewallBackgroundGradient,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId!)
        .eq('user_id', user?.id)

      if (error) {
        throw error
      }

      // If auto approval was enabled, approve all existing pending uploads
      if (autoApproval && !event.auto_approval) {
        const { error: bulkApprovalError } = await supabase
          .from('uploads')
          .update({ approved: true })
          .eq('event_id', eventId!)
          .eq('approved', false)

        if (bulkApprovalError) {
          console.error('Error bulk approving uploads:', bulkApprovalError)
          setUpdateError('Event wurde aktualisiert, aber Fehler beim automatischen Freigeben der Bilder')
        } else {
          // Refresh uploads to show newly approved images
          await fetchEventData()
        }
      }

      // Clear stored password authentication if password was changed
      if (passwordChanged) {
        clearStoredPassword(eventId!)
      }

      // Update local state
      setEvent(prev => prev ? { ...prev, ...updateData } : null)
      
      // Update current password state if password was changed
      if (passwordChanged && password && password.trim() !== '') {
        setCurrentPassword(password)
      } else if (!passwordProtected) {
        setCurrentPassword('')
      }
      
      // Show success message or redirect
      const successMessage = autoApproval && !event.auto_approval 
        ? 'Event erfolgreich aktualisiert! Alle wartenden Bilder wurden automatisch freigegeben.'
        : 'Event erfolgreich aktualisiert!'
      alert(successMessage)

    } catch (err) {
      console.error('Error updating event:', err)
      setUpdateError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Events')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSortedUploads = () => {
    const sorted = [...uploads].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })
    return sorted
  }

  const handleApproveUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('uploads')
        .update({ approved: true })
        .eq('id', uploadId)
        .eq('event_id', eventId!)

      if (error) {
        throw error
      }

      // Update local state
      setUploads(prev => prev.map(upload => 
        upload.id === uploadId ? { ...upload, approved: true } : upload
      ))

    } catch (error) {
      console.error('Error approving upload:', error)
      setError('Fehler beim Freigeben des Uploads')
    }
  }

  const handleRejectUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('uploads')
        .update({ approved: false })
        .eq('id', uploadId)
        .eq('event_id', eventId!)

      if (error) {
        throw error
      }

      // Update local state
      setUploads(prev => prev.map(upload => 
        upload.id === uploadId ? { ...upload, approved: false } : upload
      ))

    } catch (error) {
      console.error('Error rejecting upload:', error)
      setError('Fehler beim Ablehnen des Uploads')
    }
  }

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Upload wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }

    try {
      // First, find the upload to get the file URL
      const uploadToDelete = uploads.find(upload => upload.id === uploadId)
      if (!uploadToDelete) {
        throw new Error('Upload nicht gefunden')
      }

      // Extract file path from URL for storage deletion
      let filePath: string | null = null
      try {
        const url = new URL(uploadToDelete.file_url)
        
        // Try multiple URL patterns to extract the file path
        const patterns = [
          /\/object\/sign\/event-media\/(.+)$/,           // Signed URLs
          /\/storage\/v1\/object\/public\/event-media\/(.+)$/,  // Public URLs  
          /\/storage\/v1\/object\/sign\/event-media\/(.+)$/,    // Alternative signed URLs
          /event-media\/(.+)$/                             // Simple pattern match
        ]

        for (const pattern of patterns) {
          const pathMatch = url.pathname.match(pattern)
          if (pathMatch) {
            filePath = pathMatch[1]
            break
          }
        }

        if (!filePath) {
          // Alternative: check if the URL contains event-media and extract everything after it
          const eventMediaIndex = uploadToDelete.file_url.indexOf('event-media/')
          if (eventMediaIndex !== -1) {
            const afterEventMedia = uploadToDelete.file_url.substring(eventMediaIndex + 'event-media/'.length)
            // Remove any query parameters
            filePath = afterEventMedia.split('?')[0]
          }
        }

      } catch (urlError) {
        console.error('Error parsing file URL:', urlError)
      }

      // Delete from Supabase storage if we have a valid file path
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('event-media')
          .remove([filePath])

        if (storageError) {
          console.error('Error deleting from storage:', storageError)
          // Don't throw here - continue with database deletion even if storage deletion fails
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('uploads')
        .delete()
        .eq('id', uploadId)
        .eq('event_id', eventId!)

      if (dbError) {
        throw dbError
      }

      // Update local state
      setUploads(prev => prev.filter(upload => upload.id !== uploadId))

      // Update stats
      setStats(prev => ({
        ...prev,
        totalUploads: prev.totalUploads - 1
      }))

      // Show success message
      alert('Upload erfolgreich gelöscht')

    } catch (error) {
      console.error('Error deleting upload:', error)
      setError('Fehler beim Löschen des Uploads: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
    }
  }

  const handleDownloadQRCode = async () => {
    if (!event) return

    try {
      const qrCode = await generateEventUploadQRCodeForDownload(eventCode)
      
      // Create download link
      const link = document.createElement('a')
      link.href = qrCode
      link.download = `${event.name}-QR-Code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading QR code:', error)
      setError('Fehler beim Herunterladen des QR-Codes')
    }
  }

  const handleCreateChallenge = () => {
    setEditingChallenge(null)
    setShowChallengeModal(true)
  }

  const handleEditChallenge = (challenge: Challenge) => {
    setEditingChallenge(challenge)
    setShowChallengeModal(true)
  }

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Challenge wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId)
        .eq('event_id', eventId!)

      if (error) {
        throw error
      }

      // Update local state
      setChallenges(prev => prev.filter(challenge => challenge.id !== challengeId))

      // Update stats
      setStats(prev => ({
        ...prev,
        totalChallenges: prev.totalChallenges - 1
      }))

    } catch (error) {
      console.error('Error deleting challenge:', error)
      setError('Fehler beim Löschen der Challenge')
    }
  }

  const handleChallengeCreated = (newChallenge: Challenge) => {
    setChallenges(prev => [newChallenge, ...prev])
    setStats(prev => ({
      ...prev,
      totalChallenges: prev.totalChallenges + 1
    }))
    setShowChallengeModal(false)
  }

  const handleChallengeUpdated = (updatedChallenge: Challenge) => {
    setChallenges(prev => prev.map(challenge => 
      challenge.id === updatedChallenge.id ? updatedChallenge : challenge
    ))
    setShowChallengeModal(false)
  }

  const handleBulkApprove = async () => {
    const pendingUploads = uploads.filter(upload => !upload.approved)
    
    if (pendingUploads.length === 0) {
      return
    }

    try {
      const { error } = await supabase
        .from('uploads')
        .update({ approved: true })
        .eq('event_id', eventId!)
        .eq('approved', false)

      if (error) {
        throw error
      }

      // Update local state
      setUploads(prev => prev.map(upload => ({ ...upload, approved: true })))

    } catch (error) {
      console.error('Error bulk approving uploads:', error)
      setError('Fehler beim Freigeben aller Uploads')
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!event) {
    return null
  }

  const liveWallUrl = `${window.location.origin}/event/${event.event_code}/livewall`
  const uploadUrl = `${window.location.origin}/event/${event.event_code}/upload`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Dashboard
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900 truncate">{event.name}</h1>
              <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {event.event_code}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Willkommen, {user?.email}</span>
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

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Übersicht
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'gallery'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Galerie
            </button>
            <button
              onClick={() => setActiveTab('challenges')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'challenges'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Challenges
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Einstellungen
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Image className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Uploads</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUploads}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Beitragende</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalContributors}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Challenges</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalChallenges}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <span className="text-orange-600 font-mono font-bold">#{event.event_code}</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Event Code</p>
                    <p className="text-2xl font-bold text-gray-900">{event.event_code}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Wall</h3>
                <p className="text-gray-600 mb-4">
                  Zeigen Sie die Live-Fotowand Ihren Gästen
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <code className="bg-gray-100 px-3 py-2 rounded text-sm flex-1 truncate">
                    {liveWallUrl}
                  </code>
                  <button
                    onClick={() => handleCopyLink(liveWallUrl)}
                    className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.open(liveWallUrl, '_blank')}
                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload-Seite</h3>
                <p className="text-gray-600 mb-4">
                  Gäste können hier Fotos hochladen
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <code className="bg-gray-100 px-3 py-2 rounded text-sm flex-1 truncate">
                    {uploadUrl}
                  </code>
                  <button
                    onClick={() => handleCopyLink(uploadUrl)}
                    className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.open(uploadUrl, '_blank')}
                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                {qrCodeDataUrl && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600 mb-2">QR-Code für Upload-Seite:</p>
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code für Upload-Seite" 
                      className="mx-auto w-32 h-32 border rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={handleDownloadQRCode}
                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <QrCode className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">QR Code herunterladen</h3>
                    <p className="text-gray-600 text-sm">QR-Code für Upload-Seite</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={handleCreateChallenge}
                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Plus className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Neue Challenge hinzufügen</h3>
                    <p className="text-gray-600 text-sm">Foto-Challenge für Gäste erstellen</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="space-y-6">
            {/* Gallery Controls */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Ansicht:</span>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded ${
                        viewMode === 'grid'
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded ${
                        viewMode === 'list'
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Sortierung:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="newest">Neueste zuerst</option>
                      <option value="oldest">Älteste zuerst</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {uploads.filter(upload => !upload.approved).length > 0 && (
                      <button
                        onClick={handleBulkApprove}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Alle freigeben ({uploads.filter(upload => !upload.approved).length})
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {uploads.length} {uploads.length === 1 ? 'Bild' : 'Bilder'}
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery Grid/List */}
            <div className="bg-white rounded-lg shadow-sm border">
              {uploads.length === 0 ? (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Uploads</h3>
                  <p className="text-gray-600">
                    Teilen Sie den Upload-Link mit Ihren Gästen
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  <SimpleImageGallery
                    images={getSortedUploads().map((upload) => {
                      const challenge = upload.challenge_id 
                        ? challenges.find(c => c.id === upload.challenge_id)
                        : null
                      
                      return {
                        id: upload.id,
                        url: upload.file_url,
                        alt: upload.comment || 'Upload',
                        title: upload.uploader_name || 'Anonymer Nutzer',
                        description: upload.comment || undefined,
                        approved: upload.approved,
                        challengeTitle: challenge?.hashtag || challenge?.title.toLowerCase().replace(/\s+/g, '')
                      }
                    })}
                    showActions={true}
                    getActionButtons={(image) => [
                      {
                        icon: image.approved ? 
                          <X className="w-4 h-4 text-red-600" /> : 
                          <Check className="w-4 h-4 text-green-600" />,
                        onClick: (imageId: string) => {
                          if (image.approved) {
                            handleRejectUpload(imageId)
                          } else {
                            handleApproveUpload(imageId)
                          }
                        },
                        title: image.approved ? "Freigabe entziehen" : "Freigeben"
                      },
                      {
                        icon: <Trash2 className="w-4 h-4 text-red-600" />,
                        onClick: handleDeleteUpload,
                        title: "Löschen"
                      }
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-6">
            {/* Challenge Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Foto-Challenges</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Erstellen Sie spezielle Foto-Challenges für Ihre Gäste
                  </p>
                </div>
                <button
                  onClick={handleCreateChallenge}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Neue Challenge
                </button>
              </div>
            </div>

            {/* Challenges List */}
            <div className="bg-white rounded-lg shadow-sm border">
              {challenges.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Challenges</h3>
                  <p className="text-gray-600 mb-4">
                    Erstellen Sie Ihre erste Foto-Challenge für das Event
                  </p>
                  <button
                    onClick={handleCreateChallenge}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Challenge erstellen
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-4">
                    {challenges.map((challenge) => (
                      <div key={challenge.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{challenge.title}</h4>
                            <p className="text-gray-600 text-sm">{challenge.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditChallenge(challenge)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Challenge bearbeiten"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteChallenge(challenge.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Challenge löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Event-Einstellungen</h3>
              
              {updateError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="text-red-600 text-sm">{updateError}</div>
                </div>
              )}
              
              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Event-Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={event.name}
                    required
                    disabled={isUpdating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700 mb-2">
                    Cover-Bild
                  </label>
                  <div className="space-y-3">
                    {event.cover_image_url && (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={event.cover_image_url}
                          alt="Current cover"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <input
                      id="coverImage"
                      name="coverImage"
                      type="file"
                      accept="image/*"
                      disabled={isUpdating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    />
                    <p className="text-xs text-gray-500">
                      Lassen Sie das Feld leer, um das aktuelle Cover-Bild zu behalten
                    </p>
                  </div>
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
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setAutoApprovalEnabled(!autoApprovalEnabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        autoApprovalEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={isUpdating}
                      aria-label="Auto-Freigabe umschalten"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          autoApprovalEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
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
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setPasswordProtectedEnabled(!passwordProtectedEnabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        passwordProtectedEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={isUpdating}
                      aria-label="Passwort-Schutz umschalten"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          passwordProtectedEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {passwordProtectedEnabled && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Event-Passwort
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Passwort eingeben..."
                        disabled={isUpdating}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        disabled={isUpdating}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Image Display Duration Slider */}
                <div>
                  <label htmlFor="imageDisplayDuration" className="block text-sm font-medium text-gray-700 mb-2">
                    Anzeigedauer pro Bild: {imageDisplayDuration} Sekunden
                  </label>
                  <div className="space-y-2">
                    <input
                      id="imageDisplayDuration"
                      type="range"
                      min="5"
                      max="30"
                      value={imageDisplayDuration}
                      onChange={(e) => setImageDisplayDuration(parseInt(e.target.value))}
                      disabled={isUpdating}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>5s</span>
                      <span>30s</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Wie lange wird jedes Bild in der Live-Fotowand angezeigt
                  </p>
                </div>

                {/* Auto Refresh Interval Slider */}
                <div>
                  <label htmlFor="autoRefreshInterval" className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-Aktualisierung: {autoRefreshInterval < 60 ? `${autoRefreshInterval}s` : `${Math.round(autoRefreshInterval / 60)}min`}
                  </label>
                  <div className="space-y-2">
                    <input
                      id="autoRefreshInterval"
                      type="range"
                      min="15"
                      max="300"
                      step="15"
                      value={autoRefreshInterval}
                      onChange={(e) => setAutoRefreshInterval(parseInt(e.target.value))}
                      disabled={isUpdating}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>15s</span>
                      <span>5min</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Wie oft wird nach neuen Uploads gesucht
                  </p>
                </div>

                {/* Gradient Settings */}
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-900">Farbdesign</h4>
                  
                  {/* Upload Header Gradient */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Upload-Seite Header Gradient
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[
                        { value: 'from-gray-50 to-white', label: 'Hellgrau zu Weiß' },
                        { value: 'from-blue-100 to-white', label: 'Hellblau zu Weiß' },
                        { value: 'from-purple-100 to-white', label: 'Helllila zu Weiß' },
                        { value: 'from-pink-100 to-white', label: 'Hellrosa zu Weiß' },
                        { value: 'from-purple-900 via-blue-900 to-indigo-900', label: 'Lila zu Blau zu Indigo' },
                        { value: 'from-gray-900 via-gray-800 to-black', label: 'Dunkelgrau zu Schwarz' },
                        { value: 'from-pink-400 to-rose-400', label: 'Pink zu Rosa' },
                        { value: 'from-fuchsia-600 to-purple-600', label: 'Fuchsia zu Lila' }
                      ].map((gradient) => (
                        <button
                          key={gradient.value}
                          type="button"
                          onClick={() => setUploadHeaderGradient(gradient.value)}
                          className={`h-16 rounded-lg border-2 transition-all bg-gradient-to-br ${gradient.value} ${
                            uploadHeaderGradient === gradient.value
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          title={gradient.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Livewall Background Gradient */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Live-Fotowand Hintergrund Gradient
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[
                         { value: 'from-gray-50 to-white', label: 'Hellgrau zu Weiß' },
                         { value: 'from-blue-100 to-white', label: 'Hellblau zu Weiß' },
                         { value: 'from-purple-100 to-white', label: 'Helllila zu Weiß' },
                         { value: 'from-pink-100 to-white', label: 'Hellrosa zu Weiß' },
                         { value: 'from-purple-900 via-blue-900 to-indigo-900', label: 'Lila zu Blau zu Indigo' },
                         { value: 'from-gray-900 via-gray-800 to-black', label: 'Dunkelgrau zu Schwarz' },
                         { value: 'from-pink-400 to-rose-400', label: 'Pink zu Rosa' },
                         { value: 'from-fuchsia-600 to-purple-600', label: 'Fuchsia zu Lila' }     
                      ].map((gradient) => (
                        <button
                          key={gradient.value}
                          type="button"
                          onClick={() => setLivewallBackgroundGradient(gradient.value)}
                          className={`h-16 rounded-lg border-2 transition-all bg-gradient-to-br ${gradient.value} ${
                            livewallBackgroundGradient === gradient.value
                              ? 'border-white ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          title={gradient.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isUpdating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      'Änderungen speichern'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      
      {/* Challenge Modal */}
      <ChallengeModal
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        eventId={eventId!}
        challenge={editingChallenge}
        onChallengeCreated={handleChallengeCreated}
        onChallengeUpdated={handleChallengeUpdated}
      />
    </div>
  )
}