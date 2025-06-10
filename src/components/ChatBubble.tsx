
import { ChatMessage } from "@/lib/supabase/chat";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-3xl ${
          isUser
            ? 'bubble-user bg-emerald-500 text-white'
            : 'bubble-mia bg-zinc-800 text-white'
        } shadow-lg`}
      >
        <p className="text-sm">{message.content}</p>
        <p className="text-xs opacity-70 mt-1">
          {new Date(message.created_at).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
