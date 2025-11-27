/**
 * DisputeChatBox Component - Buyer-Admin Dispute Resolution
 * Features: Dispute filing, admin support, file uploads
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, AlertCircle, CheckCircle, Clock, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

export default function DisputeChatBox({ buyerId, onClose }) {
  const [disputes, setDisputes] = useState([])
  const [activeDispute, setActiveDispute] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNewDispute, setShowNewDispute] = useState(false)
  const [disputeSubject, setDisputeSubject] = useState('')
  const messagesEndRef = useRef(null)
  const supabase = createClient()

  useEffect(() => {
    loadDisputes()
  }, [buyerId])

  useEffect(() => {
    if (activeDispute) {
      loadMessages()
      scrollToBottom()

      // Subscribe to new messages
      const channel = supabase
        .channel(`dispute:${activeDispute}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeDispute}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new])
            scrollToBottom()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [activeDispute])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadDisputes = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('type', 'admin_buyer')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })

    setDisputes(data || [])
  }

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeDispute)
      .order('created_at', { ascending: true })

    setMessages(data || [])
  }

  const createNewDispute = async (e) => {
    e.preventDefault()
    if (!disputeSubject.trim()) return

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          type: 'admin_buyer',
          buyer_id: buyerId,
          subject: disputeSubject,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      // Send first message
      await supabase.from('messages').insert({
        conversation_id: data.id,
        sender_type: 'buyer',
        sender_id: buyerId,
        message: disputeSubject,
      })

      setActiveDispute(data.id)
      setShowNewDispute(false)
      setDisputeSubject('')
      loadDisputes()
    } catch (error) {
      console.error('Error creating dispute:', error)
      alert('Failed to create dispute')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: activeDispute,
        sender_type: 'buyer',
        sender_id: buyerId,
        message: newMessage.trim(),
      })

      if (error) throw error

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Clock className="text-yellow-500" size={16} />
      case 'closed':
        return <CheckCircle className="text-green-500" size={16} />
      case 'flagged':
        return <AlertCircle className="text-red-500" size={16} />
      default:
        return <Clock className="text-gray-500" size={16} />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <AlertCircle className="text-white" size={24} />
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">Admin Support & Disputes</h2>
              <p className="text-sm text-white/80">Get help from our support team</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Disputes Sidebar */}
          <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={() => setShowNewDispute(true)}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-3 rounded-xl font-bold hover:from-red-600 hover:to-orange-600 transition-all shadow-lg"
              >
                + New Dispute
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {disputes.map((dispute) => (
                <button
                  key={dispute.id}
                  onClick={() => setActiveDispute(dispute.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    activeDispute === dispute.id
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200'
                      : 'bg-white border border-gray-200 hover:border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1">
                      {dispute.subject || 'General Inquiry'}
                    </h4>
                    {getStatusIcon(dispute.status)}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(dispute.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          {showNewDispute ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <form onSubmit={createNewDispute} className="w-full max-w-md space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Create New Dispute
                  </h3>
                  <p className="text-gray-600">
                    Describe your issue and our admin team will assist you.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <textarea
                    value={disputeSubject}
                    onChange={(e) => setDisputeSubject(e.target.value)}
                    placeholder="Describe your issue..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewDispute(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50 shadow-lg"
                  >
                    {loading ? 'Creating...' : 'Create Dispute'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeDispute ? (
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.map((message) => {
                  const isAdmin = message.sender_type === 'admin'
                  const isBuyer = message.sender_id === buyerId
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isBuyer ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          isAdmin
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                            : isBuyer
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        {isAdmin && (
                          <p className="text-xs font-bold mb-1 opacity-80">Admin Support</p>
                        )}
                        <p className="text-sm break-words">{message.message}</p>
                        <p
                          className={`text-xs mt-2 ${
                            isAdmin || isBuyer ? 'text-white/70' : 'text-gray-500'
                          }`}
                        >
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !newMessage.trim()}
                    className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-3 rounded-xl hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50 shadow-lg"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No Dispute Selected</p>
                <p className="text-sm">Select a dispute or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
