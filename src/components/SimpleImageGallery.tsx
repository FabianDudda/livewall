'use client'

import { useState } from 'react'
import { Check, X, Eye } from 'lucide-react'
import SimpleImageModal from './SimpleImageModal'

interface ImageItem {
  id: string
  url: string
  alt: string
  title?: string
  description?: string
  approved?: boolean
}

interface ActionButton {
  icon: React.ReactNode
  onClick: (imageId: string) => void
  className?: string
  title?: string
}

interface SimpleImageGalleryProps {
  images: ImageItem[]
  className?: string
  showActions?: boolean
  getActionButtons?: (image: ImageItem) => ActionButton[]
}

export default function SimpleImageGallery({ 
  images, 
  className = '', 
  showActions = false,
  getActionButtons
}: SimpleImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)

  const handleImageClick = (image: ImageItem) => {
    setSelectedImage(image)
  }

  return (
    <>
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {images.map((image) => (
          <div
            key={image.id}
            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
          >
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:opacity-50"
              loading="lazy"
              onClick={() => handleImageClick(image)}
            />
            
            {/* Status badge - only show when not hovering */}
            {image.approved !== undefined && (
              <div className="absolute top-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity">
                <span className={`px-2 py-1 text-xs rounded ${
                  image.approved
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {image.approved ? 'Freigegeben' : 'Wartend'}
                </span>
              </div>
            )}

            {/* Action buttons - only show on hover */}
            {showActions && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImageClick(image)}
                    className="bg-white p-2 rounded-full hover:bg-gray-100 transition-colors"
                    title="Bild anzeigen"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {getActionButtons?.(image).map((button, index) => (
                    <button
                      key={index}
                      onClick={() => button.onClick(image.id)}
                      className={`bg-white p-2 rounded-full hover:bg-gray-100 transition-colors ${button.className || ''}`}
                      title={button.title}
                    >
                      {button.icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedImage && (
        <SimpleImageModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          image={selectedImage}
        />
      )}
    </>
  )
}