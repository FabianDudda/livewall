import { supabase } from './supabase'

export interface GuestUploadData {
  eventCode: string
  file: File
  uploaderName?: string
  comment?: string
  challengeId?: string
}

export interface GuestUploadResult {
  success: boolean
  fileUrl?: string
  autoApproved?: boolean
  error?: string
}

/**
 * Upload a file to the gallery folder for a specific event
 * This function handles anonymous uploads without requiring authentication
 */
export async function uploadGuestImage(data: GuestUploadData): Promise<GuestUploadResult> {
  try {
    const { eventCode, file, uploaderName, comment, challengeId } = data

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return {
        success: false,
        error: 'Nur Bilder und Videos sind erlaubt'
      }
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'Datei ist zu groß. Maximum 10MB erlaubt.'
      }
    }

    // Generate unique filename with timestamp
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${timestamp}.${fileExt}`
    const filePath = `${eventCode}/gallery/${fileName}`

    // Upload file to event-media bucket
    const { error: uploadError } = await supabase.storage
      .from('event-media')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return {
        success: false,
        error: 'Fehler beim Hochladen der Datei'
      }
    }

    // Create a signed URL for the private bucket (expires in 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('event-media')
      .createSignedUrl(filePath, 31536000) // 1 year in seconds

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError)
      return {
        success: false,
        error: 'Fehler beim Generieren der Bild-URL'
      }
    }

    // Get event ID and auto_approval setting from event code
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, auto_approval')
      .eq('event_code', eventCode)
      .single()

    if (eventError) {
      console.error('Event lookup error:', eventError)
      return {
        success: false,
        error: 'Event nicht gefunden'
      }
    }

    // Create upload record in database with auto approval based on event settings
    const { error: dbError } = await supabase
      .from('uploads')
      .insert({
        event_id: eventData.id,
        file_url: signedUrlData.signedUrl,
        file_type: file.type,
        uploader_name: uploaderName || null,
        comment: comment || null,
        challenge_id: challengeId || null,
        approved: eventData.auto_approval || false // Auto approve based on event settings
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return {
        success: false,
        error: 'Fehler beim Speichern der Upload-Informationen'
      }
    }

    return {
      success: true,
      fileUrl: signedUrlData.signedUrl,
      autoApproved: eventData.auto_approval || false
    }

  } catch (error) {
    console.error('Unexpected error in uploadGuestImage:', error)
    return {
      success: false,
      error: 'Ein unerwarteter Fehler ist aufgetreten'
    }
  }
}

/**
 * Validate if an event code exists and is accessible
 */
export async function validateEventCode(eventCode: string): Promise<{
  valid: boolean
  event?: {
    id: string
    name: string
    event_code: string
    password_protected: boolean
    password: string | null
  }
  requiresPassword?: boolean
  error?: string
}> {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, name, event_code, password_protected, password')
      .eq('event_code', eventCode)
      .single()

    if (error || !event) {
      return {
        valid: false,
        error: 'Event nicht gefunden'
      }
    }

    return {
      valid: true,
      event,
      requiresPassword: event.password_protected
    }

  } catch (error) {
    console.error('Error validating event code:', error)
    return {
      valid: false,
      error: 'Fehler beim Überprüfen des Event-Codes'
    }
  }
}


/**
 * Generate a signed URL for an existing file in the event-media bucket
 */
export async function generateSignedUrl(filePath: string, expiresIn: number = 31536000): Promise<{
  success: boolean
  signedUrl?: string
  error?: string
}> {
  try {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('event-media')
      .createSignedUrl(filePath, expiresIn)

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError)
      return {
        success: false,
        error: 'Fehler beim Generieren der Bild-URL'
      }
    }

    return {
      success: true,
      signedUrl: signedUrlData.signedUrl
    }

  } catch (error) {
    console.error('Unexpected error in generateSignedUrl:', error)
    return {
      success: false,
      error: 'Ein unerwarteter Fehler ist aufgetreten'
    }
  }
}
