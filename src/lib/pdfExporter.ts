import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { TemplateConfig, TEMPLATE_DIMENSIONS } from './templateGenerator'

export interface ExportOptions {
  format: 'pdf' | 'png' | 'jpg'
  paperSize: 'a4' | 'letter' | 'a5'
  orientation: 'portrait' | 'landscape'
  quality: number
  dpi: number
}

export const PAPER_SIZES = {
  a4: { width: 210, height: 297 }, // mm
  letter: { width: 216, height: 279 }, // mm
  a5: { width: 148, height: 210 } // mm
}

export const DPI_SCALES = {
  72: 1,
  150: 2.08,
  300: 4.17
}

export class PDFExporter {
  private config: TemplateConfig
  private canvas: HTMLCanvasElement

  constructor(config: TemplateConfig, canvas: HTMLCanvasElement) {
    this.config = config
    this.canvas = canvas
  }

  async exportAsPDF(options: ExportOptions): Promise<Blob> {
    try {
      const { paperSize, orientation, dpi } = options
      const paperDimensions = PAPER_SIZES[paperSize]
      
      // Create PDF with specified dimensions
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: [paperDimensions.width, paperDimensions.height]
      })

      // Get high-resolution canvas data
      const canvasDataUrl = await this.getHighResolutionCanvas(dpi)
      
      // Calculate dimensions to fit paper while maintaining aspect ratio
      const { imgWidth, imgHeight, x, y } = this.calculateImageDimensions(
        paperDimensions,
        orientation
      )

      // Add image to PDF
      pdf.addImage(
        canvasDataUrl,
        'PNG',
        x,
        y,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      )

      // Add metadata
      pdf.setProperties({
        title: `${this.config.eventName} - QR Code Template`,
        subject: 'Photo Upload QR Code Template',
        author: 'Livewall',
        creator: 'Livewall Template Generator'
      })

      return pdf.output('blob')

    } catch (error) {
      console.error('Error exporting PDF:', error)
      throw new Error('Failed to export PDF')
    }
  }

  async exportAsImage(options: ExportOptions): Promise<Blob> {
    try {
      const { format, quality, dpi } = options
      
      // Create high-resolution version
      const highResCanvas = await this.createHighResolutionCanvas(dpi)
      
      return new Promise((resolve, reject) => {
        highResCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create image blob'))
            }
          },
          format === 'png' ? 'image/png' : 'image/jpeg',
          quality
        )
      })

    } catch (error) {
      console.error('Error exporting image:', error)
      throw new Error('Failed to export image')
    }
  }

  private async getHighResolutionCanvas(dpi: number): Promise<string> {
    const scale = DPI_SCALES[dpi as keyof typeof DPI_SCALES] || 1
    
    if (scale === 1) {
      return this.canvas.toDataURL('image/png', 1.0)
    }

    const highResCanvas = await this.createHighResolutionCanvas(dpi)
    return highResCanvas.toDataURL('image/png', 1.0)
  }

  private async createHighResolutionCanvas(dpi: number): Promise<HTMLCanvasElement> {
    const scale = DPI_SCALES[dpi as keyof typeof DPI_SCALES] || 1
    const dimensions = TEMPLATE_DIMENSIONS[this.config.templateType]
    
    // Create new canvas with higher resolution
    const highResCanvas = document.createElement('canvas')
    const ctx = highResCanvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }

    highResCanvas.width = dimensions.width * scale
    highResCanvas.height = dimensions.height * scale
    
    // Scale the context to draw everything at higher resolution
    ctx.scale(scale, scale)
    
    // Draw the original canvas content onto the high-res canvas
    ctx.drawImage(this.canvas, 0, 0)
    
    return highResCanvas
  }

  private calculateImageDimensions(
    paperDimensions: { width: number; height: number },
    orientation: 'portrait' | 'landscape'
  ) {
    const templateDimensions = TEMPLATE_DIMENSIONS[this.config.templateType]
    const canvasAspectRatio = templateDimensions.width / templateDimensions.height
    
    let paperWidth = paperDimensions.width
    let paperHeight = paperDimensions.height
    
    if (orientation === 'landscape') {
      [paperWidth, paperHeight] = [paperHeight, paperWidth]
    }
    
    // Add margins (10mm on each side)
    const marginMM = 10
    const availableWidth = paperWidth - (2 * marginMM)
    const availableHeight = paperHeight - (2 * marginMM)
    
    // Calculate dimensions to fit while maintaining aspect ratio
    let imgWidth, imgHeight
    
    if (availableWidth / availableHeight > canvasAspectRatio) {
      // Height is the limiting factor
      imgHeight = availableHeight
      imgWidth = imgHeight * canvasAspectRatio
    } else {
      // Width is the limiting factor
      imgWidth = availableWidth
      imgHeight = imgWidth / canvasAspectRatio
    }
    
    // Center the image
    const x = (paperWidth - imgWidth) / 2
    const y = (paperHeight - imgHeight) / 2
    
    return { imgWidth, imgHeight, x, y }
  }

  static generateFilename(config: TemplateConfig, format: string): string {
    const sanitizedEventName = config.eventName
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
    
    const timestamp = new Date().toISOString().split('T')[0]
    
    return `${sanitizedEventName}_qr_template_${config.templateType}_${timestamp}.${format}`
  }

  static async downloadBlob(blob: Blob, filename: string): Promise<void> {
    try {
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      link.href = url
      link.download = filename
      link.style.display = 'none'
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error downloading file:', error)
      throw new Error('Failed to download file')
    }
  }
}