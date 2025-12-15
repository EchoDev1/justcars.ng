/**
 * Service Worker Registration Component
 * Registers the service worker for PWA functionality
 */

'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        registerServiceWorker()
      })
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('✅ Service Worker registered:', registration.scope)

      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60000) // Check every minute

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New service worker available')

            // Show update notification
            if (confirm('A new version is available! Reload to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          }
        })
      })

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed')
      })

    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          console.log('Notification permission granted')

          // Subscribe to push notifications
          subscribeToPushNotifications()
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error)
      }
    }
  }

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        console.log('Already subscribed to push notifications')
        return
      }

      // Subscribe to push notifications
      // You'll need a VAPID public key from your push service
      // For now, we'll skip actual subscription
      console.log('Push notification subscription ready to be implemented')

    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
    }
  }

  // Request permission after user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      requestNotificationPermission()
      // Remove listener after first interaction
      document.removeEventListener('click', handleUserInteraction)
    }

    // Wait for user interaction before requesting permission
    document.addEventListener('click', handleUserInteraction, { once: true })

    return () => {
      document.removeEventListener('click', handleUserInteraction)
    }
  }, [])

  return null // This component doesn't render anything
}
