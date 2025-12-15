/**
 * Example: Public Dealer Profile Page with Reviews
 * Shows how to create a public dealer page with reviews integration
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Clock,
  Shield,
  Award,
  TrendingUp,
  Car
} from 'lucide-react'
import ReviewsSection from '@/components/ui/ReviewsSection'

export default function PublicDealerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [dealer, setDealer] = useState(null)
  const [cars, setCars] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDealerData()
  }, [params.id])

  const fetchDealerData = async () => {
    try {
      // Fetch dealer profile
      const dealerResponse = await fetch(`/api/dealers/${params.id}`)
      if (dealerResponse.ok) {
        const dealerData = await dealerResponse.json()
        setDealer(dealerData)
      }

      // Fetch dealer's active cars
      const carsResponse = await fetch(`/api/cars?dealerId=${params.id}&status=active&limit=12`)
      if (carsResponse.ok) {
        const carsData = await carsResponse.json()
        setCars(carsData.cars || [])
      }

      // Fetch dealer statistics
      const statsResponse = await fetch(`/api/dealers/${params.id}/statistics`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStatistics(statsData)
      }
    } catch (error) {
      console.error('Error fetching dealer data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!dealer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dealer Not Found</h1>
          <p className="text-gray-600">The dealer you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Dealer Logo/Avatar */}
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 text-4xl font-bold shadow-lg">
              {dealer.business_name.charAt(0).toUpperCase()}
            </div>

            {/* Dealer Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{dealer.business_name}</h1>
                {dealer.is_verified && (
                  <div className="bg-green-500 p-2 rounded-full">
                    <Shield size={20} />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  {dealer.business_address}
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  {dealer.phone}
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  {dealer.email}
                </div>
                {dealer.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={16} />
                    <a href={dealer.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Website
                    </a>
                  </div>
                )}
              </div>

              {/* Quick Stats Bar */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="opacity-80">Member Since:</span>
                  <span className="font-semibold ml-2">
                    {new Date(dealer.created_at).getFullYear()}
                  </span>
                </div>
                <div>
                  <span className="opacity-80">Active Listings:</span>
                  <span className="font-semibold ml-2">{cars.length}</span>
                </div>
                {statistics?.total_sales && (
                  <div>
                    <span className="opacity-80">Total Sales:</span>
                    <span className="font-semibold ml-2">{statistics.total_sales}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Star className="text-blue-600" size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{statistics.average_rating || 0}</p>
              <p className="text-sm text-gray-600">Average Rating</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Car className="text-green-600" size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{cars.length}</p>
              <p className="text-sm text-gray-600">Active Listings</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingUp className="text-purple-600" size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{statistics.total_reviews || 0}</p>
              <p className="text-sm text-gray-600">Customer Reviews</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Award className="text-yellow-600" size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {statistics.response_rate || 0}%
              </p>
              <p className="text-sm text-gray-600">Response Rate</p>
            </div>
          </div>
        )}

        {/* About Section */}
        {dealer.description && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About {dealer.business_name}</h2>
            <p className="text-gray-700 whitespace-pre-line">{dealer.description}</p>
          </div>
        )}

        {/* Active Listings */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Active Listings ({cars.length})
            </h2>
            {cars.length > 0 && (
              <button
                onClick={() => router.push(`/cars?dealer=${dealer.id}`)}
                className="text-blue-600 font-semibold hover:underline"
              >
                View All →
              </button>
            )}
          </div>

          {cars.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Car size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Listings</h3>
              <p className="text-gray-600">This dealer doesn't have any cars listed at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map((car) => (
                <div
                  key={car.id}
                  onClick={() => router.push(`/cars/${car.id}`)}
                  className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition group"
                >
                  {/* Car Image */}
                  <div className="relative aspect-video bg-gray-200">
                    {car.photos && car.photos.length > 0 ? (
                      <Image
                        src={car.photos[0]}
                        alt={`${car.year} ${car.make} ${car.model}`}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Car size={48} className="text-gray-400" />
                      </div>
                    )}

                    {/* Featured Badge */}
                    {car.is_featured && (
                      <div className="absolute top-3 left-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Car Details */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {car.year} {car.make} {car.model}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{car.trim}</p>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-blue-600">
                        ₦{car.price?.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span>{car.mileage?.toLocaleString()} km</span>
                      <span>•</span>
                      <span>{car.transmission}</span>
                      <span>•</span>
                      <span>{car.fuel_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* REVIEWS SECTION - THIS IS THE KEY INTEGRATION */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
          <ReviewsSection
            dealerId={dealer.id}
            reviewType="dealer"
          />
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 mt-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Interested in our cars?</h2>
          <p className="text-lg mb-6 opacity-90">
            Contact us today to schedule a test drive or learn more about our inventory
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition">
              Contact Dealer
            </button>
            <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white hover:text-blue-600 transition">
              View All Listings
            </button>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {dealer.is_verified && (
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <Shield size={32} className="text-green-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">Verified Dealer</p>
            </div>
          )}
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <Award size={32} className="text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Top Rated</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <Clock size={32} className="text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Fast Response</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <Star size={32} className="text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Quality Service</p>
          </div>
        </div>
      </div>
    </div>
  )
}
