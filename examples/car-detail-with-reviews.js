/**
 * Example: Car Detail Page with Reviews Integration
 * This shows how to integrate the ReviewsSection component into a car detail page
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import {
  Calendar,
  Gauge,
  Fuel,
  Settings,
  MapPin,
  Phone,
  Mail,
  Share2,
  Heart,
  Eye
} from 'lucide-react'
import ReviewsSection from '@/components/ui/ReviewsSection'

export default function CarDetailPage() {
  const params = useParams()
  const [car, setCar] = useState(null)
  const [dealer, setDealer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCarDetails()
  }, [params.id])

  const fetchCarDetails = async () => {
    try {
      // Fetch car data
      const carResponse = await fetch(`/api/cars/${params.id}`)
      if (carResponse.ok) {
        const carData = await carResponse.json()
        setCar(carData)

        // Fetch dealer data
        if (carData.dealer_id) {
          const dealerResponse = await fetch(`/api/dealers/${carData.dealer_id}`)
          if (dealerResponse.ok) {
            const dealerData = await dealerResponse.json()
            setDealer(dealerData)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching car:', error)
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

  if (!car) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Car Not Found</h1>
          <p className="text-gray-600">The car you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Car Images Gallery */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {car.photos && car.photos.length > 0 ? (
              <>
                <div className="relative aspect-video md:col-span-2">
                  <Image
                    src={car.photos[0]}
                    alt={`${car.year} ${car.make} ${car.model}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
                {car.photos.slice(1, 5).map((photo, index) => (
                  <div key={index} className="relative aspect-video">
                    <Image
                      src={photo}
                      alt={`Car photo ${index + 2}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                ))}
              </>
            ) : (
              <div className="bg-gray-200 aspect-video flex items-center justify-center rounded-lg md:col-span-2">
                <p className="text-gray-500">No photos available</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Car Title & Price */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {car.year} {car.make} {car.model}
                  </h1>
                  <p className="text-gray-600">{car.trim}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition">
                    <Heart size={20} />
                  </button>
                  <button className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-4xl font-bold text-blue-600">
                  ₦{car.price?.toLocaleString()}
                </span>
                {car.original_price && car.original_price > car.price && (
                  <span className="text-xl text-gray-500 line-through">
                    ₦{car.original_price.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={20} />
                  <span>{car.year}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Gauge size={20} />
                  <span>{car.mileage?.toLocaleString()} km</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Fuel size={20} />
                  <span>{car.fuel_type}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Settings size={20} />
                  <span>{car.transmission}</span>
                </div>
              </div>
            </div>

            {/* Car Description */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">{car.description}</p>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Specifications</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Make</p>
                  <p className="font-semibold text-gray-900">{car.make}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Model</p>
                  <p className="font-semibold text-gray-900">{car.model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Year</p>
                  <p className="font-semibold text-gray-900">{car.year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mileage</p>
                  <p className="font-semibold text-gray-900">{car.mileage?.toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transmission</p>
                  <p className="font-semibold text-gray-900">{car.transmission}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fuel Type</p>
                  <p className="font-semibold text-gray-900">{car.fuel_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Body Type</p>
                  <p className="font-semibold text-gray-900">{car.body_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Color</p>
                  <p className="font-semibold text-gray-900">{car.color}</p>
                </div>
              </div>
            </div>

            {/* REVIEWS SECTION - THIS IS THE KEY INTEGRATION */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <ReviewsSection
                carId={car.id}
                dealerId={car.dealer_id}
                reviewType="car"
              />
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Dealer Card */}
            {dealer && (
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Sold by</h3>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">
                      {dealer.business_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{dealer.business_name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {/* Add rating display here */}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin size={16} className="mt-1 flex-shrink-0" />
                    <span>{dealer.business_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone size={16} />
                    <span>{dealer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail size={16} />
                    <span>{dealer.email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                    Contact Dealer
                  </button>
                  <button className="w-full bg-white text-blue-600 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition">
                    View All Listings
                  </button>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Eye size={16} />
                    <span className="text-sm">Views</span>
                  </div>
                  <span className="font-bold text-gray-900">{car.view_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Heart size={16} />
                    <span className="text-sm">Saved</span>
                  </div>
                  <span className="font-bold text-gray-900">{car.save_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
