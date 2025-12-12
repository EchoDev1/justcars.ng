import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all premium verified cars
    const { data: premiumCars, error: premiumError } = await supabase
      .from('cars')
      .select('id, make, model, year, is_premium_verified, car_images(image_url)')
      .eq('is_premium_verified', true)
      .limit(10)

    // Get all just arrived cars
    const { data: justArrivedCars, error: justArrivedError } = await supabase
      .from('cars')
      .select('id, make, model, year, is_just_arrived, car_images(image_url)')
      .eq('is_just_arrived', true)
      .limit(10)

    // Get all cars
    const { data: allCars, error: allCarsError } = await supabase
      .from('cars')
      .select('id, make, model, year')
      .limit(10)

    return Response.json({
      success: true,
      premiumCars: {
        count: premiumCars?.length || 0,
        cars: premiumCars || [],
        error: premiumError?.message || null
      },
      justArrivedCars: {
        count: justArrivedCars?.length || 0,
        cars: justArrivedCars || [],
        error: justArrivedError?.message || null
      },
      allCars: {
        count: allCars?.length || 0,
        cars: allCars || [],
        error: allCarsError?.message || null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
