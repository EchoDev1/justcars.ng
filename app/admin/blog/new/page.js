/**
 * Create New Blog Post Page
 * Rich text editor for creating blog posts
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Eye, Upload, X } from 'lucide-react'

export default function NewBlogPostPage() {
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category_id: '',
    status: 'draft',
    is_featured: false,
    is_trending: false,
    meta_title: '',
    meta_description: ''
  })

  useEffect(() => {
    fetchCategories()
  }, [])

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Auto-generate slug from title
    if (name === 'title' && !formData.slug) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }

  const handleSubmit = async (e, status = 'draft') => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status
        })
      })

      if (response.ok) {
        router.push('/admin/blog')
      } else {
        alert('Error saving post')
      }
    } catch (error) {
      console.error('Error saving post:', error)
      alert('Error saving post')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
            <p className="text-gray-600 mt-1">Write and publish a new blog post</p>
          </div>
          <button
            onClick={() => router.push('/admin/blog')}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-6">
          {/* Title */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Post Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter post title..."
              required
              className="w-full px-4 py-3 text-2xl font-bold border-0 focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Slug */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              URL Slug
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="url-friendly-slug"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL: /blog/{formData.slug || 'post-slug'}
            </p>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Featured Image URL
            </label>
            <div className="flex gap-4">
              <input
                type="url"
                name="featured_image"
                value={formData.featured_image}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center gap-2"
              >
                <Upload size={16} />
                Upload
              </button>
            </div>
            {formData.featured_image && (
              <img
                src={formData.featured_image}
                alt="Preview"
                className="mt-4 w-full h-48 object-cover rounded-lg"
              />
            )}
          </div>

          {/* Excerpt */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Excerpt
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="Brief summary of the post (shown in listings)..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Write your post content here (Markdown supported)..."
              required
              rows="20"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          {/* Category and Settings */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Category
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-4">
                Post Settings
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Mark as Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_trending"
                    checked={formData.is_trending}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Mark as Trending</span>
                </label>
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">SEO Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={handleChange}
                  placeholder="SEO title (leave empty to use post title)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Meta Description
                </label>
                <textarea
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleChange}
                  placeholder="SEO description (leave empty to use excerpt)"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-6">
            <button
              type="button"
              onClick={() => router.push('/admin/blog')}
              className="text-gray-600 hover:text-gray-900 font-semibold"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'published')}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Eye size={16} />
                {saving ? 'Publishing...' : 'Publish Now'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
