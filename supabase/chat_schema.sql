-- JUSTCARS.NG CHAT SYSTEM DATABASE SCHEMA
-- This schema supports:
-- 1. Buyer-Dealer direct messaging
-- 2. Buyer-Admin dispute resolution chat
-- 3. Admin moderation with full access to all conversations
-- 4. Saved cars functionality for buyers

-- 1. CONVERSATIONS TABLE
-- Tracks all conversations between users (buyer-dealer, buyer-admin)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,

  -- Conversation Type
  conversation_type VARCHAR(20) NOT NULL CHECK (conversation_type IN ('buyer_dealer', 'buyer_admin')),

  -- Car reference (optional, for context)
  car_id UUID REFERENCES cars(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),

  -- Admin moderation flags
  flagged_by_admin BOOLEAN DEFAULT false,
  admin_notes TEXT,

  -- Last message info (for quick display in chat list)
  last_message_text TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_sender_type VARCHAR(20),

  -- Unread counts
  unread_count_buyer INTEGER DEFAULT 0,
  unread_count_dealer INTEGER DEFAULT 0,
  unread_count_admin INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_dealer ON conversations(dealer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_car ON conversations(car_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 2. MESSAGES TABLE
-- Stores all individual messages in conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation reference
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Sender information
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('buyer', 'dealer', 'admin')),
  sender_id UUID NOT NULL,
  sender_name VARCHAR(255) NOT NULL,

  -- Message content
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),

  -- Attachments (optional)
  attachment_url TEXT,
  attachment_type VARCHAR(50),
  attachment_name VARCHAR(255),

  -- Read status
  read_by_buyer BOOLEAN DEFAULT false,
  read_by_dealer BOOLEAN DEFAULT false,
  read_by_admin BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Admin moderation
  flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  deleted_by_admin BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(flagged) WHERE flagged = true;

-- 3. BUYER SAVED CARS TABLE
-- Stores cars that buyers have saved/bookmarked
CREATE TABLE IF NOT EXISTS buyer_saved_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Buyer reference
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,

  -- Car reference
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

  -- Notes (optional)
  buyer_notes TEXT,

  -- Priority/Interest level
  interest_level VARCHAR(20) DEFAULT 'interested' CHECK (interest_level IN ('interested', 'very_interested', 'ready_to_buy')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure a buyer can't save the same car twice
  UNIQUE(buyer_id, car_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_cars_buyer ON buyer_saved_cars(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_cars_car ON buyer_saved_cars(car_id);
CREATE INDEX IF NOT EXISTS idx_saved_cars_interest ON buyer_saved_cars(interest_level);

-- 4. BUYER INTERACTIONS TABLE
-- Tracks buyer interactions with cars (views, inquiries, buy clicks)
CREATE TABLE IF NOT EXISTS buyer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Buyer reference (nullable for anonymous users)
  buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL,

  -- Car reference
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

  -- Dealer reference
  dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,

  -- Interaction type
  interaction_type VARCHAR(30) NOT NULL CHECK (interaction_type IN ('view', 'save', 'unsave', 'inquiry', 'buy_click', 'call_click', 'whatsapp_click')),

  -- Session info
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_interactions_buyer ON buyer_interactions(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_car ON buyer_interactions(car_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_dealer ON buyer_interactions(dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON buyer_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON buyer_interactions(created_at DESC);

-- 5. TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to conversations table
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to messages table
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to buyer_saved_cars table
DROP TRIGGER IF EXISTS update_saved_cars_updated_at ON buyer_saved_cars;
CREATE TRIGGER update_saved_cars_updated_at BEFORE UPDATE ON buyer_saved_cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. FUNCTION TO UPDATE CONVERSATION ON NEW MESSAGE
-- Automatically update conversation metadata when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_text = NEW.message_text,
    last_message_at = NEW.created_at,
    last_message_sender_type = NEW.sender_type,
    unread_count_buyer = CASE WHEN NEW.sender_type != 'buyer' THEN unread_count_buyer + 1 ELSE unread_count_buyer END,
    unread_count_dealer = CASE WHEN NEW.sender_type != 'dealer' THEN unread_count_dealer + 1 ELSE unread_count_dealer END,
    unread_count_admin = CASE WHEN NEW.sender_type != 'admin' THEN unread_count_admin + 1 ELSE unread_count_admin END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to messages table
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_new_message();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_saved_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_interactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Buyers can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Dealers can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Buyers can manage their saved cars" ON buyer_saved_cars;
DROP POLICY IF EXISTS "Anyone can create interactions" ON buyer_interactions;
DROP POLICY IF EXISTS "Users can view their own interactions" ON buyer_interactions;

-- Conversations: Buyers can see their own conversations
CREATE POLICY "Buyers can view their own conversations"
  ON conversations FOR SELECT
  USING (buyer_id = auth.uid());

-- Conversations: Dealers can see conversations they're part of
CREATE POLICY "Dealers can view their conversations"
  ON conversations FOR SELECT
  USING (dealer_id = auth.uid());

-- Conversations: Admins can see all conversations
CREATE POLICY "Admins can view all conversations"
  ON conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Messages: Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.buyer_id = auth.uid()
        OR conversations.dealer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
      )
    )
  );

-- Messages: Users can insert messages in their conversations
CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        (conversations.buyer_id = auth.uid() AND messages.sender_type = 'buyer')
        OR (conversations.dealer_id = auth.uid() AND messages.sender_type = 'dealer')
        OR (messages.sender_type = 'admin' AND EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        ))
      )
    )
  );

-- Saved Cars: Buyers can manage their own saved cars
CREATE POLICY "Buyers can manage their saved cars"
  ON buyer_saved_cars FOR ALL
  USING (buyer_id = auth.uid());

-- Buyer Interactions: Anyone can insert interactions
CREATE POLICY "Anyone can create interactions"
  ON buyer_interactions FOR INSERT
  WITH CHECK (true);

-- Buyer Interactions: Users can view their own interactions
CREATE POLICY "Users can view their own interactions"
  ON buyer_interactions FOR SELECT
  USING (buyer_id = auth.uid() OR buyer_id IS NULL);

-- Verify installation
SELECT 'Chat schema installed successfully!' as status;
