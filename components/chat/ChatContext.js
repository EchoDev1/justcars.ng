/**
 * Chat Context
 * Manages global chat state and real-time subscriptions
 */

'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const ChatContext = createContext()

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Fetch conversations for current user
  const fetchConversations = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('Auth error in fetchConversations:', authError)
        return
      }

      if (!user) {
        console.log('No user found in fetchConversations')
        return
      }

      console.log('Fetching conversations for user:', user.id)

      // Determine user type (buyer, dealer, or admin)
      const { data: buyerData, error: buyerError } = await supabase
        .from('buyers')
        .select('id')
        .eq('id', user.id)
        .single()

      if (buyerError && buyerError.code !== 'PGRST116') {
        console.error('Error checking buyer:', buyerError)
      }

      const { data: dealerData, error: dealerError } = await supabase
        .from('dealers')
        .select('id')
        .eq('id', user.id)
        .single()

      if (dealerError && dealerError.code !== 'PGRST116') {
        console.error('Error checking dealer:', dealerError)
      }

      console.log('User type:', buyerData ? 'buyer' : dealerData ? 'dealer' : 'unknown')

      let query = supabase
        .from('conversations')
        .select(`
          *,
          buyer:buyers(id, full_name, email),
          dealer:dealers(id, name, email),
          car:cars(id, make, model, year)
        `)
        .order('updated_at', { ascending: false })

      // Filter based on user type
      if (buyerData) {
        query = query.eq('buyer_id', user.id)
      } else if (dealerData) {
        query = query.eq('dealer_id', user.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Database error fetching conversations:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('Conversations fetched successfully:', data?.length || 0)
      setConversations(data || [])

      // Calculate total unread count
      const total = data?.reduce((acc, conv) => {
        if (buyerData) return acc + (conv.unread_count_buyer || 0)
        if (dealerData) return acc + (conv.unread_count_dealer || 0)
        return acc
      }, 0) || 0

      setUnreadCount(total)
    } catch (error) {
      console.error('Error fetching conversations:', error)
      console.error('Full error object:', JSON.stringify(error, null, 2))
    }
  }

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])

      // Mark messages as read
      await markMessagesAsRead(conversationId)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark messages as read
  const markMessagesAsRead = async (conversationId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Determine user type
      const { data: buyerData } = await supabase
        .from('buyers')
        .select('id')
        .eq('id', user.id)
        .single()

      const { data: dealerData } = await supabase
        .from('dealers')
        .select('id')
        .eq('id', user.id)
        .single()

      // Update messages
      const updateField = buyerData ? 'read_by_buyer' : dealerData ? 'read_by_dealer' : 'read_by_admin'

      await supabase
        .from('messages')
        .update({ [updateField]: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq(updateField, false)

      // Update conversation unread count
      const unreadField = buyerData ? 'unread_count_buyer' : dealerData ? 'unread_count_dealer' : 'unread_count_admin'

      await supabase
        .from('conversations')
        .update({ [unreadField]: 0 })
        .eq('id', conversationId)

      // Refresh conversations
      await fetchConversations()
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  // Send a message
  const sendMessage = async (conversationId, messageText, senderType, senderName) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          sender_id: user.id,
          sender_name: senderName,
          message_text: messageText,
          message_type: 'text'
        })
        .select()
        .single()

      if (error) throw error

      // Add message to local state immediately
      setMessages(prev => [...prev, data])

      return data
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  // Create or get existing conversation
  const createOrGetConversation = async (buyerId, dealerId, carId, conversationType = 'buyer_dealer') => {
    try {
      // Check if conversation already exists
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('buyer_id', buyerId)
        .eq('conversation_type', conversationType)

      if (conversationType === 'buyer_dealer') {
        query = query.eq('dealer_id', dealerId)
      }

      if (carId) {
        query = query.eq('car_id', carId)
      }

      const { data: existing } = await query.single()

      if (existing) {
        return existing
      }

      // Create new conversation
      const newConversation = {
        buyer_id: buyerId,
        conversation_type: conversationType,
        status: 'active'
      }

      if (conversationType === 'buyer_dealer') {
        newConversation.dealer_id = dealerId
      }

      if (carId) {
        newConversation.car_id = carId
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert(newConversation)
        .select()
        .single()

      if (error) throw error

      await fetchConversations()

      return data
    } catch (error) {
      console.error('Error creating conversation:', error)
      throw error
    }
  }

  // Subscribe to real-time updates
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return

      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          // If message is for active conversation, add it
          if (payload.new.conversation_id === activeConversation?.id) {
            setMessages(prev => [...prev, payload.new])
          }

          // Refresh conversations to update unread counts
          fetchConversations()
        })
        .subscribe()

      // Subscribe to conversation updates
      const conversationsSubscription = supabase
        .channel('conversations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'conversations'
        }, () => {
          fetchConversations()
        })
        .subscribe()

      return () => {
        messagesSubscription.unsubscribe()
        conversationsSubscription.unsubscribe()
      }
    })
  }, [activeConversation])

  // Initial fetch
  useEffect(() => {
    fetchConversations()
  }, [])

  const value = {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    unreadCount,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createOrGetConversation,
    markMessagesAsRead
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
