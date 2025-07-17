import QRCode from 'qrcode'

/**
 * Generate a QR code as a data URL for a given text/URL
 */
export async function generateQRCode(text: string, options?: {
  width?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
}): Promise<string> {
  try {
    const qrOptions = {
      width: options?.width || 256,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      }
    }

    const qrCodeDataUrl = await QRCode.toDataURL(text, qrOptions)
    return qrCodeDataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate a QR code for an event upload page
 */
export async function generateEventUploadQRCode(eventId: string): Promise<string> {
  const uploadUrl = `${window.location.origin}/event/${eventId}/upload`
  return generateQRCode(uploadUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#1f2937', // gray-800
      light: '#ffffff'
    }
  })
}

/**
 * Generate a QR code for download (larger size)
 */
export async function generateEventUploadQRCodeForDownload(eventId: string): Promise<string> {
  const uploadUrl = `${window.location.origin}/event/${eventId}/upload`
  return generateQRCode(uploadUrl, {
    width: 512,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  })
}