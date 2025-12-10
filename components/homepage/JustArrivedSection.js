/**
 * Just Arrived Section Component
 * Displays newly arrived cars marked by admins or dealers
 * Fully functional with proper error handling and loading states
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, Clock, ChevronRight, TrendingUp, Calendar } from 'lucide-react'

export default function JustArrivedSection() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchJustArrivedCars()
  }, [])

  const fetchJustArrivedCars = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/cars/latest?limit=10')

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const data = await response.json()

      if (data.cars && Array.isArray(data.cars)) {
        setCars(data.cars)
        setTotalCount(data.cars.length)
      } else {
        setCars([])
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Error fetching just arrived cars:', err)
      setError(err.message)
      setCars([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Recently'

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 7) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`
    if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
    return 'Just now'
  }

  // Get primary image
  const getPrimaryImage = (car) => {
    if (car.car_images && Array.isArray(car.car_images)) {
      const primary = car.car_images.find(img => img.is_primary)
      return primary?.image_url || car.car_images[0]?.image_url
    }
    return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800'
  }

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  // If there are no cars (not an error, just empty), don't show the section
  if (!loading && !error && totalCount === 0) {
    return null
  }

  return (
    <section className="py-24 relative overflow-hidden just-arrived-section" style={{
      background: 'linear-gradient(135deg, #1e2a47 0%, #0f1628 50%, #1a2d4a 100%)'
    }}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-cyan-500/10" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0, 217, 255, 0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-4 flex-wrap justify-center mb-6">
            <div className="flex items-center gap-3">
              <Zap className="text-cyan-400 animate-pulse" size={48} />
              <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Just Arrived
              </h2>
            </div>
            <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg animate-bounce">
              NEW
            </span>
          </div>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-4">
            Fresh arrivals updated daily. Be the first to discover these premium vehicles.
          </p>
          {totalCount > 0 && (
            <div className="flex items-center justify-center gap-2 text-cyan-400">
              <Clock size={20} />
              <span className="font-semibold">{totalCount} newly arrived car{totalCount !== 1 ? 's' : ''} available</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400" size={32} />
            </div>
            <p className="mt-6 text-gray-400 text-lg">Loading fresh arrivals...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-8 text-center">
            <div className="text-red-400 text-lg mb-4">Failed to load just arrived cars</div>
            <button
              onClick={fetchJustArrivedCars}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg"
            >
              Retry
            </button>
          </div>
        )}

        {/* Cars Grid */}
        {!loading && !error && cars.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {cars.map((car, index) => (
                <Link
                  key={car.id}
                  href={`/cars/${car.id}`}
                  className="group relative"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-lg rounded-2xl overflow-hidden border-2 border-cyan-500/20 hover:border-cyan-400/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20">
                    {/* "NEW" Badge */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                      <Zap size={14} />
                      <span>JUST IN</span>
                    </div>

                    {/* Time Badge */}
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-cyan-400 text-xs font-semibold rounded-full">
                      <Clock size={12} />
                      <span>{getTimeAgo(car.just_arrived_date || car.created_at)}</span>
                    </div>

                    {/* Car Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={getPrimaryImage(car)}
                        alt={`${car.year} ${car.make} ${car.model}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
                    </div>

                    {/* Car Details */}
                    <div className="p-4 space-y-3">
                      {/* Car Name */}
                      <h3 className="text-white font-bold text-lg line-clamp-1 group-hover:text-cyan-400 transition-colors">
                        {car.year} {car.make} {car.model}
                      </h3>

                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                          {formatPrice(car.price)}
                        </span>
                        <TrendingUp className="text-green-400" size={20} />
                      </div>

                      {/* View Details Button */}
                      <button className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg group-hover:shadow-cyan-500/50 flex items-center justify-center gap-2">
                        <span>View Details</span>
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* View All Button */}
            <div className="text-center">
              <Link href="/just-arrived">
                <button className="group px-8 py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white text-lg font-bold rounded-full hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-3 mx-auto">
                  <span>View All New Arrivals</span>
                  <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
