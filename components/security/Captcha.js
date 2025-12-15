/**
 * CAPTCHA Component
 * Uses hCaptcha for bot protection on forms
 * Get site key from: https://www.hcaptcha.com
 */

'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ''

export default function Captcha({ onVerify, onError, onExpire }) {
  const captchaRef = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (widgetId.current !== null && window.hcaptcha) {
        window.hcaptcha.remove(widgetId.current)
      }
    }
  }, [])

  const handleCaptchaLoad = () => {
    if (!window.hcaptcha || !captchaRef.current) return

    widgetId.current = window.hcaptcha.render(captchaRef.current, {
      sitekey: HCAPTCHA_SITE_KEY,
      callback: (token) => {
        if (onVerify) onVerify(token)
      },
      'error-callback': () => {
        if (onError) onError()
      },
      'expired-callback': () => {
        if (onExpire) onExpire()
      }
    })
  }

  if (!HCAPTCHA_SITE_KEY) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ⚠️ CAPTCHA not configured. Add <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_HCAPTCHA_SITE_KEY</code> to .env.local
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          Get your site key from <a href="https://www.hcaptcha.com" target="_blank" rel="noopener noreferrer" className="underline">hcaptcha.com</a>
        </p>
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://js.hcaptcha.com/1/api.js"
        onLoad={handleCaptchaLoad}
        strategy="lazyOnload"
      />
      <div ref={captchaRef} className="hcaptcha-container"></div>
    </>
  )
}

/**
 * Verify CAPTCHA token on server side
 */
export async function verifyCaptcha(token) {
  const secret = process.env.HCAPTCHA_SECRET_KEY

  if (!secret) {
    console.warn('hCaptcha secret key not configured')
    return { success: false, error: 'CAPTCHA not configured' }
  }

  if (!token) {
    return { success: false, error: 'CAPTCHA token missing' }
  }

  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `response=${token}&secret=${secret}`
    })

    const data = await response.json()

    if (data.success) {
      return { success: true }
    }

    return {
      success: false,
      error: 'CAPTCHA verification failed',
      errorCodes: data['error-codes']
    }
  } catch (error) {
    console.error('CAPTCHA verification error:', error)
    return {
      success: false,
      error: 'CAPTCHA verification failed'
    }
  }
}
