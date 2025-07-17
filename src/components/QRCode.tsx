'use client'

import { useEffect, useState } from 'react'
import { generateQRCode } from '@/lib/qrcode'

interface QRCodeProps {
  value: string
  size?: number
  className?: string
}

export default function QRCode({ value, size = 120, className = '' }: QRCodeProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true)
        const qrCode = await generateQRCode(value, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeDataUrl(qrCode)
      } catch (error) {
        console.error('Error generating QR code:', error)
      } finally {
        setIsLoading(false)
      }
    }

    generateQR()
  }, [value, size])

  return (
    <div className={`bg-white p-2 rounded-lg shadow-lg ${className}`}>
      {isLoading ? (
        <div 
          className="flex items-center justify-center bg-gray-100 rounded"
          style={{ width: size, height: size }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
        </div>
      ) : qrCodeDataUrl ? (
        <img
          src={qrCodeDataUrl}
          alt="QR Code"
          className="block rounded"
          style={{ width: size, height: size }}
        />
      ) : (
        <div 
          className="flex items-center justify-center bg-gray-100 rounded text-gray-500"
          style={{ width: size, height: size }}
        >
          <span className="text-xs">QR Error</span>
        </div>
      )}
      <div className="text-xs text-center mt-1 text-gray-600">
        Fotos hochladen
      </div>
    </div>
  )
}