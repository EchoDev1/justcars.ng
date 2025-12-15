/**
 * Inspections API
 * Book, manage, and view car inspections
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET - Fetch inspections
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const inspectionId = searchParams.get('id')
    const carId = searchParams.get('carId')
    const status = searchParams.get('status')

    const supabase = createClient()

    // Get single inspection
    if (inspectionId) {
      const { data: inspection, error } = await supabase
        .from('inspections')
        .select(`
          *,
          cars (id, make, model, year, price),
          dealers (id, name, phone, email),
          inspectors (id, name, email, phone, avatar_url, certification_number),
          inspection_photos (*),
          inspection_checklist_items (*)
        `)
        .eq('id', inspectionId)
        .single()

      if (error) throw error

      return Response.json({ inspection })
    }

    // Build query for multiple inspections
    let query = supabase
      .from('inspections')
      .select(`
        *,
        cars (id, make, model, year),
        inspectors (id, name, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (carId) query = query.eq('car_id', carId)
    if (status) query = query.eq('status', status)

    const { data: inspections, error } = await query

    if (error) throw error

    return Response.json({ inspections: inspections || [] })
  } catch (error) {
    console.error('Error fetching inspections:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new inspection booking
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
      car_id,
      dealer_id,
      preferred_date,
      preferred_time,
      inspection_location,
      city,
      buyer_name,
      buyer_email,
      buyer_phone
    } = body

    // Validation
    if (!car_id || !dealer_id || !preferred_date || !preferred_time || !city) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if car exists
    const { data: car } = await supabase
      .from('cars')
      .select('id, make, model, year, location')
      .eq('id', car_id)
      .single()

    if (!car) {
      return Response.json({ error: 'Car not found' }, { status: 404 })
    }

    // Find available inspector in the city
    const { data: inspectors } = await supabase
      .from('inspectors')
      .select('id')
      .eq('is_active', true)
      .eq('is_available', true)
      .contains('coverage_areas', [city])
      .limit(1)

    const inspectorId = inspectors && inspectors.length > 0 ? inspectors[0].id : null

    // Create inspection booking
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        car_id,
        dealer_id,
        buyer_id: user.id,
        buyer_name: buyer_name || user.name,
        buyer_email: buyer_email || user.email,
        buyer_phone: buyer_phone || user.phone || '',
        inspector_id: inspectorId,
        preferred_date,
        preferred_time,
        inspection_location: inspection_location || car.location,
        city,
        status: inspectorId ? 'assigned' : 'pending',
        inspection_fee: 25000 // ₦25,000 standard fee
      })
      .select()
      .single()

    if (error) throw error

    // TODO: Send confirmation email/SMS to buyer
    // TODO: Send notification to inspector

    return Response.json({
      inspection,
      message: inspectorId
        ? 'Inspection booked and assigned to inspector!'
        : 'Inspection booked! We will assign an inspector soon.'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating inspection:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update inspection status or details
export async function PATCH(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session') || cookieStore.get('inspector-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inspection_id, ...updates } = body

    if (!inspection_id) {
      return Response.json({ error: 'Inspection ID required' }, { status: 400 })
    }

    const supabase = createClient()

    const { data: inspection, error } = await supabase
      .from('inspections')
      .update(updates)
      .eq('id', inspection_id)
      .select()
      .single()

    if (error) throw error

    return Response.json({ inspection })
  } catch (error) {
    console.error('Error updating inspection:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
