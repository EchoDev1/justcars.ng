/**
 * Admin Reviews Moderation Page
 * Approve, reject, flag reviews and verify buyers
 */

'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle,
  XCircle,
  Flag,
  Star,
  Camera,
  Shield,
  Eye,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import Image from 'next/image'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedReview, setSelectedReview] = useState(null)
  const [flagReason, setFlagReason] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [activeTab])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/reviews?status=${activeTab}&limit=50`)
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

  const handleAction = async (reviewId, action, reason = null) => {
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          action,
          reason
        })
      })

      if (response.ok) {
        // Refresh the list
        fetchReviews()
        setSelectedReview(null)
        setFlagReason('')
      }
    } catch (error) {
      console.error('Error performing action:', error)
    }
  }

  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/reviews?id=${reviewId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchReviews()
      }
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  const tabs = [
    { id: 'pending', label: 'Pending', count: statistics?.pending },
    { id: 'approved', label: 'Approved', count: statistics?.approved },
    { id: 'flagged', label: 'Flagged', count: statistics?.flagged },
    { id: 'all', label: 'All Reviews', count: statistics?.total }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Moderation</h1>
          <p className="text-gray-600">
            Review and moderate customer reviews for dealers and cars
          </p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Star className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{statistics.pending}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <AlertTriangle className="text-yellow-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{statistics.approved}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Flagged</p>
                  <p className="text-3xl font-bold text-red-600">{statistics.flagged}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <Flag className="text-red-600" size={24} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Star size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Reviews</h3>
            <p className="text-gray-600">No reviews found in this category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`bg-white rounded-xl shadow-sm p-6 ${
                  review.is_flagged ? 'border-2 border-red-200' : ''
                }`}
              >
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">
                          {review.buyer_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{review.buyer_name}</p>
                          {review.is_verified_buyer && (
                            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                              <Shield size={12} />
                              Verified
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {review.review_type === 'dealer' ? 'Dealer Review' : 'Car Review'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(review.rating)}
                          <span className="text-sm text-gray-500">
                            {new Date(review.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review Content */}
                    <h4 className="font-bold text-gray-900 mb-2">{review.title}</h4>
                    <p className="text-gray-700 mb-3">{review.review_text}</p>

                    {/* Review Photos */}
                    {review.review_photos && review.review_photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {review.review_photos.slice(0, 4).map((photo) => (
                          <div
                            key={photo.id}
                            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                          >
                            <Image
                              src={photo.thumbnail_url || photo.photo_url}
                              alt={photo.caption || 'Review photo'}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Flag Reason */}
                    {review.is_flagged && review.flag_reason && (
                      <div className="bg-red-50 border-l-4 border-red-600 p-3 mb-3">
                        <p className="text-sm font-semibold text-red-900 mb-1">
                          <Flag size={14} className="inline mr-1" />
                          Flagged Reason:
                        </p>
                        <p className="text-sm text-red-800">{review.flag_reason}</p>
                      </div>
                    )}

                    {/* Helpfulness Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>👍 {review.helpful_count || 0} helpful</span>
                      <span>👎 {review.not_helpful_count || 0} not helpful</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 ml-4">
                    {!review.is_approved && !review.is_flagged && (
                      <>
                        <button
                          onClick={() => handleAction(review.id, 'approve')}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => setSelectedReview(review.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                        >
                          <Flag size={16} />
                          Flag
                        </button>
                      </>
                    )}

                    {review.is_approved && (
                      <button
                        onClick={() => handleAction(review.id, 'flag')}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                      >
                        <Flag size={16} />
                        Flag
                      </button>
                    )}

                    {review.is_flagged && (
                      <>
                        <button
                          onClick={() => handleAction(review.id, 'approve')}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(review.id, 'unflag')}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                        >
                          <Eye size={16} />
                          Unflag
                        </button>
                      </>
                    )}

                    {!review.is_verified_buyer && (
                      <button
                        onClick={() => handleAction(review.id, 'verify_buyer')}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                      >
                        <Shield size={16} />
                        Verify
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(review.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Flag Reason Modal */}
                {selectedReview === review.id && (
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Flag Reason
                    </label>
                    <textarea
                      value={flagReason}
                      onChange={(e) => setFlagReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-3"
                      rows="3"
                      placeholder="Enter reason for flagging this review..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleAction(review.id, 'flag', flagReason)
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
                      >
                        Submit Flag
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReview(null)
                          setFlagReason('')
                        }}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
