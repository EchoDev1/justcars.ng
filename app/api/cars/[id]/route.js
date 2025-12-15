/**
 * Car Detail API
 * GET /api/cars/[id] - Fetch single car details
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Car ID required' }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch car with dealer information
    const { data: car, error } = await supabase
      .from('cars')
      .select(`
        *,
        dealer:dealers (
          id,
          business_name,
          business_address,
          phone,
          email,
          is_verified,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Car not found' }, { status: 404 })
      }
      throw error
    }

    // Increment view count
    await supabase
      .from('cars')
      .update({ view_count: (car.view_count || 0) + 1 })
      .eq('id', id)

    // Fetch similar cars (same make, different ID)
    const { data: similarCars } = await supabase
      .from('cars')
      .select('id, make, model, year, price, photos, mileage, transmission')
      .eq('make', car.make)
      .eq('status', 'active')
      .neq('id', id)
      .limit(4)

    return NextResponse.json({
      ...car,
      similarCars: similarCars || []
    })
  } catch (error) {
    console.error('Error fetching car:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
