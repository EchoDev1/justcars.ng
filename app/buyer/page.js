/**
 * Buyer Dashboard
 * Main landing page for authenticated buyers
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, MessageCircle, ShoppingCart, TrendingUp, Eye, Car } from 'lucide-react'
import { formatNaira } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function BuyerDashboard() {
  const [stats, setStats] = useState({
    savedCars: 0,
    activeChats: 0,
    recentlyViewed: 0
  })
  const [savedCars, setSavedCars] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/buyer/auth')
        return
      }

      // Fetch saved cars count and recent saved cars
      const { data: savedCarsData, error: savedError } = await supabase
        .from('buyer_saved_cars')
        .select(`
          *,
          car:cars(
            *,
            dealer:dealers(name),
            car_images(image_url, is_primary)
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4)

      if (savedError) throw savedError

      setSavedCars(savedCarsData || [])

      // Fetch active chats count
      const { count: chatsCount, error: chatsError } = await supabase
        .from('buyer_chats')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', user.id)

      // Get total saved cars count
      const { count: savedCount, error: savedCountError } = await supabase
        .from('buyer_saved_cars')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', user.id)

      setStats({
        savedCars: savedCount || 0,
        activeChats: chatsCount || 0,
        recentlyViewed: savedCarsData?.length || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2">Welcome Back!</h1>
          <p className="text-white/80 text-lg">Here's what's happening with your car search</p>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/buyer/saved">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all cursor-pointer hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <Heart className="text-red-500" size={28} />
                </div>
                <TrendingUp className="text-green-500" size={24} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.savedCars}</h3>
              <p className="text-gray-600">Saved Cars</p>
            </div>
          </Link>

          <Link href="/buyer/chats">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all cursor-pointer hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <MessageCircle className="text-blue-500" size={28} />
                </div>
                <TrendingUp className="text-green-500" size={24} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.activeChats}</h3>
              <p className="text-gray-600">Active Chats</p>
            </div>
          </Link>

          <Link href="/cars">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all cursor-pointer hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Car className="text-purple-500" size={28} />
                </div>
                <TrendingUp className="text-green-500" size={24} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">Browse</h3>
              <p className="text-gray-600">Find Your Dream Car</p>
            </div>
          </Link>
        </div>

        {/* Recently Saved Cars */}
        {savedCars.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <Heart className="text-red-500" size={28} />
                <span>Recently Saved Cars</span>
              </h2>
              <Link href="/buyer/saved" className="text-blue-600 hover:text-blue-700 font-semibold">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {savedCars.map((saved) => {
                const car = saved.car
                const primaryImage = car.car_images?.find(img => img.is_primary) || car.car_images?.[0]
                const imageUrl = primaryImage?.image_url || '/images/placeholder-car.jpg'

                return (
                  <Link key={saved.id} href={`/cars/${car.id}`}>
                    <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1">
                      <div className="relative h-40">
                        <Image
                          src={imageUrl}
                          alt={`${car.year} ${car.make} ${car.model}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 mb-1 truncate">
                          {car.year} {car.make} {car.model}
                        </h3>
                        <p className="text-lg font-bold text-blue-600">
                          {formatNaira(car.price)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Saved {new Date(saved.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/cars">
              <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl">
                <Car size={20} />
                <span>Browse All Cars</span>
              </button>
            </Link>

            <Link href="/buyer/saved">
              <button className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl">
                <Heart size={20} />
                <span>View Saved Cars</span>
              </button>
            </Link>

            <Link href="/buyer/chats">
              <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl">
                <MessageCircle size={20} />
                <span>My Chats</span>
              </button>
            </Link>

            <Link href="/luxury">
              <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl">
                <TrendingUp size={20} />
                <span>Luxury Collection</span>
              </button>
            </Link>
          </div>
        </div>

        {/* No saved cars yet */}
        {savedCars.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Heart className="mx-auto text-gray-300 mb-4" size={80} />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Saved Cars Yet</h3>
            <p className="text-gray-600 mb-6">
              Start browsing our collection and save cars that catch your eye!
            </p>
            <Link href="/cars">
              <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg">
                Browse Cars Now
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
