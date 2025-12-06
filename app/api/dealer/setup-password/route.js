/**
 * Dealer Password Setup API
 * POST /api/dealer/setup-password
 * Allows verified dealers to create their own password
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  console.log('🔵 [DEALER SETUP PASSWORD] Request received')

  try {
    const body = await request.json()
    const { email, setupToken, password, confirmPassword } = body

    console.log('📝 [DEALER SETUP PASSWORD] Email:', email)
    console.log('📝 [DEALER SETUP PASSWORD] Setup token present:', !!setupToken)


    // Validation
    if (!email || !setupToken || !password || !confirmPassword) {
      console.log('❌ [DEALER SETUP PASSWORD] Validation failed: Missing required fields')
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Password validation
    if (password !== confirmPassword) {
      console.log('❌ [DEALER SETUP PASSWORD] Passwords do not match')
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      console.log('❌ [DEALER SETUP PASSWORD] Password too short')
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

        console.log('🔍 [DEALER SETUP PASSWORD] Checking password strength...')
    // Password strength check (optional but recommended)
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    console.log('✅ [DEALER SETUP PASSWORD] Password validation passed')


    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      console.log('❌ [DEALER SETUP PASSWORD] Password strength check failed')
      return NextResponse.json(
        {
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        },
        { status: 400 }
      )
    }

    // CRITICAL: Use service role client to bypass RLS
    console.log('🔑 [DEALER SETUP PASSWORD] Using service role client')
    const supabase = createServiceRoleClient()

    // Get dealer by email and setup token
    console.log('🔍 [DEALER SETUP PASSWORD] Querying dealer by email and token...')
    const { data: dealer, error: dealerError } = await supabase
      .from('dealers')
      .select('*')
      .eq('email', email)
      .eq('setup_token', setupToken)
      .maybeSingle()

    if (dealerError || !dealer) {
      console.log('❌ [DEALER SETUP PASSWORD] Dealer not found or invalid token')
      return NextResponse.json(
        { error: 'Invalid setup link or token has expired' },
        { status: 404 }
      )
    }

    // Check if dealer is verified
    if (dealer.status !== 'verified') {
      console.log('❌ [DEALER SETUP PASSWORD] Dealer status is not verified:', dealer.status)
      return NextResponse.json(
        {
          error: 'Account must be verified before setting up password',
          status: dealer.status
        },
        { status: 403 }
      )
    }

    // Check if token has expired
    if (dealer.setup_token_expires_at && new Date(dealer.setup_token_expires_at) < new Date()) {
      console.log('❌ [DEALER SETUP PASSWORD] Setup token expired:', dealer.setup_token_expires_at)
      return NextResponse.json(
        { error: 'Setup token has expired. Please contact admin for a new setup link' },
        { status: 410 }
      )
    }

    // Check if password already set
    if (dealer.password_hash && dealer.status === 'active') {
      console.log('❌ [DEALER SETUP PASSWORD] Password already set')
      return NextResponse.json(
        { error: 'Password has already been set. Please use the login page' },
        { status: 400 }
      )
    }

    // Hash password
    console.log('🔑 [DEALER SETUP PASSWORD] Hashing password...')
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)
    console.log('✅ [DEALER SETUP PASSWORD] Password hashed successfully')


    // Update dealer with password and activate account
    console.log('💾 [DEALER SETUP PASSWORD] Updating dealer account and activating...')
    const { error: updateError } = await supabase
      .from('dealers')
      .update({
        password_hash: passwordHash,
        password_set_at: new Date().toISOString(),
        status: 'active',
        setup_token: null, // Clear token after use
        setup_token_expires_at: null
      })
      .eq('id', dealer.id)

    if (updateError) {
      console.error('Error updating dealer password:', updateError)
      return NextResponse.json(
        { error: 'Failed to set password: ' + updateError.message },
        { status: 500 }
      )
    }

    // Log password setup
    console.log('📝 [DEALER SETUP PASSWORD] Logging password setup event...')
    await supabase
      .from('dealer_auth_logs')
      .insert([
        {
          dealer_id: dealer.id,
          dealer_email: email,
          event_type: 'password_setup',
          success: true,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent')
        }
      ])

    return NextResponse.json(
      {
        success: true,
        message: 'Password setup successful! You can now login to your dealer dashboard.',
        dealer: {
          id: dealer.id,
          business_name: dealer.business_name || dealer.name,
          email: dealer.email,
          status: 'active'
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Password setup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during password setup' },
      { status: 500 }
    )
  }
}
