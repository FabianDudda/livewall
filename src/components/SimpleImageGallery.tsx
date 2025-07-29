'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, Eye, Play, MoreVertical } from 'lucide-react'
import SimpleImageModal from './SimpleImageModal'

interface ImageItem {
  id: string
  url: string
  alt: string
  title?: string
  description?: string
  approved?: boolean
  challengeTitle?: string
  file_type?: string
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
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [showMobileMenu, setShowMobileMenu] = useState<string | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const handleImageClick = (image: ImageItem) => {
    const index = images.findIndex(img => img.id === image.id)
    setCurrentIndex(index)
    setSelectedImage(image)
  }

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % images.length
    setCurrentIndex(nextIndex)
    setSelectedImage(images[nextIndex])
  }

  const handlePrevious = () => {
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    setCurrentIndex(prevIndex)
    setSelectedImage(images[prevIndex])
  }

  // Handle clicking outside mobile menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMobileMenu(null)
      }
    }

    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [showMobileMenu])

  const handleMobileMenuToggle = (imageId: string) => {
    setShowMobileMenu(showMobileMenu === imageId ? null : imageId)
  }

  return (
    <>
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {images.map((image) => {
          const isVideo = image.file_type?.startsWith('video/')
          
          return (
            <div
              key={image.id}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
            >
              {isVideo ? (
                <video
                  src={image.url || "https://csswouhdugmztnnglcdn.supabase.co/storage/v1/object/public/app//fallback.jpg"}
                  className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:opacity-50"
                  muted
                  preload="metadata"
                  onClick={() => handleImageClick(image)}
                />
              ) : (
                <img
                  src={image.url || "https://csswouhdugmztnnglcdn.supabase.co/storage/v1/object/public/app//fallback.jpg"}
                  alt={image.alt}
                  className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:opacity-50"
                  loading="lazy"
                  onClick={() => handleImageClick(image)}
                />
              )}

              {/* Play button overlay for videos */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black bg-opacity-50 rounded-full p-3 opacity-70 group-hover:opacity-90 transition-opacity">
                    <Play className="w-8 h-8 text-white fill-current" />
                  </div>
                </div>
              )}
            
            {/* Challenge Hashtag */}
            {image.challengeTitle && (
              <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium">
                #{image.challengeTitle}
              </div>
            )}
            
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

            {/* Action buttons */}
            {showActions && (
              <>
                {/* Desktop: Hover overlay (existing behavior) */}
                <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleImageClick(image)}
                      className="bg-white p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="Bild anzeigen"
                      aria-label="Bild anzeigen"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {getActionButtons?.(image).map((button, index) => (
                      <button
                        key={index}
                        onClick={() => button.onClick(image.id)}
                        className={`bg-white p-2 rounded-full hover:bg-gray-100 transition-colors ${button.className || ''}`}
                        title={button.title}
                        aria-label={button.title}
                      >
                        {button.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile: Bottom action bar */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {/* Always show view button */}
                      <button
                        onClick={() => handleImageClick(image)}
                        className="bg-white/90 p-2 rounded-full backdrop-blur-sm hover:bg-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Bild anzeigen"
                        aria-label="Bild anzeigen"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      {/* Show first 2 primary actions directly */}
                      {getActionButtons?.(image).slice(0, 2).map((button, index) => (
                        <button
                          key={index}
                          onClick={() => button.onClick(image.id)}
                          className={`bg-white/90 p-2 rounded-full backdrop-blur-sm hover:bg-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${button.className || ''}`}
                          title={button.title}
                          aria-label={button.title}
                        >
                          {button.icon}
                        </button>
                      ))}
                    </div>
                    
                    {/* Show overflow menu if more than 2 actions */}
                    {getActionButtons?.(image) && getActionButtons(image).length > 2 && (
                      <button
                        onClick={() => handleMobileMenuToggle(image.id)}
                        className="bg-white/90 p-2 rounded-full backdrop-blur-sm hover:bg-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Weitere Aktionen"
                        aria-label="Weitere Aktionen anzeigen"
                        aria-expanded={showMobileMenu === image.id}
                        aria-haspopup="true"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
            </div>
          )
        })}
      </div>

      {/* Mobile overflow menu modal */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/25"
            onClick={() => setShowMobileMenu(null)}
          />
          
          {/* Menu */}
          <div
            ref={mobileMenuRef}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl animate-in slide-in-from-bottom duration-300"
            role="dialog"
            aria-modal="true"
            aria-label="Bildaktionen"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            
            {/* Menu header */}
            <div className="px-6 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">Aktionen</h3>
            </div>
            
            {/* Menu items */}
            <div className="px-4 pb-8">
              <div className="space-y-2">
                {/* View action (always present) */}
                <button
                  onClick={() => {
                    const image = images.find(img => img.id === showMobileMenu)
                    if (image) handleImageClick(image)
                    setShowMobileMenu(null)
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors min-h-[56px]"
                  aria-label="Bild anzeigen"
                >
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Bild anzeigen</div>
                    <div className="text-sm text-gray-500">Vollbild öffnen</div>
                  </div>
                </button>
                
                {/* All action buttons */}
                {(() => {
                  const image = images.find(img => img.id === showMobileMenu)
                  return image && getActionButtons?.(image).map((button, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        button.onClick(image.id)
                        setShowMobileMenu(null)
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors min-h-[56px]"
                      aria-label={button.title}
                    >
                      <div className="bg-gray-100 p-2 rounded-full">
                        {button.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{button.title}</div>
                      </div>
                    </button>
                  ))
                })()}
              </div>
            </div>
            
            {/* Safe area for iPhone home indicator */}
            <div className="h-8" />
          </div>
        </div>
      )}

      {selectedImage && (
        <SimpleImageModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          image={selectedImage}
          images={images}
          currentIndex={currentIndex}
          onNext={images.length > 1 ? handleNext : undefined}
          onPrevious={images.length > 1 ? handlePrevious : undefined}
        />
      )}
    </>
  )
}