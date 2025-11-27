/**
 * Buyer Saved Cars Portal - OPTIMIZED VERSION
 * Fast loading with timeouts and better error handling
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, ShoppingCart, Filter, SortAsc, Grid, List } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SavedCarsPage() {
  const [savedCars, setSavedCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchSavedCarsWithTimeout()
  }, [])

  const fetchSavedCarsWithTimeout = async () => {
    const timeout = setTimeout(() => {
      setLoading(false)
      setError('Request timed out. Please refresh the page.')
    }, 5000) // 5 second timeout

    try {
      await fetchSavedCars()
      clearTimeout(timeout)
    } catch (err) {
      clearTimeout(timeout)
    }
  }

  const fetchSavedCars = async () => {
    try {
      console.log('[Saved Cars] Starting fetch...')
      setLoading(true)
      setError(null)

      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('[Saved Cars] Auth error:', authError)
        router.push('/buyer/auth')
        return
      }

      if (!user) {
        console.log('[Saved Cars] No user, redirecting...')
        router.push('/buyer/auth')
        return
      }

      console.log('[Saved Cars] User found:', user.id)
      console.log('[Saved Cars] Fetching saved cars...')

      // Simplified query - just get the basics
      const { data, error } = await supabase
        .from('buyer_saved_cars')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Saved Cars] Database error:', error)
        throw error
      }

      console.log('[Saved Cars] Success! Found:', data?.length || 0, 'cars')
      setSavedCars(data || [])
      setError(null)
    } catch (error) {
      console.error('[Saved Cars] Error:', error)
      setError(error.message || 'Failed to load saved cars')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your saved cars...</p>
          <p className="text-sm text-gray-500 mt-2">This should only take a moment</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <h3 className="text-red-800 font-bold mb-2">Error Loading Saved Cars</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2 flex items-center space-x-3">
            <Heart className="animate-pulse" size={40} />
            <span>My Saved Cars</span>
          </h1>
          <p className="text-white/80 text-lg">
            {savedCars.length} car{savedCars.length !== 1 ? 's' : ''} saved for later
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {savedCars.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="mx-auto text-gray-300 mb-4" size={80} />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Saved Cars</h3>
            <p className="text-gray-600 mb-6">Start browsing and save cars that catch your eye!</p>
            <button
              onClick={() => router.push('/cars')}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
            >
              Browse Cars
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Your Saved Cars</h3>
            <div className="space-y-4">
              {savedCars.map((saved) => (
                <div key={saved.id} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900">Car ID: {saved.car_id}</p>
                  <p className="text-sm text-gray-500">
                    Saved: {new Date(saved.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Interest: {saved.interest_level}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
