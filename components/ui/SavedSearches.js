/**
 * Saved Searches Component
 * Manage saved search alerts
 */

'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Trash2, Edit2, Plus, Mail, Smartphone, AlertCircle } from 'lucide-react'

export default function SavedSearches({ userId }) {
  const [searches, setSearches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    condition: '',
    transmission: '',
    fuelType: '',
    location: '',
    notify_email: true,
    notify_sms: false
  })

  useEffect(() => {
    fetchSavedSearches()
  }, [])

  const fetchSavedSearches = async () => {
    try {
      const response = await fetch('/api/saved-searches')
      if (response.ok) {
        const data = await response.json()
        setSearches(data.searches || [])
      }
    } catch (error) {
      console.error('Error fetching saved searches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSearch = async (e) => {
    e.preventDefault()

    const filters = {}
    if (formData.make) filters.make = formData.make
    if (formData.model) filters.model = formData.model
    if (formData.minPrice) filters.minPrice = parseInt(formData.minPrice)
    if (formData.maxPrice) filters.maxPrice = parseInt(formData.maxPrice)
    if (formData.minYear) filters.minYear = parseInt(formData.minYear)
    if (formData.maxYear) filters.maxYear = parseInt(formData.maxYear)
    if (formData.condition) filters.condition = formData.condition
    if (formData.transmission) filters.transmission = formData.transmission
    if (formData.fuelType) filters.fuelType = formData.fuelType
    if (formData.location) filters.location = formData.location

    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          filters,
          notify_email: formData.notify_email,
          notify_sms: formData.notify_sms
        })
      })

      if (response.ok) {
        await fetchSavedSearches()
        setShowCreateForm(false)
        setFormData({
          name: '',
          make: '',
          model: '',
          minPrice: '',
          maxPrice: '',
          minYear: '',
          maxYear: '',
          condition: '',
          transmission: '',
          fuelType: '',
          location: '',
          notify_email: true,
          notify_sms: false
        })
      }
    } catch (error) {
      console.error('Error creating saved search:', error)
    }
  }

  const toggleActive = async (searchId, currentStatus) => {
    try {
      await fetch('/api/saved-searches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: searchId,
          is_active: !currentStatus
        })
      })
      await fetchSavedSearches()
    } catch (error) {
      console.error('Error toggling search:', error)
    }
  }

  const deleteSearch = async (searchId) => {
    if (!confirm('Delete this saved search?')) return

    try {
      await fetch(`/api/saved-searches?id=${searchId}`, {
        method: 'DELETE'
      })
      await fetchSavedSearches()
    } catch (error) {
      console.error('Error deleting search:', error)
    }
  }

  const formatFilters = (filters) => {
    const parts = []
    if (filters.make) parts.push(filters.make)
    if (filters.model) parts.push(filters.model)
    if (filters.minYear || filters.maxYear) {
      const yearRange = `${filters.minYear || ''}${filters.minYear && filters.maxYear ? '-' : ''}${filters.maxYear || ''}`
      parts.push(yearRange)
    }
    if (filters.minPrice || filters.maxPrice) {
      const priceRange = `₦${filters.minPrice?.toLocaleString() || '0'} - ₦${filters.maxPrice?.toLocaleString() || '∞'}`
      parts.push(priceRange)
    }
    if (filters.condition) parts.push(filters.condition)
    if (filters.transmission) parts.push(filters.transmission)
    if (filters.location) parts.push(filters.location)
    return parts.join(' • ')
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading saved searches...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Saved Searches</h2>
          <p className="text-gray-600">Get notified when matching cars are listed</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
        >
          <Plus size={20} className="mr-2" />
          New Search
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateSearch} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Saved Search</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Name*</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Toyota Camry 2020+"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Toyota, Mercedes, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Camry, C-Class, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Lagos, Abuja, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price (₦)</label>
              <input
                type="number"
                value={formData.minPrice}
                onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price (₦)</label>
              <input
                type="number"
                value={formData.maxPrice}
                onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Year</label>
              <input
                type="number"
                value={formData.minYear}
                onChange={(e) => setFormData({ ...formData, minYear: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2018"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Year</label>
              <input
                type="number"
                value={formData.maxYear}
                onChange={(e) => setFormData({ ...formData, maxYear: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2024"
              />
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notifications</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notify_email}
                  onChange={(e) => setFormData({ ...formData, notify_email: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Mail size={18} className="ml-2 mr-2 text-gray-600" />
                <span className="text-sm text-gray-700">Email notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notify_sms}
                  onChange={(e) => setFormData({ ...formData, notify_sms: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Smartphone size={18} className="ml-2 mr-2 text-gray-600" />
                <span className="text-sm text-gray-700">SMS notifications</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Save Search
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Saved Searches List */}
      {searches.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
          <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Saved Searches</h3>
          <p className="text-gray-600 mb-4">Create a saved search to get notified when matching cars are listed</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition inline-flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Create Your First Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {searches.map((search) => (
            <div
              key={search.id}
              className={`bg-white rounded-xl p-6 shadow-sm border transition ${
                search.is_active ? 'border-blue-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{search.name}</h3>
                    {search.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center">
                        <Bell size={12} className="mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full flex items-center">
                        <BellOff size={12} className="mr-1" />
                        Paused
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-3">{formatFilters(search.filters)}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {search.notify_email && (
                      <span className="flex items-center">
                        <Mail size={14} className="mr-1" />
                        Email
                      </span>
                    )}
                    {search.notify_sms && (
                      <span className="flex items-center">
                        <Smartphone size={14} className="mr-1" />
                        SMS
                      </span>
                    )}
                    <span>•</span>
                    <span>Created {new Date(search.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(search.id, search.is_active)}
                    className={`p-2 rounded-lg transition ${
                      search.is_active
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    title={search.is_active ? 'Pause alerts' : 'Resume alerts'}
                  >
                    {search.is_active ? <BellOff size={18} /> : <Bell size={18} />}
                  </button>
                  <button
                    onClick={() => deleteSearch(search.id)}
                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                    title="Delete search"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
