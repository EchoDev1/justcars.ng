/**
 * Admin Reviews API
 * Manage and moderate reviews
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET - Fetch reviews for moderation
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'approved', 'flagged', 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
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
          photo_type
        )
      `)

    // Apply filters based on status
    if (status === 'pending') {
      query = query.eq('is_approved', false).eq('is_flagged', false)
    } else if (status === 'approved') {
      query = query.eq('is_approved', true)
    } else if (status === 'flagged') {
      query = query.eq('is_flagged', true)
    }
    // 'all' returns everything

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: reviews, error } = await query

    if (error) throw error

    // Get counts for each status
    const { data: counts } = await supabase
      .from('reviews')
      .select('is_approved, is_flagged', { count: 'exact', head: false })

    const statistics = {
      total: counts?.length || 0,
      pending: counts?.filter(r => !r.is_approved && !r.is_flagged).length || 0,
      approved: counts?.filter(r => r.is_approved).length || 0,
      flagged: counts?.filter(r => r.is_flagged).length || 0
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

// PATCH - Moderate reviews (approve, reject, flag, verify buyer)
export async function PATCH(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { reviewId, action, reason } = body

    if (!reviewId || !action) {
      return Response.json(
        { error: 'Review ID and action required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    let updateData = {
      moderated_by: user.id,
      moderated_at: new Date().toISOString()
    }

    switch (action) {
      case 'approve':
        updateData.is_approved = true
        updateData.is_flagged = false
        updateData.flag_reason = null
        break

      case 'reject':
        // Delete the review
        const { error: deleteError } = await supabase
          .from('reviews')
          .delete()
          .eq('id', reviewId)

        if (deleteError) throw deleteError

        return Response.json({ message: 'Review rejected and deleted' })

      case 'flag':
        updateData.is_flagged = true
        updateData.is_approved = false
        updateData.flag_reason = reason || 'Flagged by moderator'
        break

      case 'unflag':
        updateData.is_flagged = false
        updateData.flag_reason = null
        break

      case 'verify_buyer':
        updateData.is_verified_buyer = true
        updateData.verified_at = new Date().toISOString()
        break

      case 'unverify_buyer':
        updateData.is_verified_buyer = false
        updateData.verified_at = null
        break

      default:
        return Response.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single()

    if (error) throw error

    return Response.json({
      review: data,
      message: `Review ${action}d successfully`
    })
  } catch (error) {
    console.error('Error moderating review:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST - Dealer response to review
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('dealer-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dealer = JSON.parse(userCookie.value)
    const body = await request.json()
    const { reviewId, response } = body

    if (!reviewId || !response) {
      return Response.json(
        { error: 'Review ID and response required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Verify the review belongs to this dealer
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('dealer_id')
      .eq('id', reviewId)
      .single()

    if (reviewError) throw reviewError

    if (review.dealer_id !== dealer.id) {
      return Response.json(
        { error: 'You can only respond to your own reviews' },
        { status: 403 }
      )
    }

    // Add dealer response
    const { data, error } = await supabase
      .from('reviews')
      .update({
        dealer_response: response,
        dealer_response_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single()

    if (error) throw error

    return Response.json({
      review: data,
      message: 'Response posted successfully'
    })
  } catch (error) {
    console.error('Error posting dealer response:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete a review (admin only)
export async function DELETE(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('id')

    if (!reviewId) {
      return Response.json(
        { error: 'Review ID required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)

    if (error) throw error

    return Response.json({ message: 'Review deleted successfully' })
  } catch (error) {
    console.error('Error deleting review:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
