interface PreloadResult {
  url: string
  success: boolean
  error?: string
  loadTime?: number
}

interface PreloaderOptions {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

class ImagePreloader {
  private cache = new Map<string, PreloadResult>()
  private loadingPromises = new Map<string, Promise<PreloadResult>>()
  private options: Required<PreloaderOptions>

  constructor(options: PreloaderOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 2,
      retryDelay: options.retryDelay ?? 1000,
      timeout: options.timeout ?? 15000, // 15 seconds
    }
  }

  async preload(url: string): Promise<PreloadResult> {
    // Return cached result if available
    if (this.cache.has(url)) {
      return this.cache.get(url)!
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!
    }

    // Create new loading promise
    const promise = this.loadImage(url)
    this.loadingPromises.set(url, promise)

    try {
      const result = await promise
      this.cache.set(url, result)
      return result
    } finally {
      this.loadingPromises.delete(url)
    }
  }

  async preloadBatch(urls: string[]): Promise<PreloadResult[]> {
    const promises = urls.map(url => this.preload(url))
    return Promise.allSettled(promises).then(results => 
      results.map((result, index) => 
        result.status === 'fulfilled' 
          ? result.value 
          : { url: urls[index], success: false, error: 'Promise rejected' }
      )
    )
  }

  private async loadImage(url: string): Promise<PreloadResult> {
    const startTime = Date.now()

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        const result = await this.attemptLoad(url)
        return {
          url,
          success: true,
          loadTime: Date.now() - startTime
        }
      } catch (error) {
        const isLastAttempt = attempt === this.options.maxRetries
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        if (isLastAttempt) {
          return {
            url,
            success: false,
            error: errorMessage,
            loadTime: Date.now() - startTime
          }
        }

        // Wait before retry
        if (this.options.retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay))
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    return {
      url,
      success: false,
      error: 'Max retries exceeded',
      loadTime: Date.now() - startTime
    }
  }

  private attemptLoad(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      const cleanup = () => {
        img.onload = null
        img.onerror = null
        img.onabort = null
      }

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Image load timeout'))
      }, this.options.timeout)

      img.onload = () => {
        clearTimeout(timeout)
        cleanup()
        resolve()
      }

      img.onerror = () => {
        clearTimeout(timeout)
        cleanup()
        reject(new Error('Image failed to load'))
      }

      img.onabort = () => {
        clearTimeout(timeout)
        cleanup()
        reject(new Error('Image load aborted'))
      }

      // Start loading
      img.src = url
    })
  }

  isLoaded(url: string): boolean {
    const result = this.cache.get(url)
    return result?.success === true
  }

  isLoading(url: string): boolean {
    return this.loadingPromises.has(url)
  }

  getLoadTime(url: string): number | undefined {
    return this.cache.get(url)?.loadTime
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheSize(): number {
    return this.cache.size
  }

  getStats() {
    const results = Array.from(this.cache.values())
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const avgLoadTime = results
      .filter(r => r.success && r.loadTime)
      .reduce((sum, r) => sum + (r.loadTime || 0), 0) / successful || 0

    return {
      total: results.length,
      successful,
      failed,
      avgLoadTime: Math.round(avgLoadTime),
      loading: this.loadingPromises.size
    }
  }
}

// Export singleton instance and class
export const imagePreloader = new ImagePreloader()
export { ImagePreloader }
export type { PreloadResult, PreloaderOptions }