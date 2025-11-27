/**
 * Chat Window Component
 * Displays messages and allows sending new messages
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, ArrowLeft, Phone, Video, MoreVertical, Image as ImageIcon } from 'lucide-react'
import { useChat } from './ChatContext'
import { createClient } from '@/lib/supabase/client'

export default function ChatWindow({ onBack }) {
  const { activeConversation, messages, fetchMessages, sendMessage } = useChat()
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [senderInfo, setSenderInfo] = useState(null)
  const messagesEndRef = useRef(null)
  const supabase = createClient()

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id)
      fetchSenderInfo()
    }
  }, [activeConversation])

  // Get sender information
  const fetchSenderInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user is a buyer
      const { data: buyerData } = await supabase
        .from('buyers')
        .select('id, full_name')
        .eq('id', user.id)
        .single()

      if (buyerData) {
        setSenderInfo({
          type: 'buyer',
          name: buyerData.full_name
        })
        return
      }

      // Check if user is a dealer
      const { data: dealerData } = await supabase
        .from('dealers')
        .select('id, business_name')
        .eq('id', user.id)
        .single()

      if (dealerData) {
        setSenderInfo({
          type: 'dealer',
          name: dealerData.business_name
        })
        return
      }

      // Check if user is admin
      setSenderInfo({
        type: 'admin',
        name: 'Admin'
      })
    } catch (error) {
      console.error('Error fetching sender info:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageText.trim() || !senderInfo) return

    try {
      setSending(true)
      await sendMessage(activeConversation.id, messageText.trim(), senderInfo.type, senderInfo.name)
      setMessageText('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Send className="text-white" size={40} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Conversation Selected</h3>
          <p className="text-gray-600">Select a conversation to start messaging</p>
        </div>
      </div>
    )
  }

  const otherPartyName = activeConversation.conversation_type === 'buyer_dealer'
    ? (senderInfo?.type === 'buyer' ? activeConversation.dealer?.business_name : activeConversation.buyer?.full_name)
    : 'Admin Support'

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="lg:hidden hover:bg-white/20 rounded-full p-2 transition-colors">
            <ArrowLeft size={20} />
          </button>

          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg backdrop-blur-sm">
            {otherPartyName?.charAt(0)?.toUpperCase()}
          </div>

          <div>
            <h3 className="font-semibold text-lg">{otherPartyName}</h3>
            {activeConversation.car && (
              <p className="text-sm text-white/80">
                {activeConversation.car.year} {activeConversation.car.make} {activeConversation.car.model}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="hover:bg-white/20 rounded-full p-2 transition-colors">
            <Phone size={20} />
          </button>
          <button className="hover:bg-white/20 rounded-full p-2 transition-colors">
            <Video size={20} />
          </button>
          <button className="hover:bg-white/20 rounded-full p-2 transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-gray-50 to-blue-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender_type === senderInfo?.type
            const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id

            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
                {!isOwn && showAvatar && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {message.sender_name?.charAt(0)?.toUpperCase()}
                  </div>
                )}

                {!isOwn && !showAvatar && <div className="w-8" />}

                <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-first' : ''}`}>
                  {!isOwn && showAvatar && (
                    <p className="text-xs text-gray-600 mb-1 ml-2">{message.sender_name}</p>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-3 shadow-md ${
                      isOwn
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-none'
                        : 'bg-white text-gray-900 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.message_text}</p>
                  </div>

                  <p className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right mr-2' : 'ml-2'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="text-gray-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full"
          >
            <ImageIcon size={24} />
          </button>

          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={sending}
          />

          <button
            type="submit"
            disabled={sending || !messageText.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full p-3 hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  )
}
