
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ChatMessage = {
  id: string;
  role: 'user' | 'mia';
  content: string;
  created_at: string;
  isOptimistic?: boolean;
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) {
          console.error('Error fetching messages:', error);
          toast.error('Failed to load chat history');
          return;
        }

        const typedMessages = (data || []).map(item => ({
          id: item.id,
          role: item.role as 'user' | 'mia',
          content: item.content,
          created_at: item.created_at
        }));

        setMessages(typedMessages);
      } catch (error) {
        console.error('Error in fetchMessages:', error);
        toast.error('Failed to load chat history');
      }
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
          
          // Remove optimistic message and add real one
          setMessages((prev: ChatMessage[]) => {
            const withoutOptimistic = prev.filter(m => !m.isOptimistic || m.content !== newMessage.content);
            return [...withoutOptimistic, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const insertMessage = async (role: 'user' | 'mia', content: string) => {
    try {
      // Optimistic update
      const optimisticMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role,
        content,
        created_at: new Date().toISOString(),
        isOptimistic: true
      };

      setMessages(prev => [...prev, optimisticMessage]);

      // Insert to database
      const { error } = await supabase
        .from('chat_messages')
        .insert({ role, content });

      if (error) {
        console.error('Error inserting message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        toast.error('Failed to send message');
        throw error;
      }

      console.log('Message inserted successfully');
    } catch (error) {
      console.error('Error in insertMessage:', error);
      throw error;
    }
  };

  const updateDraftMessage = (content: string) => {
    setMessages(prev => {
      const withoutDraft = prev.filter(m => !m.isOptimistic || m.role !== 'user');
      if (content.trim()) {
        const draftMessage: ChatMessage = {
          id: 'draft',
          role: 'user',
          content,
          created_at: new Date().toISOString(),
          isOptimistic: true
        };
        return [...withoutDraft, draftMessage];
      }
      return withoutDraft;
    });
  };

  const clearDraft = () => {
    setMessages(prev => prev.filter(m => m.id !== 'draft'));
  };

  return {
    messages,
    insertMessage,
    updateDraftMessage,
    clearDraft
  };
}
