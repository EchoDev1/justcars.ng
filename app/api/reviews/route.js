/**
 * Reviews API
 * Handle dealer and car reviews
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET - Fetch reviews (with filters)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dealerId = searchParams.get('dealerId')
    const carId = searchParams.get('carId')
    const reviewType = searchParams.get('type') // 'dealer' or 'car'
    const sortBy = searchParams.get('sortBy') || 'recent' // 'recent', 'helpful', 'rating_high', 'rating_low'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient()

    let query = supabase
      .from('reviews')
      .select(`
        *,
        review_photos (
          id,
          photo_url,
          thumbnail_url,
          caption,
          photo_type,
          display_order
        )
      `)
      .eq('is_approved', true)

    // Apply filters
    if (dealerId) query = query.eq('dealer_id', dealerId)
    if (carId) query = query.eq('car_id', carId)
    if (reviewType) query = query.eq('review_type', reviewType)

    // Apply sorting
    if (sortBy === 'helpful') {
      query = query.order('helpful_count', { ascending: false })
    } else if (sortBy === 'rating_high') {
      query = query.order('rating', { ascending: false })
    } else if (sortBy === 'rating_low') {
      query = query.order('rating', { ascending: true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: reviews, error } = await query

    if (error) throw error

    // Calculate statistics
    const { data: stats } = await supabase
      .from('reviews')
      .select('rating')
      .eq('is_approved', true)
      .eq(dealerId ? 'dealer_id' : 'car_id', dealerId || carId)

    let statistics = null
    if (stats && stats.length > 0) {
      const totalReviews = stats.length
      const avgRating = stats.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      const ratingDistribution = {
        5: stats.filter(r => r.rating === 5).length,
        4: stats.filter(r => r.rating === 4).length,
        3: stats.filter(r => r.rating === 3).length,
        2: stats.filter(r => r.rating === 2).length,
        1: stats.filter(r => r.rating === 1).length
      }

      statistics = {
        totalReviews,
        averageRating: Math.round(avgRating * 10) / 10,
        ratingDistribution
      }
    }

    return Response.json({
      reviews: reviews || [],
      statistics,
      hasMore: reviews && reviews.length === limit
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new review
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const body = await request.json()

    const {
      review_type,
      dealer_id,
      car_id,
      rating,
      title,
      review_text,
      photos,
      purchase_date,
      purchase_price
    } = body

    // Validation
    if (!review_type || !rating || !title || !review_text) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return Response.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (review_type === 'dealer' && !dealer_id) {
      return Response.json(
        { error: 'Dealer ID required for dealer reviews' },
        { status: 400 }
      )
    }

    if (review_type === 'car' && (!car_id || !dealer_id)) {
      return Response.json(
        { error: 'Car ID and Dealer ID required for car reviews' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if user has already reviewed this dealer/car
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('buyer_id', user.id)
      .eq(review_type === 'dealer' ? 'dealer_id' : 'car_id', review_type === 'dealer' ? dealer_id : car_id)
      .single()

    if (existing) {
      return Response.json(
        { error: 'You have already reviewed this ' + review_type },
        { status: 400 }
      )
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        review_type,
        dealer_id: review_type === 'dealer' ? dealer_id : (review_type === 'car' ? dealer_id : null),
        car_id: review_type === 'car' ? car_id : null,
        buyer_id: user.id,
        buyer_name: user.name || user.email,
        buyer_email: user.email,
        rating,
        title,
        review_text,
        purchase_date,
        purchase_price,
        is_verified_buyer: false, // Will be verified by admin
        is_approved: false // Requires moderation
      })
      .select()
      .single()

    if (reviewError) throw reviewError

    // Upload photos if provided
    if (photos && photos.length > 0) {
      const photoRecords = photos.map((photo, index) => ({
        review_id: review.id,
        photo_url: photo.url,
        thumbnail_url: photo.thumbnailUrl,
        caption: photo.caption,
        photo_type: photo.type || 'delivery',
        display_order: index
      }))

      const { error: photosError } = await supabase
        .from('review_photos')
        .insert(photoRecords)

      if (photosError) {
        console.error('Error uploading review photos:', photosError)
      }
    }

    return Response.json({
      review,
      message: 'Review submitted successfully! It will appear after moderation.'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Vote on review (helpful/not helpful)
export async function PATCH(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const body = await request.json()
    const { review_id, vote_type } = body

    if (!review_id || !vote_type) {
      return Response.json(
        { error: 'Review ID and vote type required' },
        { status: 400 }
      )
    }

    if (!['helpful', 'not_helpful'].includes(vote_type)) {
      return Response.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('review_votes')
      .select('id, vote_type')
      .eq('review_id', review_id)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Remove vote if same type
        await supabase
          .from('review_votes')
          .delete()
          .eq('id', existingVote.id)

        return Response.json({ message: 'Vote removed' })
      } else {
        // Update vote if different type
        await supabase
          .from('review_votes')
          .update({ vote_type })
          .eq('id', existingVote.id)

        return Response.json({ message: 'Vote updated' })
      }
    }

    // Create new vote
    const { error } = await supabase
      .from('review_votes')
      .insert({
        review_id,
        user_id: user.id,
        vote_type
      })

    if (error) throw error

    return Response.json({ message: 'Vote recorded' })
  } catch (error) {
    console.error('Error voting on review:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
