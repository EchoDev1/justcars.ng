/**
 * Public Just Arrived Cars Page
 * Browse all newly arrived cars
 */

'use client'

import { useState, useEffect, Suspense, memo, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import CarCard from '@/components/cars/CarCard'
import SearchBar from '@/components/cars/SearchBar'
import Loading from '@/components/ui/Loading'
import { Clock, Zap, ChevronLeft, ChevronRight } from 'lucide-react'

// Memoized car card component for better performance
const MemoizedCarCard = memo(CarCard)

const CARS_PER_PAGE = 12 // 3 rows of 4 cars on large screens

function JustArrivedContent() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Memoize supabase client
  const supabase = useMemo(() => createClient(), [])

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / CARS_PER_PAGE)
  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  const fetchJustArrivedCars = useCallback(async () => {
    setLoading(true)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      // Calculate range for pagination
      const from = (currentPage - 1) * CARS_PER_PAGE
      const to = from + CARS_PER_PAGE - 1

      // Build base query
      let baseQuery = supabase
        .from('cars')
        .select('*', { count: 'exact' })
        .eq('is_just_arrived', true)

      // Apply search if provided
      if (searchTerm) {
        baseQuery = baseQuery.or(`make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
      }

      // Fetch data with pagination
      let query = supabase
        .from('cars')
        .select(`
          id,
          make,
          model,
          year,
          price,
          mileage,
          location,
          condition,
          just_arrived_date,
          created_at,
          dealers (name, badge_type, is_verified),
          car_images (image_url, is_primary)
        `, { count: 'exact' })
        .eq('is_just_arrived', true)

      // Apply search if provided
      if (searchTerm) {
        query = query.or(`make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
      }

      // Order by just_arrived_date descending (newest first) and apply pagination
      query = query
        .order('just_arrived_date', { ascending: false })
        .range(from, to)

      const { data, error, count } = await query

      clearTimeout(timeoutId)

      if (error) {
        console.error('Error fetching just arrived cars:', error)
        setCars([])
        setTotalCount(0)
        return
      }

      setCars(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Fatal error fetching just arrived cars:', err)
      setCars([])
      setTotalCount(0)
    } finally {
      // CRITICAL: Always reset loading state
      setLoading(false)
    }
  }, [searchTerm, currentPage, supabase])

  useEffect(() => {
    fetchJustArrivedCars()
  }, [fetchJustArrivedCars])

  const handleSearch = useCallback((term) => {
    setSearchTerm(term)
    setCurrentPage(1) // Reset to first page on new search
  }, [])

  const handleNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [hasNextPage])

  const handlePreviousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [hasPreviousPage])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="text-accent-blue" size={40} />
            <h1 className="text-4xl font-bold text-gray-900">Just Arrived</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Fresh arrivals updated daily. Be the first to discover these premium vehicles.
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <Clock size={16} />
            <span>{totalCount} newly arrived car{totalCount !== 1 ? 's' : ''} available</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} initialValue={searchTerm} />
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
          <div className="flex">
            <Zap className="text-blue-500 mr-3 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-sm font-medium text-gray-900">New Arrivals</h3>
              <p className="text-sm text-gray-700 mt-1">
                These cars have just arrived in our inventory. Don't miss out on these fresh listings!
              </p>
            </div>
          </div>
        </div>

        {/* Cars Grid - Full Width Display with 4 columns on large screens */}
        {loading ? (
          <Loading text="Loading just arrived cars..." />
        ) : cars.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="mx-auto text-gray-300 mb-4" size={80} />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Just Arrived Cars</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? 'No cars match your search. Try different keywords.'
                : 'Check back soon for new arrivals!'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cars.map((car) => (
                <MemoizedCarCard key={car.id} car={car} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 mb-8">
                <div className="flex items-center justify-between border-t border-gray-200 pt-8">
                  {/* Page Info */}
                  <div className="flex-1 flex justify-center sm:justify-start">
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-semibold">{currentPage}</span> of{' '}
                      <span className="font-semibold">{totalPages}</span>
                      <span className="hidden sm:inline">
                        {' '}({totalCount} total car{totalCount !== 1 ? 's' : ''})
                      </span>
                    </p>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={!hasPreviousPage}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition
                        ${hasPreviousPage
                          ? 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-500'
                          : 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      <ChevronLeft size={20} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    <button
                      onClick={handleNextPage}
                      disabled={!hasNextPage}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition
                        ${hasNextPage
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                          : 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                {/* Page Numbers (optional - shows on larger screens) */}
                <div className="hidden md:flex justify-center gap-2 mt-6">
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNum = index + 1
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)

                    // Show ellipsis
                    const showEllipsisBefore = pageNum === currentPage - 2 && currentPage > 3
                    const showEllipsisAfter = pageNum === currentPage + 2 && currentPage < totalPages - 2

                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <span key={pageNum} className="px-2 text-gray-400">
                          ...
                        </span>
                      )
                    }

                    if (!showPage) return null

                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className={`
                          w-10 h-10 rounded-lg font-semibold transition
                          ${pageNum === currentPage
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-500'
                          }
                        `}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function JustArrivedPage() {
  return (
    <Suspense fallback={<Loading text="Loading just arrived cars..." />}>
      <JustArrivedContent />
    </Suspense>
  )
}
