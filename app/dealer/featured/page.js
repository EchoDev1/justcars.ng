/**
 * Featured Listings Purchase & Management Page
 * Allows dealers to promote their cars with featured placements
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Star,
  TrendingUp,
  Eye,
  Zap,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Package,
  Sparkles,
  BarChart,
  Clock,
  CreditCard
} from 'lucide-react'
import { openPaymentModal, generateReference, formatNaira, FEATURED_PRICING } from '@/lib/payments'
import Image from 'next/image'

export default function FeaturedListingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [dealer, setDealer] = useState(null)
  const [dealerCars, setDealerCars] = useState([])
  const [activeFeatured, setActiveFeatured] = useState([])
  const [selectedCar, setSelectedCar] = useState(null)
  const [featureType, setFeatureType] = useState('single') // single or monthly
  const [duration, setDuration] = useState(7) // days for single
  const [priorityLevel, setPriorityLevel] = useState(5)
  const [customPrice, setCustomPrice] = useState(FEATURED_PRICING.single.default)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchDealerData()
  }, [])

  const fetchDealerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/dealer/auth')
        return
      }

      // Fetch dealer data
      const { data: dealerData, error: dealerError } = await supabase
        .from('dealers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (dealerError) throw dealerError

      setDealer(dealerData)

      // Fetch dealer's cars
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select(`
          *,
          car_images (image_url, is_primary)
        `)
        .eq('dealer_id', user.id)
        .order('created_at', { ascending: false })

      if (carsError) throw carsError

      setDealerCars(carsData || [])

      // Fetch active featured listings
      const { data: featuredData, error: featuredError } = await supabase
        .from('featured_listings')
        .select(`
          *,
          cars (make, model, year, car_images (image_url, is_primary))
        `)
        .eq('dealer_id', user.id)
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (featuredError) throw featuredError

      setActiveFeatured(featuredData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dealer data:', error)
      setError('Failed to load dealer information')
      setLoading(false)
    }
  }

  const calculatePrice = () => {
    if (featureType === 'single') {
      // Price based on duration and priority
      const basePrice = FEATURED_PRICING.single.default
      const durationMultiplier = duration / 7 // 1 week base
      const priorityMultiplier = priorityLevel / 5 // Mid priority base
      return Math.round(basePrice * durationMultiplier * priorityMultiplier)
    } else {
      // Monthly package
      return FEATURED_PRICING.monthly.default
    }
  }

  const handleFeatureCar = async () => {
    if (!selectedCar) {
      setError('Please select a car to feature')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const price = calculatePrice()
      const reference = generateReference('FEATURED')

      // Calculate dates
      const startDate = new Date()
      const endDate = new Date()
      if (featureType === 'single') {
        endDate.setDate(endDate.getDate() + duration)
      } else {
        endDate.setDate(endDate.getDate() + 30)
      }

      openPaymentModal({
        email: dealer.email,
        amount: price,
        reference,
        metadata: {
          dealer_id: dealer.id,
          transaction_type: 'featured_listing',
          car_id: selectedCar,
          feature_type: featureType,
          duration: featureType === 'single' ? duration : 30,
          priority_level: priorityLevel,
          dealer_name: dealer.name
        },
        onSuccess: async (response) => {
          try {
            // Record payment transaction
            await supabase
              .from('payment_transactions')
              .insert({
                transaction_type: 'featured_listing',
                payer_id: dealer.id,
                payer_type: 'dealer',
                amount: price,
                currency: 'NGN',
                payment_gateway: 'paystack',
                payment_reference: reference,
                gateway_reference: response.reference,
                status: 'successful',
                related_entity_type: 'featured_listing',
                related_entity_id: selectedCar
              })

            // Create featured listing
            await supabase
              .from('featured_listings')
              .insert({
                car_id: selectedCar,
                dealer_id: dealer.id,
                feature_type: featureType,
                price_paid: price,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                priority_level: priorityLevel,
                payment_reference: reference,
                payment_date: new Date().toISOString()
              })

            setSuccess(`Car featured successfully! It will appear at the top of search results.`)
            setProcessing(false)
            setSelectedCar(null)

            // Reload data
            setTimeout(() => {
              fetchDealerData()
            }, 2000)
          } catch (error) {
            console.error('Error creating featured listing:', error)
            setError('Payment successful but failed to activate featured listing. Please contact support.')
            setProcessing(false)
          }
        },
        onClose: () => {
          setProcessing(false)
        }
      })
    } catch (error) {
      console.error('Payment error:', error)
      setError('Failed to initiate payment. Please try again.')
      setProcessing(false)
    }
  }

  const handlePauseFeatured = async (featureId) => {
    try {
      await supabase
        .from('featured_listings')
        .update({ status: 'paused' })
        .eq('id', featureId)

      setSuccess('Featured listing paused')
      fetchDealerData()
    } catch (error) {
      console.error('Error pausing featured:', error)
      setError('Failed to pause featured listing')
    }
  }

  const handleResumeFeatured = async (featureId) => {
    try {
      await supabase
        .from('featured_listings')
        .update({ status: 'active' })
        .eq('id', featureId)

      setSuccess('Featured listing resumed')
      fetchDealerData()
    } catch (error) {
      console.error('Error resuming featured:', error)
      setError('Failed to resume featured listing')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  const calculatedPrice = calculatePrice()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-yellow-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold text-white mb-4">
            Featured Listings
          </h1>
          <p className="text-xl text-orange-100 mb-8">
            Boost your car's visibility and get more buyers faster
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-white">{activeFeatured.length}</div>
              <div className="text-sm text-orange-100">Active Featured</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-white">{dealerCars.length}</div>
              <div className="text-sm text-orange-100">Your Cars</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-white">5x</div>
              <div className="text-sm text-orange-100">Visibility Boost</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 flex items-center gap-3 text-red-300">
            <AlertCircle size={24} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 flex items-center gap-3 text-green-300">
            <CheckCircle size={24} />
            <span>{success}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Feature a Car */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Star size={28} className="text-yellow-400" />
                Feature a Car
              </h2>

              {/* Select Car */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Select Car</label>
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {dealerCars.map((car) => {
                    const primaryImage = car.car_images?.find(img => img.is_primary) || car.car_images?.[0]
                    const imageUrl = primaryImage?.image_url || '/images/placeholder-car.jpg'
                    const isSelected = selectedCar === car.id
                    const isFeatured = activeFeatured.some(f => f.car_id === car.id)

                    return (
                      <button
                        key={car.id}
                        onClick={() => setSelectedCar(car.id)}
                        disabled={isFeatured}
                        className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-yellow-500 bg-yellow-500/20'
                            : isFeatured
                            ? 'border-gray-600 bg-gray-700/50 cursor-not-allowed opacity-50'
                            : 'border-white/10 bg-white/5 hover:border-yellow-500/50'
                        }`}
                      >
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={imageUrl}
                            alt={`${car.make} ${car.model}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-white">
                            {car.year} {car.make} {car.model}
                          </div>
                          <div className="text-sm text-gray-300">{formatNaira(car.price)}</div>
                          {isFeatured && (
                            <div className="text-xs text-yellow-400 mt-1">Already Featured</div>
                          )}
                        </div>
                        {isSelected && <CheckCircle size={24} className="text-yellow-400" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Feature Type */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">Feature Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFeatureType('single')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      featureType === 'single'
                        ? 'border-yellow-500 bg-yellow-500/20'
                        : 'border-white/10 bg-white/5 hover:border-yellow-500/50'
                    }`}
                  >
                    <Zap size={24} className="text-yellow-400 mx-auto mb-2" />
                    <div className="font-semibold text-white">Single Listing</div>
                    <div className="text-xs text-gray-300 mt-1">₦3k - ₦10k</div>
                  </button>

                  <button
                    onClick={() => setFeatureType('monthly')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      featureType === 'monthly'
                        ? 'border-yellow-500 bg-yellow-500/20'
                        : 'border-white/10 bg-white/5 hover:border-yellow-500/50'
                    }`}
                  >
                    <Package size={24} className="text-purple-400 mx-auto mb-2" />
                    <div className="font-semibold text-white">Monthly Package</div>
                    <div className="text-xs text-gray-300 mt-1">₦15k - ₦50k</div>
                  </button>
                </div>
              </div>

              {/* Duration (for single) */}
              {featureType === 'single' && (
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-3">
                    Duration: {duration} days
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>3 days</span>
                    <span>30 days</span>
                  </div>
                </div>
              )}

              {/* Priority Level */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-3">
                  Priority Level: {priorityLevel}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={priorityLevel}
                  onChange={(e) => setPriorityLevel(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
                <div className="text-xs text-gray-300 mt-2">
                  Higher priority = Better placement in search results
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-300">Feature Type:</span>
                  <span className="text-white font-semibold capitalize">{featureType}</span>
                </div>
                {featureType === 'single' && (
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-300">Duration:</span>
                    <span className="text-white font-semibold">{duration} days</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-300">Priority Level:</span>
                  <span className="text-white font-semibold">{priorityLevel}/10</span>
                </div>
                <div className="border-t border-yellow-500/30 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-lg">Total Price:</span>
                    <span className="text-yellow-400 font-bold text-2xl">
                      {formatNaira(calculatedPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature Button */}
              <button
                onClick={handleFeatureCar}
                disabled={!selectedCar || processing}
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {processing ? (
                  'Processing...'
                ) : (
                  <>
                    <CreditCard className="inline mr-2" size={20} />
                    Pay {formatNaira(calculatedPrice)} & Feature Car
                  </>
                )}
              </button>
            </div>

            {/* Benefits */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Featured Benefits</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-gray-300">
                  <TrendingUp size={20} className="text-green-400 flex-shrink-0 mt-1" />
                  <span>Appear at the top of search results</span>
                </div>
                <div className="flex items-start gap-3 text-gray-300">
                  <Eye size={20} className="text-blue-400 flex-shrink-0 mt-1" />
                  <span>5x more visibility than regular listings</span>
                </div>
                <div className="flex items-start gap-3 text-gray-300">
                  <Sparkles size={20} className="text-yellow-400 flex-shrink-0 mt-1" />
                  <span>Featured badge on your listing</span>
                </div>
                <div className="flex items-start gap-3 text-gray-300">
                  <BarChart size={20} className="text-purple-400 flex-shrink-0 mt-1" />
                  <span>Detailed analytics on views & inquiries</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Active Featured Listings */}
          <div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">
                Active Featured Listings ({activeFeatured.length})
              </h2>

              {activeFeatured.length === 0 ? (
                <div className="text-center py-12">
                  <Star size={64} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No active featured listings</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Feature a car to boost its visibility
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeFeatured.map((featured) => {
                    const car = featured.cars
                    const primaryImage = car.car_images?.find(img => img.is_primary) || car.car_images?.[0]
                    const imageUrl = primaryImage?.image_url || '/images/placeholder-car.jpg'
                    const daysLeft = Math.ceil((new Date(featured.end_date) - new Date()) / (1000 * 60 * 60 * 24))

                    return (
                      <div
                        key={featured.id}
                        className="bg-white/5 border border-yellow-500/30 rounded-xl p-4"
                      >
                        <div className="flex gap-4 mb-4">
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={imageUrl}
                              alt={`${car.make} ${car.model}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-white mb-1">
                              {car.year} {car.make} {car.model}
                            </div>
                            <div className="text-sm text-gray-300 mb-2">
                              Priority: {featured.priority_level}/10
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className="flex items-center gap-1 text-yellow-400">
                                <Clock size={14} />
                                <span>{daysLeft} days left</span>
                              </div>
                              <div className="flex items-center gap-1 text-blue-400">
                                <Eye size={14} />
                                <span>{featured.views_count || 0} views</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-white/5 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-white">{featured.views_count || 0}</div>
                            <div className="text-xs text-gray-400">Views</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-white">{featured.clicks_count || 0}</div>
                            <div className="text-xs text-gray-400">Clicks</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-white">{featured.inquiries_count || 0}</div>
                            <div className="text-xs text-gray-400">Inquiries</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {featured.status === 'active' ? (
                            <button
                              onClick={() => handlePauseFeatured(featured.id)}
                              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
                            >
                              Pause
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResumeFeatured(featured.id)}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                            >
                              Resume
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
