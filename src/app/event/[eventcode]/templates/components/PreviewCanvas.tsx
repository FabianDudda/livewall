'use client'

import { useEffect, useRef, useState } from 'react'
import { TemplateConfig, TemplateGenerator } from '@/lib/templateGenerator'

interface PreviewCanvasProps {
  config: TemplateConfig
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

export default function PreviewCanvas({ config, onCanvasReady }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const generatorRef = useRef<TemplateGenerator | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRenderTime, setLastRenderTime] = useState<number>(0)

  // Debounce render updates
  const debounceTimeout = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Clear any existing debounce
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    // Debounce the rendering to prevent too frequent updates
    debounceTimeout.current = setTimeout(async () => {
      await renderTemplate()
    }, 300)

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [config])

  const renderTemplate = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsRendering(true)
    setError(null)
    
    const startTime = Date.now()

    try {
      // Create new generator instance
      generatorRef.current = new TemplateGenerator(canvas, config)
      
      // Render the template
      await generatorRef.current.render()
      
      // Notify parent component that canvas is ready
      onCanvasReady?.(canvas)
      
      setLastRenderTime(Date.now() - startTime)
      
    } catch (err) {
      console.error('Error rendering template:', err)
      setError(err instanceof Error ? err.message : 'Failed to render template')
      
      // Draw error state on canvas
      drawErrorState(canvas)
      
    } finally {
      setIsRendering(false)
    }
  }

  const drawErrorState = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw error background
    ctx.fillStyle = '#FEF2F2'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw error icon and message
    ctx.fillStyle = '#DC2626'
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    // Error icon (⚠️)
    ctx.font = '48px Arial'
    ctx.fillText('⚠️', centerX, centerY - 40)
    
    // Error message
    ctx.font = 'bold 18px Inter, sans-serif'
    ctx.fillText('Template Render Error', centerX, centerY + 20)
    
    ctx.font = '14px Inter, sans-serif'
    ctx.fillStyle = '#7F1D1D'
    ctx.fillText('Please check your configuration', centerX, centerY + 50)
  }

  const getCanvasContainerStyle = () => {
    const baseStyle = {
      maxWidth: '100%',
      maxHeight: '70vh',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#FFFFFF'
    }

    if (isRendering) {
      return {
        ...baseStyle,
        opacity: 0.7,
        transition: 'opacity 0.2s ease-in-out'
      }
    }

    return baseStyle
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-medium text-gray-900">Template Preview</h3>
      </div>

      {/* Canvas Container */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          style={getCanvasContainerStyle()}
          className="block"
        />
        
        {/* Loading Overlay */}
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Rendering template...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && !isRendering && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800">Render Error</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={renderTemplate}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}