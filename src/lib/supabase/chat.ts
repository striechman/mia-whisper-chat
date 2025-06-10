
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export type ChatMessage = {
  id: string;
  role: 'user' | 'mia';
  content: string;
  created_at: string;
};

export async function insertMessage(role: 'user' | 'mia', content: string) {
  console.log('Inserting message:', { role, content });
  
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ role, content })
    .select()
    .single();

  if (error) {
    console.error('Error inserting message:', error);
    throw error;
  }

  return data as ChatMessage;
}

export function useSupabaseRealtime(setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>) {
  useEffect(() => {
    // Fetch existing messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Cast the data to ChatMessage type
      const messages = (data || []).map(item => ({
        id: item.id,
        role: item.role as 'user' | 'mia',
        content: item.content,
        created_at: item.created_at
      }));

      setMessages(messages);
    };

    fetchMessages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('chat_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('New message received:', payload.new);
          const newMessage: ChatMessage = {
            id: payload.new.id,
            role: payload.new.role as 'user' | 'mia',
            content: payload.new.content,
            created_at: payload.new.created_at
          };
          setMessages((prev: ChatMessage[]) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setMessages]);
}
