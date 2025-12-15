/**
 * Car Comparison Page
 * Compare up to 4 cars side-by-side
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

function ComparePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carIds = searchParams.get('ids')?.split(',').filter(Boolean) || []
    if (carIds.length > 0) {
      fetchCars(carIds)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const fetchCars = async (carIds) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cars')
        .select(`
          *,
          dealers (name, phone),
          car_images (image_url, is_primary)
        `)
        .in('id', carIds)

      if (error) throw error
      setCars(data || [])
    } catch (error) {
      console.error('Error fetching cars:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPrimaryImage = (car) => {
    if (!car.car_images || car.car_images.length === 0) {
      return '/images/placeholder-car.jpg'
    }
    const primaryImage = car.car_images.find(img => img.is_primary) || car.car_images[0]
    return primaryImage.image_url || '/images/placeholder-car.jpg'
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price)
  }

  const removeCar = (carId) => {
    const newIds = cars.filter(c => c.id !== carId).map(c => c.id)
    router.push(`/compare?ids=${newIds.join(',')}`)
  }

  const comparisonFields = [
    { key: 'price', label: 'Price', format: formatPrice },
    { key: 'year', label: 'Year' },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'mileage', label: 'Mileage', format: (v) => `${v?.toLocaleString()} km` },
    { key: 'condition', label: 'Condition' },
    { key: 'body_type', label: 'Body Type' },
    { key: 'fuel_type', label: 'Fuel Type' },
    { key: 'transmission', label: 'Transmission' },
    { key: 'engine_size', label: 'Engine Size', format: (v) => v ? `${v}L` : 'N/A' },
    { key: 'color', label: 'Color' },
    { key: 'location', label: 'Location' },
    { key: 'is_verified', label: 'Verified', format: (v) => v ? <CheckCircle className="text-green-500" size={20} /> : <XCircle className="text-gray-400" size={20} /> },
    { key: 'is_featured', label: 'Featured', format: (v) => v ? <CheckCircle className="text-green-500" size={20} /> : <XCircle className="text-gray-400" size={20} /> }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comparison...</p>
        </div>
      </div>
    )
  }

  if (cars.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Plus className="w-12 h-12 text-gray-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">No Cars to Compare</h1>
          <p className="text-gray-600 mb-8">
            Start comparing cars by selecting them from the browse page
          </p>
          <Link href="/cars">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Browse Cars
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/cars" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
              <ArrowLeft size={20} className="mr-2" />
              Back to Browse
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Compare Cars</h1>
            <p className="text-gray-600 mt-2">
              Comparing {cars.length} {cars.length === 1 ? 'car' : 'cars'} • Max 4 cars
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              {/* Car Images Row */}
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-48">
                    Specifications
                  </th>
                  {cars.map((car) => (
                    <th key={car.id} className="px-6 py-4 relative">
                      <div className="space-y-4">
                        {/* Remove Button */}
                        <button
                          onClick={() => removeCar(car.id)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition z-10"
                        >
                          <X size={16} />
                        </button>

                        {/* Car Image */}
                        <div className="relative h-48 bg-gray-200 rounded-lg overflow-hidden">
                          <Image
                            src={getPrimaryImage(car)}
                            alt={`${car.year} ${car.make} ${car.model}`}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Car Title */}
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">
                            {car.year} {car.make}
                          </h3>
                          <p className="text-gray-600">{car.model}</p>
                        </div>

                        {/* View Details Button */}
                        <Link href={`/cars/${car.id}`}>
                          <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm">
                            View Details
                          </button>
                        </Link>
                      </div>
                    </th>
                  ))}
                  {/* Empty slots */}
                  {[...Array(4 - cars.length)].map((_, index) => (
                    <th key={`empty-${index}`} className="px-6 py-4">
                      <div className="h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <div className="text-center">
                          <Plus className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Add Car</p>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Comparison Rows */}
              <tbody className="bg-white divide-y divide-gray-200">
                {comparisonFields.map((field, index) => (
                  <tr key={field.key} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {field.label}
                    </td>
                    {cars.map((car) => (
                      <td key={car.id} className="px-6 py-4 text-sm text-gray-700">
                        {field.format
                          ? field.format(car[field.key])
                          : car[field.key] || 'N/A'}
                      </td>
                    ))}
                    {[...Array(4 - cars.length)].map((_, emptyIndex) => (
                      <td key={`empty-${emptyIndex}`} className="px-6 py-4 text-sm text-gray-400">
                        -
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/cars">
            <button className="bg-white text-gray-700 px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition">
              Browse More Cars
            </button>
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Print Comparison
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .comparison-table,
          .comparison-table * {
            visibility: visible;
          }
          .comparison-table {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  )
}
