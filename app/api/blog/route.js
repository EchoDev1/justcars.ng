/**
 * Blog API
 * Fetch blog posts with filtering, search, and pagination
 */

import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured') === 'true'
    const trending = searchParams.get('trending') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient()

    // Get single post by slug
    if (slug) {
      const { data: post, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (id, name, slug),
          blog_post_tags (
            blog_tags (id, name, slug)
          )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single()

      if (error) throw error

      // Increment view count
      if (post) {
        await supabase
          .from('blog_posts')
          .update({ views_count: post.views_count + 1 })
          .eq('id', post.id)
      }

      return Response.json({ post })
    }

    // Build query for multiple posts
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (id, name, slug),
        blog_post_tags (
          blog_tags (id, name, slug)
        )
      `, { count: 'exact' })
      .eq('status', 'published')

    // Apply filters
    if (category) {
      const { data: cat } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', category)
        .single()

      if (cat) {
        query = query.eq('category_id', cat.id)
      }
    }

    if (tag) {
      // Join with tags
      const { data: tagData } = await supabase
        .from('blog_tags')
        .select('id')
        .eq('slug', tag)
        .single()

      if (tagData) {
        const { data: postIds } = await supabase
          .from('blog_post_tags')
          .select('blog_post_id')
          .eq('blog_tag_id', tagData.id)

        if (postIds && postIds.length > 0) {
          query = query.in('id', postIds.map(p => p.blog_post_id))
        }
      }
    }

    if (featured) {
      query = query.eq('is_featured', true)
    }

    if (trending) {
      query = query.eq('is_trending', true)
    }

    // Search
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }

    // Sort by published date
    query = query.order('published_at', { ascending: false })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: posts, error, count } = await query

    if (error) throw error

    return Response.json({
      posts: posts || [],
      total: count || 0,
      hasMore: posts && posts.length === limit
    })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
