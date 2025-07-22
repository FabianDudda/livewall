import { Upload, Challenge } from '@/lib/types'

interface ImageCardProps {
  upload: Upload
  challenge?: Challenge | null
  isVisible: boolean
}

export function ImageCard({ upload, challenge, isVisible }: ImageCardProps) {
  return (
    <div 
      className={`absolute transition-opacity duration-1000 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="bg-white p-6 pb-20 rounded-lg shadow-2xl rotate-1 transition-transform duration-300 max-w-6xl max-h-[90vh] mx-auto">
        <div className="relative">
          <img
            src={upload.file_url}
            alt={upload.comment || 'Foto'}
            className="w-full h-auto max-h-[75vh] object-contain rounded-sm"
            style={{ aspectRatio: 'auto' }}
          />
          
          {challenge && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
              #{challenge.hashtag || challenge.title.toLowerCase().replace(/\s+/g, '')}
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center">
          {upload.comment && (
            <p className="text-gray-800 text-xl leading-relaxed mb-2" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
              {upload.comment}
            </p>
          )}
          <p className="text-gray-600 text-base" style={{ fontFamily: 'var(--font-kalam), cursive' }}>
            - {upload.uploader_name || 'Anonym'}
          </p>
        </div>
      </div>
    </div>
  )
}