/**
 * Admin Chat Moderation Panel
 * Full access to all conversations with moderation tools
 */

'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Users, AlertCircle, Search, Filter, Eye, Ban, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import ChatBox from '@/components/chat/ChatBox'

export default function AdminChatsPage() {
  const [conversations, setConversations] = useState([])
  const [filteredConversations, setFilteredConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    flagged: 0,
    closed: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    loadConversations()

    // Subscribe to new conversations
    const channel = supabase
      .channel('admin-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    filterConversations()
  }, [conversations, filterType, searchTerm])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('conversations')
        .select(`
          *,
          buyers(full_name, email, phone),
          dealers(name, phone),
          cars(year, make, model),
          messages(id)
        `)
        .order('last_message_at', { ascending: false })

      setConversations(data || [])

      // Calculate stats
      const statsData = {
        total: data?.length || 0,
        active: data?.filter((c) => c.status === 'active').length || 0,
        flagged: data?.filter((c) => c.status === 'flagged').length || 0,
        closed: data?.filter((c) => c.status === 'closed').length || 0,
      }
      setStats(statsData)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterConversations = () => {
    let filtered = conversations

    // Filter by type
    if (filterType !== 'all') {
      if (filterType === 'dealer_buyer') {
        filtered = filtered.filter((c) => c.type === 'dealer_buyer')
      } else if (filterType === 'admin_buyer') {
        filtered = filtered.filter((c) => c.type === 'admin_buyer')
      } else if (filterType === 'flagged') {
        filtered = filtered.filter((c) => c.status === 'flagged')
      } else if (filterType === 'active') {
        filtered = filtered.filter((c) => c.status === 'active')
      }
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.buyers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.dealers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredConversations(filtered)
  }

  const updateConversationStatus = async (conversationId, status) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId)

      if (error) throw error

      loadConversations()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update conversation status')
    }
  }

  const flagConversation = async (conversationId) => {
    await updateConversationStatus(conversationId, 'flagged')
  }

  const closeConversation = async (conversationId) => {
    await updateConversationStatus(conversationId, 'closed')
  }

  const reopenConversation = async (conversationId) => {
    await updateConversationStatus(conversationId, 'active')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chat Moderation</h1>
        <p className="text-gray-600 mt-2">Monitor and moderate all conversations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Conversations</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <MessageCircle className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Flagged</p>
              <p className="text-3xl font-bold text-red-600">{stats.flagged}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Closed</p>
              <p className="text-3xl font-bold text-gray-600">{stats.closed}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <CheckCircle className="text-gray-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('dealer_buyer')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'dealer_buyer'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Dealer-Buyer
            </button>
            <button
              onClick={() => setFilterType('admin_buyer')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'admin_buyer'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Admin Support
            </button>
            <button
              onClick={() => setFilterType('flagged')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'flagged'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Flagged
            </button>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Loading conversations...
                  </td>
                </tr>
              ) : filteredConversations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No conversations found
                  </td>
                </tr>
              ) : (
                filteredConversations.map((conversation) => (
                  <tr key={conversation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {conversation.buyers?.full_name}
                        </p>
                        {conversation.type === 'dealer_buyer' && (
                          <p className="text-gray-500">with {conversation.dealers?.name}</p>
                        )}
                        {conversation.type === 'admin_buyer' && (
                          <p className="text-gray-500">
                            {conversation.subject || 'Admin Support'}
                          </p>
                        )}
                        {conversation.cars && (
                          <p className="text-xs text-blue-600">
                            {conversation.cars.year} {conversation.cars.make}{' '}
                            {conversation.cars.model}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          conversation.type === 'dealer_buyer'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {conversation.type === 'dealer_buyer' ? 'Dealer-Buyer' : 'Admin Support'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          conversation.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : conversation.status === 'flagged'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {conversation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conversation.messages?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => setSelectedConversation(conversation)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye size={18} />
                      </button>
                      {conversation.status !== 'flagged' && (
                        <button
                          onClick={() => flagConversation(conversation.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Ban size={18} />
                        </button>
                      )}
                      {conversation.status === 'active' && (
                        <button
                          onClick={() => closeConversation(conversation.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {conversation.status === 'closed' && (
                        <button
                          onClick={() => reopenConversation(conversation.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl">
            <ChatBox
              conversationId={selectedConversation.id}
              currentUser={{ type: 'admin', id: 'admin' }}
              onClose={() => setSelectedConversation(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
