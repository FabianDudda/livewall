'use client'

import { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageItem {
  id: string
  url: string
  alt: string
  title?: string
  description?: string
  file_type?: string
}

interface SimpleImageModalProps {
  isOpen: boolean
  onClose: () => void
  image: ImageItem
  images?: ImageItem[]
  currentIndex?: number
  onNext?: () => void
  onPrevious?: () => void
}

export default function SimpleImageModal({ 
  isOpen, 
  onClose, 
  image, 
  images, 
  currentIndex, 
  onNext, 
  onPrevious 
}: SimpleImageModalProps) {
  const hasMultipleImages = images && images.length > 1
  const canGoNext = hasMultipleImages && onNext && currentIndex !== undefined && currentIndex < images.length - 1
  const canGoPrevious = hasMultipleImages && onPrevious && currentIndex !== undefined && currentIndex > 0

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' && canGoNext) {
        onNext!()
      } else if (e.key === 'ArrowLeft' && canGoPrevious) {
        onPrevious!()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, canGoNext, canGoPrevious, onNext, onPrevious])

  if (!isOpen) return null

  const isVideo = image.file_type?.startsWith('video/')

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Previous button */}
      {canGoPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Next button */}
      {canGoNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Image counter */}
      {hasMultipleImages && currentIndex !== undefined && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-black bg-opacity-50 text-white text-sm">
          {currentIndex + 1} / {images!.length}
        </div>
      )}

      <div 
        className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={image.url}
            className="max-w-full max-h-[80vh] object-contain"
            controls
            muted
            playsInline
          />
        ) : (
          <img
            src={image.url}
            alt={image.alt}
            className="max-w-full max-h-[80vh] object-contain"
          />
        )}
        
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