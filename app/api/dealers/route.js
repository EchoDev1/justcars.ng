/**
 * Dealers API - Fetch dealers list
 * GET /api/dealers - Fetch dealers with filters and pagination
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    // Filters
    const search = searchParams.get('search')
    const isVerified = searchParams.get('isVerified')
    const location = searchParams.get('location')

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient()

    let query = supabase
      .from('dealers')
      .select(`
        id,
        business_name,
        business_address,
        phone,
        email,
        is_verified,
        is_approved,
        created_at,
        cars:cars(count)
      `, { count: 'exact' })
      .eq('is_approved', true)

    // Apply filters
    if (search) {
      query = query.ilike('business_name', `%${search}%`)
    }

    if (isVerified === 'true') {
      query = query.eq('is_verified', true)
    }

    if (location) {
      query = query.ilike('business_address', `%${location}%`)
    }

    // Sort by verified first, then by name
    query = query
      .order('is_verified', { ascending: false })
      .order('business_name', { ascending: true })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: dealers, error, count } = await query

    if (error) {
      console.error('Error fetching dealers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      dealers: dealers || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (count || 0)
    })
  } catch (error) {
    console.error('Error in dealers API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
