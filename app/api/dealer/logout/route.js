/**
 * Dealer Logout API
 * POST /api/dealer/logout
 * Logs out dealer and destroys session
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request) {
  console.log('🔵 [DEALER LOGOUT] Request received')

  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('dealer_session')?.value

    console.log('📝 [DEALER LOGOUT] Session token present:', !!sessionToken)


    if (sessionToken) {
            console.log('🔑 [DEALER LOGOUT] Using service role client')
      // CRITICAL: Use service role client to bypass RLS
      const supabase = createServiceRoleClient()

            console.log('🔍 [DEALER LOGOUT] Deleting session from database...')
      // Delete session from database
      await supabase
        .from('dealer_sessions')
        .delete()
        .eq('session_token', sessionToken)
    }

        console.log('🎉 [DEALER LOGOUT] Creating logout response')
    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully'
      },
      { status: 200 }
    )

        console.log('🍪 [DEALER LOGOUT] Clearing session cookie')
    // Clear session cookie
    response.cookies.delete('dealer_session')

    console.log('🎉 [DEALER LOGOUT] Logout completed successfully')


    return response

  } catch (error) {
    console.error('Dealer logout error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    )
  }
}
