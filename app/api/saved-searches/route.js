/**
 * Saved Searches API
 * Save search criteria and get notified when matching cars are listed
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = JSON.parse(userCookie.value).id
    const supabase = createClient()

    const { data: searches, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({ searches })
  } catch (error) {
    console.error('Error fetching saved searches:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = JSON.parse(userCookie.value).id
    const body = await request.json()
    const {
      name,
      filters,
      notify_email,
      notify_sms,
      notify_push,
      is_active
    } = body

    if (!name || !filters) {
      return Response.json(
        { error: 'Name and filters are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        name,
        filters,
        notify_email: notify_email !== false,
        notify_sms: notify_sms === true,
        notify_push: notify_push !== false,
        is_active: is_active !== false
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ search: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating saved search:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = JSON.parse(userCookie.value).id
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return Response.json({ error: 'Search ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('saved_searches')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return Response.json({ search: data })
  } catch (error) {
    console.error('Error updating saved search:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = JSON.parse(userCookie.value).id
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'Search ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting saved search:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
