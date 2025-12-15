/**
 * Admin Blog API
 * Full CRUD operations for blog posts
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET - Fetch all posts (including drafts)
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = await createClient()

    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (id, name, slug)
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }

    query = query.limit(limit)

    const { data: posts, error } = await query

    if (error) throw error

    return NextResponse.json({ posts: posts || [] })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new blog post
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      slug,
      excerpt,
      content,
      featured_image,
      category_id,
      tags,
      status,
      is_featured,
      is_trending,
      meta_title,
      meta_description
    } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        excerpt,
        content,
        featured_image,
        category_id,
        author_id: user.id,
        status: status || 'draft',
        is_featured: is_featured || false,
        is_trending: is_trending || false,
        meta_title,
        meta_description,
        published_at: status === 'published' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (error) throw error

    // Add tags if provided
    if (tags && tags.length > 0 && post) {
      const tagRecords = tags.map((tagId) => ({
        blog_post_id: post.id,
        blog_tag_id: tagId
      }))

      await supabase.from('blog_post_tags').insert(tagRecords)
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update blog post
export async function PATCH(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // If changing to published, set published_at
    if (updates.status === 'published' && !updates.published_at) {
      updates.published_at = new Date().toISOString()
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete blog post
export async function DELETE(request) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user-session')

    if (!userCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from('blog_posts').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
