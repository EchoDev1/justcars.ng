/**
 * PWA Install Prompt Component
 * Prompt users to install the app on their device
 */

'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true)
      return
    }

    // Check if user has dismissed prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default mini-infobar
      e.preventDefault()
      // Save the event for later use
      setDeferredPrompt(e)
      // Show our custom prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Wait 3 seconds before showing
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed')
      setIsInstalled(true)
      setShowPrompt(false)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice

    console.log(`User response: ${outcome}`)

    // Clear the deferred prompt
    setDeferredPrompt(null)
    setShowPrompt(false)

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
      localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
  }

  // Don't show if installed or prompt hidden
  if (isInstalled || !showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full p-1 transition"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-white/20 p-3 rounded-full">
            <Smartphone size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1">Install JustCars App</h3>
            <p className="text-sm text-white/90">
              Get the app-like experience! Quick access, offline browsing, and instant notifications.
            </p>
          </div>
        </div>

        {/* Features */}
        <ul className="text-sm space-y-1 mb-4 text-white/90">
          <li>✓ Add to home screen</li>
          <li>✓ Works offline</li>
          <li>✓ Push notifications for new cars</li>
          <li>✓ Faster loading</li>
        </ul>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-white/20 rounded-lg font-semibold hover:bg-white/30 transition"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  )
}
