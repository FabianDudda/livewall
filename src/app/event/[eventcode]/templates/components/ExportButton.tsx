'use client'

import { useState } from 'react'
import { TemplateConfig } from '@/lib/templateGenerator'
import { PDFExporter, ExportOptions, PAPER_SIZES } from '@/lib/pdfExporter'

interface ExportButtonProps {
  config: TemplateConfig
  canvas: HTMLCanvasElement | null
  disabled?: boolean
}

export default function ExportButton({ config, canvas, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  
  const exportOptions: ExportOptions = {
    format: 'pdf',
    paperSize: 'a5',
    orientation: 'portrait',
    quality: 1.0,
    dpi: 300
  }

  const handleExport = async () => {
    if (!canvas) {
      alert('Canvas not ready. Please wait for the preview to load.')
      return
    }

    setIsExporting(true)
    
    try {
      const exporter = new PDFExporter(config, canvas)
      const blob = await exporter.exportAsPDF(exportOptions)
      const filename = PDFExporter.generateFilename(config, 'pdf')
      await PDFExporter.downloadBlob(blob, filename)
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }


  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting || !canvas}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
    >
      {isExporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Exporting PDF...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </>
      )}
    </button>
  )
}