/**
 * Chat List Component
 * Displays all conversations for the current user
 */

'use client'

import { MessageCircle, Search, Filter } from 'lucide-react'
import { useChat } from './ChatContext'
import { useState } from 'react'

export default function ChatList() {
  const { conversations, activeConversation, setActiveConversation } = useChat()
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'buyer_dealer', 'buyer_admin'

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch =
      conv.buyer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.dealer?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.last_message_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.car?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.car?.model?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filter === 'all' || conv.conversation_type === filter

    return matchesSearch && matchesFilter
  })

  return (
    <div className="w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <MessageCircle size={28} />
          <span>Messages</span>
        </h2>
        <p className="text-sm text-white/80 mt-1">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search & Filter */}
      <div className="p-4 space-y-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('buyer_dealer')}
            className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'buyer_dealer'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Dealers
          </button>
          <button
            onClick={() => setFilter('buyer_admin')}
            className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'buyer_admin'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Support
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-600 text-sm">
              {searchTerm ? 'No conversations match your search' : 'Start browsing cars to chat with dealers'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => {
              const isActive = activeConversation?.id === conversation.id
              const unreadCount = conversation.unread_count_buyer || conversation.unread_count_dealer || 0

              // Determine who we're chatting with
              const chatPartner = conversation.conversation_type === 'buyer_dealer'
                ? (conversation.dealer?.business_name || conversation.buyer?.full_name)
                : 'Admin Support'

              const avatar = chatPartner?.charAt(0)?.toUpperCase()

              return (
                <button
                  key={conversation.id}
                  onClick={() => setActiveConversation(conversation)}
                  className={`w-full p-4 hover:bg-blue-50 transition-colors text-left ${
                    isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                      conversation.conversation_type === 'buyer_admin'
                        ? 'bg-gradient-to-br from-red-500 to-pink-500'
                        : 'bg-gradient-to-br from-blue-500 to-purple-500'
                    }`}>
                      {avatar}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">{chatPartner}</h4>
                        {conversation.last_message_at && (
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatTimestamp(conversation.last_message_at)}
                          </span>
                        )}
                      </div>

                      {/* Car info */}
                      {conversation.car && (
                        <p className="text-xs text-blue-600 mb-1">
                          {conversation.car.year} {conversation.car.make} {conversation.car.model}
                        </p>
                      )}

                      {/* Last message */}
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {conversation.last_message_text || 'No messages yet'}
                        </p>
                        {unreadCount > 0 && (
                          <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 flex-shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to format timestamps
function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMs = now - date
  const diffInMins = Math.floor(diffInMs / 60000)
  const diffInHours = Math.floor(diffInMins / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMins < 1) return 'Just now'
  if (diffInMins < 60) return `${diffInMins}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
