/**
 * Reviews Section Component
 * Display dealer/car reviews with ratings, photos, and helpfulness voting
 */

'use client'

import { useState, useEffect } from 'react'
import { Star, ThumbsUp, ThumbsDown, Camera, CheckCircle, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

export default function ReviewsSection({ dealerId, carId, reviewType = 'dealer' }) {
  const [reviews, setReviews] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('recent')
  const [showReviewForm, setShowReviewForm] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [dealerId, carId, sortBy])

  const fetchReviews = async () => {
    try {
      const params = new URLSearchParams({
        type: reviewType,
        sortBy,
        limit: '20'
      })

      if (dealerId) params.append('dealerId', dealerId)
      if (carId) params.append('carId', carId)

      const response = await fetch(`/api/reviews?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (reviewId, voteType) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId, vote_type: voteType })
      })

      if (response.ok) {
        // Refresh reviews to show updated counts
        fetchReviews()
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  const renderStars = (rating, size = 20) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 3.5) return 'text-blue-600'
    if (rating >= 2.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading reviews...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Header */}
      {statistics && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <span className={`text-5xl font-bold ${getRatingColor(statistics.averageRating)}`}>
                  {statistics.averageRating.toFixed(1)}
                </span>
                <div>
                  {renderStars(Math.round(statistics.averageRating), 24)}
                  <p className="text-sm text-gray-600 mt-1">
                    Based on {statistics.totalReviews} {statistics.totalReviews === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = statistics.ratingDistribution[rating] || 0
                const percentage = statistics.totalReviews > 0
                  ? (count / statistics.totalReviews) * 100
                  : 0

                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-8">{rating}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sort & Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">
          Customer Reviews ({reviews.length})
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="recent">Most Recent</option>
          <option value="helpful">Most Helpful</option>
          <option value="rating_high">Highest Rating</option>
          <option value="rating_low">Lowest Rating</option>
        </select>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Star size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Reviews Yet</h3>
          <p className="text-gray-600 mb-4">Be the first to review this {reviewType}!</p>
          <button
            onClick={() => setShowReviewForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Write a Review
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">
                      {review.buyer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{review.buyer_name}</p>
                      {review.is_verified_buyer && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                          <CheckCircle size={12} />
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating, 16)}
                      <span className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <h4 className="font-bold text-gray-900 mb-2">{review.title}</h4>
              <p className="text-gray-700 mb-4">{review.review_text}</p>

              {/* Review Photos */}
              {review.review_photos && review.review_photos.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                  {review.review_photos.slice(0, 5).map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition"
                    >
                      <Image
                        src={photo.thumbnail_url || photo.photo_url}
                        alt={photo.caption || 'Review photo'}
                        fill
                        className="object-cover"
                      />
                      {photo.photo_type === 'delivery' && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white p-1 rounded">
                          <Camera size={12} />
                        </div>
                      )}
                    </div>
                  ))}
                  {review.review_photos.length > 5 && (
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition">
                      <div className="text-center">
                        <ImageIcon size={24} className="text-gray-600 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-gray-600">
                          +{review.review_photos.length - 5}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Purchase Info */}
              {review.purchase_date && (
                <p className="text-sm text-gray-600 mb-4">
                  Purchased on {new Date(review.purchase_date).toLocaleDateString()}
                  {review.purchase_price && ` • ₦${review.purchase_price.toLocaleString()}`}
                </p>
              )}

              {/* Dealer Response */}
              {review.dealer_response && (
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Dealer Response:</p>
                  <p className="text-sm text-blue-800">{review.dealer_response}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {new Date(review.dealer_response_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Helpfulness Voting */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">Was this review helpful?</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(review.id, 'helpful')}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 transition text-sm"
                  >
                    <ThumbsUp size={16} />
                    <span>{review.helpful_count || 0}</span>
                  </button>
                  <button
                    onClick={() => handleVote(review.id, 'not_helpful')}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 transition text-sm"
                  >
                    <ThumbsDown size={16} />
                    <span>{review.not_helpful_count || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write Review Button (if reviews exist) */}
      {reviews.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => setShowReviewForm(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Write a Review
          </button>
        </div>
      )}
    </div>
  )
}
