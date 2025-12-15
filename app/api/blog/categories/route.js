/**
 * Blog Categories API
 * Manage blog categories
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ categories: categories || [] })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ categories: [] }, { status: 200 })
  }
}
