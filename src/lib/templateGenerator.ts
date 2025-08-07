import QRCode from 'qrcode'

export interface TemplateConfig {
  templateType: 'a5'
  eventName: string
  customMessage: string
  instructions: string
  footer: string
  colorScheme: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'indigo'
  font: string
  qrCodeSize: 'small' | 'medium' | 'large'
  uploadUrl: string
  eventPassword?: string
  isPasswordProtected: boolean
}

export interface TemplateDimensions {
  width: number
  height: number
  dpi: number
  qrSize: number
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export const TEMPLATE_DIMENSIONS: Record<TemplateConfig['templateType'], TemplateDimensions> = {
  a5: {
    width: 420,
    height: 595,
    dpi: 300,
    qrSize: 150,
    margins: { top: 40, right: 40, bottom: 40, left: 40 }
  }
}

export const QR_SIZES = {
  small: 0.8,
  medium: 1.0,
  large: 1.2
}

export const COLOR_SCHEMES = {
  blue: {
    primary: '#2563eb',
    background: '#eff6ff',
    text: '#1e293b'
  },
  green: {
    primary: '#059669',
    background: '#ecfdf5',
    text: '#1e293b'
  },
  purple: {
    primary: '#7c3aed',
    background: '#f3e8ff',
    text: '#1e293b'
  },
  orange: {
    primary: '#ea580c',
    background: '#fff7ed',
    text: '#1e293b'
  },
  red: {
    primary: '#dc2626',
    background: '#fef2f2',
    text: '#1e293b'
  },
  teal: {
    primary: '#0891b2',
    background: '#f0fdfa',
    text: '#1e293b'
  },
  indigo: {
    primary: '#4f46e5',
    background: '#eef2ff',
    text: '#1e293b'
  }
}

export const FONTS = {
  'Inter': '"Inter", system-ui, sans-serif',
  'Roboto': '"Roboto", sans-serif',
  'Open Sans': '"Open Sans", sans-serif',
  'Lato': '"Lato", sans-serif',
  'Montserrat': '"Montserrat", sans-serif',
  'Nunito': '"Nunito", sans-serif',
  'Poppins': '"Poppins", sans-serif',
  'Source Sans Pro': '"Source Sans Pro", sans-serif',
  'Playfair Display': '"Playfair Display", serif',
  'Merriweather': '"Merriweather", serif',
  'Crimson Text': '"Crimson Text", serif'
}

export class TemplateGenerator {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: TemplateConfig
  private dimensions: TemplateDimensions

  constructor(canvas: HTMLCanvasElement, config: TemplateConfig) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context not available')
    }
    this.ctx = ctx
    this.config = config
    this.dimensions = TEMPLATE_DIMENSIONS[config.templateType]
    
