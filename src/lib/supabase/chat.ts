
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

  return data;
}

export function useSupabaseRealtime(setMessages: (messages: ChatMessage[]) => void) {
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

      setMessages(data || []);
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
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setMessages]);
}
