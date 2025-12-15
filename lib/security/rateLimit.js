/**
 * Rate Limiting & Security Middleware
 * IP tracking, rate limiting, suspicious activity detection
 */

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map()
const ipBlockList = new Set()
const suspiciousActivityLog = []

/**
 * Rate limiter configuration
 */
const RATE_LIMITS = {
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60 // 60 requests per minute
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // 5 login attempts per 15 minutes
  },
  forms: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3 // 3 form submissions per minute
  },
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 searches per minute
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request) {
  // Check various headers for IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  return 'unknown'
}

/**
 * Check if IP is blocked
 */
export function isIPBlocked(ip) {
  return ipBlockList.has(ip)
}

/**
 * Block an IP address
 */
export function blockIP(ip, reason = 'Suspicious activity') {
  ipBlockList.add(ip)
  logSuspiciousActivity(ip, 'IP_BLOCKED', reason)

  // Auto-unblock after 24 hours
  setTimeout(() => {
    ipBlockList.delete(ip)
  }, 24 * 60 * 60 * 1000)

  console.warn(`🚫 IP blocked: ${ip} - Reason: ${reason}`)
}

/**
 * Rate limiting middleware
 */
export function rateLimit(type = 'api') {
  const config = RATE_LIMITS[type] || RATE_LIMITS.api

  return async (request) => {
    const ip = getClientIP(request)

    // Check if IP is blocked
    if (isIPBlocked(ip)) {
      return {
        allowed: false,
        error: 'Your IP has been temporarily blocked due to suspicious activity',
        status: 403
      }
    }

    const key = `${type}:${ip}`
    const now = Date.now()

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)

    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      }
      rateLimitStore.set(key, entry)
    }

    // Reset if window has expired
    if (now > entry.resetTime) {
      entry.count = 0
      entry.resetTime = now + config.windowMs
    }

    // Increment count
    entry.count++

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const excessiveRequests = entry.count - config.maxRequests

      // Block IP if excessive
      if (excessiveRequests > 20) {
        blockIP(ip, `Excessive ${type} requests: ${entry.count}`)
      }

      logSuspiciousActivity(ip, 'RATE_LIMIT_EXCEEDED', `${type}: ${entry.count} requests`)

      return {
        allowed: false,
        error: 'Too many requests. Please try again later.',
        status: 429,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }
}

/**
 * Log suspicious activity
 */
function logSuspiciousActivity(ip, type, details) {
  const entry = {
    ip,
    type,
    details,
    timestamp: new Date().toISOString()
  }

  suspiciousActivityLog.push(entry)

  // Keep only last 1000 entries
  if (suspiciousActivityLog.length > 1000) {
    suspiciousActivityLog.shift()
  }

  console.warn(`⚠️  Suspicious activity detected:`, entry)
}

/**
 * Detect suspicious patterns in request
 */
export function detectSuspiciousActivity(request, body = null) {
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || ''
  const url = new URL(request.url)

  const suspiciousPatterns = []

  // 1. SQL Injection patterns
  if (body) {
    const bodyStr = JSON.stringify(body).toLowerCase()
    const sqlPatterns = ['union select', 'drop table', '1=1', 'or 1=1', '--', 'xp_cmdshell']

    sqlPatterns.forEach(pattern => {
      if (bodyStr.includes(pattern)) {
        suspiciousPatterns.push(`SQL_INJECTION: ${pattern}`)
      }
    })
  }

  // 2. XSS patterns
  if (body) {
    const bodyStr = JSON.stringify(body).toLowerCase()
    const xssPatterns = ['<script', 'javascript:', 'onerror=', 'onload=', '<iframe']

    xssPatterns.forEach(pattern => {
      if (bodyStr.includes(pattern)) {
        suspiciousPatterns.push(`XSS_ATTEMPT: ${pattern}`)
      }
    })
  }

  // 3. Bot detection
  const botPatterns = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget']
  if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
    suspiciousPatterns.push('BOT_DETECTED')
  }

  // 4. Missing or suspicious User-Agent
  if (!userAgent || userAgent.length < 10) {
    suspiciousPatterns.push('MISSING_USER_AGENT')
  }

  // 5. Suspicious URL patterns
  const suspiciousURLs = ['admin', 'wp-admin', '.env', 'config', 'backup']
  if (suspiciousURLs.some(pattern => url.pathname.includes(pattern))) {
    if (!url.pathname.startsWith('/admin')) { // Allow legitimate admin
      suspiciousPatterns.push('SUSPICIOUS_URL')
    }
  }

  // 6. Excessive payload size
  if (body && JSON.stringify(body).length > 1000000) { // 1MB
    suspiciousPatterns.push('EXCESSIVE_PAYLOAD_SIZE')
  }

  // Log if suspicious activity detected
  if (suspiciousPatterns.length > 0) {
    logSuspiciousActivity(ip, 'SUSPICIOUS_PATTERNS', suspiciousPatterns.join(', '))

    // Block if critical patterns detected
    const criticalPatterns = suspiciousPatterns.filter(p =>
      p.includes('SQL_INJECTION') || p.includes('XSS_ATTEMPT')
    )

    if (criticalPatterns.length > 0) {
      blockIP(ip, criticalPatterns.join(', '))
      return {
        suspicious: true,
        blocked: true,
        patterns: suspiciousPatterns
      }
    }

    return {
      suspicious: true,
      blocked: false,
      patterns: suspiciousPatterns
    }
  }

  return {
    suspicious: false,
    blocked: false,
    patterns: []
  }
}

/**
 * Get suspicious activity log
 */
export function getSuspiciousActivityLog(limit = 100) {
  return suspiciousActivityLog.slice(-limit)
}

/**
 * Get blocked IPs
 */
export function getBlockedIPs() {
  return Array.from(ipBlockList)
}

/**
 * Unblock an IP
 */
export function unblockIP(ip) {
  ipBlockList.delete(ip)
  console.log(`✅ IP unblocked: ${ip}`)
}

/**
 * Clear rate limit for an IP (admin action)
 */
export function clearRateLimit(ip, type = null) {
  if (type) {
    rateLimitStore.delete(`${type}:${ip}`)
  } else {
    // Clear all rate limits for this IP
    for (const key of rateLimitStore.keys()) {
      if (key.endsWith(`:${ip}`)) {
        rateLimitStore.delete(key)
      }
    }
  }
}

export default {
  getClientIP,
  isIPBlocked,
  blockIP,
  unblockIP,
  rateLimit,
  detectSuspiciousActivity,
  getSuspiciousActivityLog,
  getBlockedIPs,
  clearRateLimit
}
