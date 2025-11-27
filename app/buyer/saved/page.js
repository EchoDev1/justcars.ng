/**
 * Buyer Saved Cars Portal
 * Beautiful dashboard for buyers to view and manage their saved cars
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, Trash2, MessageCircle, ShoppingCart, Filter, SortAsc, Grid, List } from 'lucide-react'
import { formatNaira, formatNumber } from '@/lib/utils'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import ChatButton from '@/components/chat/ChatButton'

export default function SavedCarsPage() {
  const [savedCars, setSavedCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date_desc')
  const [filterInterest, setFilterInterest] = useState('all')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchSavedCars()
  }, [])

  const fetchSavedCars = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('Auth error:', authError)
        router.push('/buyer/auth')
        return
      }

      if (!user) {
        console.log('No user found, redirecting to auth...')
        router.push('/buyer/auth')
        return
      }

      console.log('Fetching saved cars for user:', user.id)

      const { data, error } = await supabase
        .from('buyer_saved_cars')
        .select(`
          *,
          car:cars(
            *,
            dealer:dealers(id, name, phone, email),
            car_images(image_url, is_primary)
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('Saved cars fetched successfully:', data?.length || 0)
      setSavedCars(data || [])
    } catch (error) {
      console.error('Error fetching saved cars:', error)
      console.error('Full error object:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }

  const handleUnsave = async (savedCarId, carTitle) => {
    if (!confirm(`Remove ${carTitle} from saved cars?`)) return

    try {
      const { error } = await supabase
        .from('buyer_saved_cars')
        .delete()
        .eq('id', savedCarId)

      if (error) throw error

      await fetchSavedCars()
    } catch (error) {
      console.error('Error removing saved car:', error)
      alert('Failed to remove car from saved list')
    }
  }

  const handleUpdateInterest = async (savedCarId, newLevel) => {
    try {
      const { error } = await supabase
        .from('buyer_saved_cars')
        .update({ interest_level: newLevel })
        .eq('id', savedCarId)

      if (error) throw error

      await fetchSavedCars()
    } catch (error) {
      console.error('Error updating interest level:', error)
    }
  }

  const filteredAndSortedCars = savedCars
    .filter(saved => filterInterest === 'all' || saved.interest_level === filterInterest)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'date_asc':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'price_asc':
          return a.car.price - b.car.price
        case 'price_desc':
          return b.car.price - a.car.price
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your saved cars...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center space-x-3">
                <Heart className="animate-pulse" size={40} />
                <span>My Saved Cars</span>
              </h1>
              <p className="text-white/80 text-lg">
                {savedCars.length} car{savedCars.length !== 1 ? 's' : ''} saved for later
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white/20 backdrop-blur-sm' : 'hover:bg-white/10'
                }`}
              >
                <Grid size={24} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-white/20 backdrop-blur-sm' : 'hover:bg-white/10'
                }`}
              >
                <List size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Interest Filter */}
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-gray-500" />
              <select
                value={filterInterest}
                onChange={(e) => setFilterInterest(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Interest Levels</option>
                <option value="interested">Interested</option>
                <option value="very_interested">Very Interested</option>
                <option value="ready_to_buy">Ready to Buy</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <SortAsc size={20} className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="date_desc">Recently Saved</option>
                <option value="date_asc">Oldest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600">
              Showing {filteredAndSortedCars.length} of {savedCars.length} cars
            </div>
          </div>
        </div>

        {/* Cars Display */}
        {filteredAndSortedCars.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="mx-auto text-gray-300 mb-4" size={80} />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Saved Cars</h3>
            <p className="text-gray-600 mb-6">
              {savedCars.length === 0
                ? 'Start browsing and save cars that catch your eye!'
                : 'No cars match your current filter'}
            </p>
            <button
              onClick={() => router.push('/cars')}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
            >
              Browse Cars
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCars.map((saved) => {
              const car = saved.car
              const primaryImage = car.car_images?.find(img => img.is_primary) || car.car_images?.[0]
              const imageUrl = primaryImage?.image_url || '/images/placeholder-car.jpg'

              return (
                <div key={saved.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  {/* Image */}
                  <div className="relative h-56">
                    <Image
                      src={imageUrl}
                      alt={`${car.year} ${car.make} ${car.model}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Saved Date Badge */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-semibold text-gray-900">
                      Saved {new Date(saved.created_at).toLocaleDateString()}
                    </div>

                    {/* Unsave Button */}
                    <button
                      onClick={() => handleUnsave(saved.id, `${car.year} ${car.make} ${car.model}`)}
                      className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {car.year} {car.make} {car.model}
                    </h3>

                    <p className="text-3xl font-bold text-blue-600 mb-4">
                      {formatNaira(car.price)}
                    </p>

                    {/* Interest Level */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interest Level
                      </label>
                      <select
                        value={saved.interest_level}
                        onChange={(e) => handleUpdateInterest(saved.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="interested">Interested</option>
                        <option value="very_interested">Very Interested</option>
                        <option value="ready_to_buy">Ready to Buy</option>
                      </select>
                    </div>

                    {/* Notes */}
                    {saved.buyer_notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 italic">"{saved.buyer_notes}"</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => router.push(`/buyer/checkout/${car.id}`)}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all"
                      >
                        <ShoppingCart size={18} />
                        <span>Buy Now</span>
                      </button>

                      <ChatButton
                        car={car}
                        dealer={car.dealer}
                        variant="secondary"
                      />

                      <button
                        onClick={() => router.push(`/cars/${car.id}`)}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-semibold transition-all"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedCars.map((saved) => {
              const car = saved.car
              const primaryImage = car.car_images?.find(img => img.is_primary) || car.car_images?.[0]
              const imageUrl = primaryImage?.image_url || '/images/placeholder-car.jpg'

              return (
                <div key={saved.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all">
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="relative w-full md:w-80 h-56">
                      <Image
                        src={imageUrl}
                        alt={`${car.year} ${car.make} ${car.model}`}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-1">
                            {car.year} {car.make} {car.model}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Saved on {new Date(saved.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          onClick={() => handleUnsave(saved.id, `${car.year} ${car.make} ${car.model}`)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <p className="text-3xl font-bold text-blue-600 mb-4">
                        {formatNaira(car.price)}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Interest Level
                          </label>
                          <select
                            value={saved.interest_level}
                            onChange={(e) => handleUpdateInterest(saved.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          >
                            <option value="interested">Interested</option>
                            <option value="very_interested">Very Interested</option>
                            <option value="ready_to_buy">Ready to Buy</option>
                          </select>
                        </div>

                        <div className="flex items-end space-x-2">
                          <button
                            onClick={() => router.push(`/buyer/checkout/${car.id}`)}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center space-x-2"
                          >
                            <ShoppingCart size={18} />
                            <span>Buy</span>
                          </button>
                          <button
                            onClick={() => router.push(`/cars/${car.id}`)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
