/**
 * Offline Page
 * Shown when user is offline and page is not cached
 */

'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <WifiOff size={80} className="text-gray-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">You're Offline</h1>
          <p className="text-lg text-gray-600 mb-6">
            No internet connection detected. Please check your connection and try again.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2"
        >
          <RefreshCw size={20} />
          Try Again
        </button>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Tip:</h3>
          <p className="text-sm text-blue-800">
            Some pages may be available offline if you've visited them before.
            Try navigating using the browser's back button.
          </p>
        </div>
      </div>
    </div>
  )
}
