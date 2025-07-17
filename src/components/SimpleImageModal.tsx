'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ImageItem {
  id: string
  url: string
  alt: string
  title?: string
  description?: string
}

interface SimpleImageModalProps {
  isOpen: boolean
  onClose: () => void
  image: ImageItem
}

export default function SimpleImageModal({ isOpen, onClose, image }: SimpleImageModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden">
        <img
          src={image.url}
          alt={image.alt}
          className="max-w-full max-h-[80vh] object-contain"
        />
        
        {(image.title || image.description) && (
          <div className="p-4 border-t">
            {image.title && <h3 className="font-semibold text-gray-900 mb-1">{image.title}</h3>}
            {image.description && <p className="text-gray-600 text-sm">{image.description}</p>}
          </div>
        )}
      </div>
    </div>
  )
}