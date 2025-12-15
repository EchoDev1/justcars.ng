/**
 * Dealer Statistics API
 * GET /api/dealers/[id]/statistics - Fetch dealer statistics
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Dealer ID required' }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch reviews statistics
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating, dealer_response')
      .eq('dealer_id', id)
      .eq('is_approved', true)

    const totalReviews = reviews?.length || 0
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0

    const responsesCount = reviews?.filter(r => r.dealer_response).length || 0
    const responseRate = totalReviews > 0 ? (responsesCount / totalReviews) * 100 : 0

    // Fetch cars count
    const { count: activeCars } = await supabase
      .from('cars')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', id)
      .eq('status', 'active')

    // Fetch total sales (sold cars)
    const { count: totalSales } = await supabase
      .from('cars')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', id)
      .eq('status', 'sold')

    return NextResponse.json({
      total_reviews: totalReviews,
      average_rating: Math.round(averageRating * 10) / 10,
      response_rate: Math.round(responseRate),
      active_cars: activeCars || 0,
      total_sales: totalSales || 0
    })
  } catch (error) {
    console.error('Error fetching dealer statistics:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
