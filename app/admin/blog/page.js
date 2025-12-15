/**
 * Admin Blog Management Page
 * Create, edit, publish, and moderate blog posts
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  TrendingUp,
  Star,
  Calendar,
  Tag,
  FileText,
  Search
} from 'lucide-react'

export default function AdminBlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, published, draft, pending
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [filter])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filter !== 'all') {
        params.append('status', filter)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/admin/blog?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/blog/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleDelete = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(`/api/admin/blog?id=${postId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handleStatusChange = async (postId, newStatus) => {
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId, status: newStatus })
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const toggleFeatured = async (postId, currentValue) => {
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId, is_featured: !currentValue })
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Error toggling featured:', error)
    }
  }

  const toggleTrending = async (postId, currentValue) => {
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId, is_trending: !currentValue })
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Error toggling trending:', error)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    }
    return badges[status] || badges.draft
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-gray-600 mt-1">Create and manage blog posts</p>
          </div>
          <button
            onClick={() => router.push('/admin/blog/new')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus size={20} />
            New Post
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchPosts()}
                placeholder="Search posts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Posts</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="pending">Pending Review</option>
            </select>

            <button
              onClick={fetchPosts}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Posts Found</h3>
              <p className="text-gray-600 mb-4">Start by creating your first blog post</p>
              <button
                onClick={() => router.push('/admin/blog/new')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Create Post
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Views
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          {post.featured_image && (
                            <img
                              src={post.featured_image}
                              alt={post.title}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{post.title}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{post.excerpt}</p>
                            <div className="flex gap-2 mt-1">
                              {post.is_featured && (
                                <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                  <Star size={12} />
                                  Featured
                                </span>
                              )}
                              {post.is_trending && (
                                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  <TrendingUp size={12} />
                                  Trending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {post.blog_categories?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={post.status}
                          onChange={(e) => handleStatusChange(post.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(post.status)}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="pending">Pending</option>
                          <option value="published">Published</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Eye size={14} />
                          {post.views_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar size={14} />
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/blog/${post.id}/edit`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => toggleFeatured(post.id, post.is_featured)}
                            className={`p-2 rounded-lg transition ${
                              post.is_featured
                                ? 'text-yellow-600 bg-yellow-50'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title="Toggle Featured"
                          >
                            <Star size={16} fill={post.is_featured ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => toggleTrending(post.id, post.is_trending)}
                            className={`p-2 rounded-lg transition ${
                              post.is_trending
                                ? 'text-blue-600 bg-blue-50'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title="Toggle Trending"
                          >
                            <TrendingUp size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Published</p>
            <p className="text-2xl font-bold text-green-600">
              {posts.filter((p) => p.status === 'published').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Drafts</p>
            <p className="text-2xl font-bold text-gray-600">
              {posts.filter((p) => p.status === 'draft').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Categories</p>
            <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
