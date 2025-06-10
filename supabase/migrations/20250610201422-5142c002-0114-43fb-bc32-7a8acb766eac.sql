
-- Create the chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('user','mia')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access
CREATE POLICY "allow anon" ON chat_messages 
  FOR SELECT USING (true);

CREATE POLICY "insert anon" ON chat_messages 
  FOR INSERT WITH CHECK (true);

-- Enable realtime for the table
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
