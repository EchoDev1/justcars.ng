/**
 * Performance Optimization Utilities
 * Utilities for improving app performance
 */

// Debounce function for search inputs and API calls
export function debounce(func, wait = 300) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function for scroll events
export function throttle(func, limit = 100) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Lazy load images with Intersection Observer
export function lazyLoadImages() {
  if (typeof window === 'undefined') return

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        img.classList.remove('lazy')
        observer.unobserve(img)
      }
    })
  })

  const images = document.querySelectorAll('img.lazy')
  images.forEach(img => imageObserver.observe(img))
}

// Preload critical resources
export function preloadCriticalResources(resources) {
  if (typeof window === 'undefined') return

  resources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = resource.type
    link.href = resource.url
    if (resource.type === 'font') {
      link.crossOrigin = 'anonymous'
    }
    document.head.appendChild(link)
  })
}

// Prefetch next page
export function prefetchPage(url) {
  if (typeof window === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  document.head.appendChild(link)
}

// Measure page load performance
export function measurePagePerformance() {
  if (typeof window === 'undefined') return

  if (window.performance && window.performance.timing) {
    const perfData = window.performance.timing
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
    const connectTime = perfData.responseEnd - perfData.requestStart
    const renderTime = perfData.domComplete - perfData.domLoading

    return {
      pageLoadTime,
      connectTime,
      renderTime,
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart
    }
  }
}

// Local storage cache with expiry
export class CacheManager {
  static set(key, value, expiryMinutes = 60) {
    const item = {
      value,
      expiry: Date.now() + (expiryMinutes * 60 * 1000)
    }
    try {
      localStorage.setItem(key, JSON.stringify(item))
    } catch (e) {
      console.error('Cache set error:', e)
    }
  }

  static get(key) {
    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return null

      const item = JSON.parse(itemStr)
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key)
        return null
      }
      return item.value
    } catch (e) {
      console.error('Cache get error:', e)
      return null
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.error('Cache remove error:', e)
    }
  }

  static clear() {
    try {
      localStorage.clear()
    } catch (e) {
      console.error('Cache clear error:', e)
    }
  }
}

// Optimize images for different screen sizes
export function getOptimizedImageUrl(url, width) {
  if (!url) return ''

  // If it's a Supabase URL, add transformation parameters
  if (url.includes('supabase.co')) {
    const transformedUrl = new URL(url)
    transformedUrl.searchParams.set('width', width)
    transformedUrl.searchParams.set('quality', '85')
    return transformedUrl.toString()
  }

  // If it's Unsplash, use their transformation API
  if (url.includes('unsplash.com')) {
    return `${url}?w=${width}&q=85&auto=format`
  }

  return url
}

// Batch API requests
export class RequestBatcher {
  constructor(batchFunction, delay = 50) {
    this.batchFunction = batchFunction
    this.delay = delay
    this.queue = []
    this.timeout = null
  }

  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject })

      if (this.timeout) {
        clearTimeout(this.timeout)
      }

      this.timeout = setTimeout(() => {
        this.flush()
      }, this.delay)
    })
  }

  async flush() {
    if (this.queue.length === 0) return

    const batch = this.queue.splice(0)
    const requests = batch.map(item => item.request)

    try {
      const results = await this.batchFunction(requests)
      batch.forEach((item, index) => {
        item.resolve(results[index])
      })
    } catch (error) {
      batch.forEach(item => {
        item.reject(error)
      })
    }
  }
}

// Virtualize long lists for better performance
export function calculateVisibleRange(scrollTop, itemHeight, bufferSize = 3) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize)
  const endIndex = startIndex + Math.ceil(window.innerHeight / itemHeight) + (bufferSize * 2)

  return { startIndex, endIndex }
}

// Web Vitals tracking
export function reportWebVitals(metric) {
  if (typeof window !== 'undefined') {
    console.log(metric)
    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: gtag('event', metric.name, { value: metric.value })
    }
  }
}