    this.setupCanvas()
  }

  private setupCanvas() {
    const scale = window.devicePixelRatio || 2
    this.canvas.width = this.dimensions.width * scale
    this.canvas.height = this.dimensions.height * scale
    this.canvas.style.width = `${this.dimensions.width}px`
    this.canvas.style.height = `${this.dimensions.height}px`
    
    this.ctx.scale(scale, scale)
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'
    this.ctx.textRenderingOptimization = 'optimizeQuality'
  }

  async generateQRCode(): Promise<string> {
    const qrSize = Math.floor(this.dimensions.qrSize * QR_SIZES[this.config.qrCodeSize])
    
    try {
      const colorScheme = COLOR_SCHEMES[this.config.colorScheme]
      return await QRCode.toDataURL(this.config.uploadUrl, {
        width: qrSize,
        margin: 0,
        color: {
          dark: colorScheme.text,
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      throw new Error('Failed to generate QR code')
    }
  }

  private drawBackground() {
    const colorScheme = COLOR_SCHEMES[this.config.colorScheme]
    this.ctx.fillStyle = colorScheme.background
    this.ctx.fillRect(0, 0, this.dimensions.width, this.dimensions.height)
  }

  private drawTitle() {
    const { margins } = this.dimensions
    const titleFontSize = this.getResponsiveFontSize('title')
    const customMessageFontSize = this.getResponsiveFontSize('customMessage')
    const colorScheme = COLOR_SCHEMES[this.config.colorScheme]
    
    // Fixed position for heading
    const headingY = margins.top + 40
    
    // Draw main heading (event name)
    this.ctx.fillStyle = colorScheme.primary
    this.ctx.font = `bold ${titleFontSize}px ${FONTS[this.config.font] || FONTS.Inter}`
    
    const titleLines = this.wrapTextWithLineBreaks(this.config.eventName, this.dimensions.width - 80)
    const titleLineHeight = titleFontSize * 1.2
    
    titleLines.forEach((line, index) => {
      this.ctx.fillText(
        line,
        this.dimensions.width / 2,
        headingY + (index * titleLineHeight)
      )
    })
    
    // Fixed position for custom message (always same position regardless of heading lines)
    const customMessageY = headingY + 100
    
    // Draw custom message if provided
    if (this.config.customMessage.trim()) {
      this.ctx.fillStyle = colorScheme.text
      this.ctx.font = `${customMessageFontSize}px ${FONTS[this.config.font] || FONTS.Inter}`
      
      const customMessageLines = this.wrapTextWithLineBreaks(this.config.customMessage, this.dimensions.width - 80)
      const customMessageLineHeight = customMessageFontSize * 1.4
      
      customMessageLines.forEach((line, index) => {
        this.ctx.fillText(
          line,
          this.dimensions.width / 2,
          customMessageY + (index * customMessageLineHeight)
        )
      })
    }
  }

  private async drawFixedQRSection(): Promise<void> {
    try {
      const qrDataUrl = await this.generateQRCode()
      const qrImage = new Image()
      
      return new Promise((resolve, reject) => {
        qrImage.onload = () => {
          const qrSize = Math.floor(this.dimensions.qrSize * QR_SIZES[this.config.qrCodeSize])
          const colorScheme = COLOR_SCHEMES[this.config.colorScheme]
          
          // Calculate vertical center for QR code and move 40px down
          const cardCenter = this.dimensions.height / 2 + 40
          const qrY = cardCenter - (qrSize / 2)  // Center QR code vertically
          const instructionsY = qrY + qrSize + 30  // 30px spacing after QR code
          const passwordY = qrY + qrSize + 50  // 50px total spacing for password
          
          // Draw QR code at fixed position
          const qrX = (this.dimensions.width - qrSize) / 2
          
          // Draw white background for QR code
          this.ctx.fillStyle = '#FFFFFF'
          this.ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)
          
          this.ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)
          
          // Draw instructions at fixed position (now appears first after QR code)
          const instructionsFontSize = this.getResponsiveFontSize('footer')  // Use footer font size
          this.ctx.fillStyle = colorScheme.text
          this.ctx.font = `${instructionsFontSize}px ${FONTS[this.config.font] || FONTS.Inter}`
          
          const instructionsLines = this.wrapText(this.config.instructions, this.dimensions.width - 100)
          const instructionsLineHeight = instructionsFontSize * 1.2
          
          instructionsLines.forEach((line, index) => {
            this.ctx.fillText(
              line,
              this.dimensions.width / 2,
              instructionsY + (index * instructionsLineHeight)
            )
          })
          
          // Draw password at fixed position if protected (now appears after instructions)
          if (this.config.isPasswordProtected && this.config.eventPassword) {
            const passwordFontSize = this.getResponsiveFontSize('footer')
            this.ctx.fillStyle = colorScheme.text
            this.ctx.font = `${passwordFontSize}px ${FONTS[this.config.font] || FONTS.Inter}`
            
            const passwordText = `Password: ${this.config.eventPassword}`
            this.ctx.fillText(passwordText, this.dimensions.width / 2, passwordY)
          }
          
          resolve()
        }
        
        qrImage.onerror = () => {
          reject(new Error('Failed to load QR code image'))
        }
        
        qrImage.src = qrDataUrl
      })
    } catch (error) {
      throw new Error('Failed to generate QR code')
    }
  }

  private drawFooter() {
    const { margins } = this.dimensions
    const fontSize = this.getResponsiveFontSize('footer')
    const colorScheme = COLOR_SCHEMES[this.config.colorScheme]
    
    this.ctx.fillStyle = colorScheme.text
    this.ctx.font = `${fontSize}px ${FONTS[this.config.font] || FONTS.Inter}`
    
    const footerY = this.dimensions.height - margins.bottom - fontSize / 2
    
    // Draw website footer
    this.ctx.fillText(
      this.config.footer,
      this.dimensions.width / 2,
      footerY
    )
  }

  private getResponsiveFontSize(element: 'title' | 'customMessage' | 'instructions' | 'footer'): number {
    const baseSize = {
      a5: { title: 28, customMessage: 16, instructions: 16, footer: 12 }
    }
    
    return baseSize[this.config.templateType][element]
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const metrics = this.ctx.measureText(testLine)
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    return lines
  }

  private wrapTextWithLineBreaks(text: string, maxWidth: number): string[] {
    // First split by manual line breaks
    const manualLines = text.split('\n')
    const allLines: string[] = []
    
    // Then wrap each manual line if it's too long
    for (const manualLine of manualLines) {
      if (manualLine.trim() === '') {
        // Preserve empty lines from manual breaks
        allLines.push('')
      } else {
        const wrappedLines = this.wrapText(manualLine, maxWidth)
        allLines.push(...wrappedLines)
      }
    }
    
    return allLines
  }

  async render(): Promise<void> {
    try {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height)
      
      // Draw background
      this.drawBackground()
      
      // Draw title and custom message at fixed positions
      this.drawTitle()
      
      // Draw QR code section at fixed centered position
      await this.drawFixedQRSection()
      
      // Draw footer at bottom
      this.drawFooter()
      
    } catch (error) {
      console.error('Error rendering template:', error)
      throw new Error('Failed to render template')
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }
}