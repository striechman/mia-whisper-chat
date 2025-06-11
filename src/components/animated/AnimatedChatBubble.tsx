
import { motion } from 'framer-motion';

interface ChatMessage {
  id: string;
  role: 'user' | 'mia';
  content: string;
  created_at: string;
  isOptimistic?: boolean;
}

interface AnimatedChatBubbleProps {
  message: ChatMessage;
}

export function AnimatedChatBubble({ message }: AnimatedChatBubbleProps) {
  const isUser = message.role === 'user';
  const isDraft = message.isOptimistic && message.id === 'draft';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[75%] px-4 py-2 rounded-3xl shadow-lg min-h-[44px] flex items-center ${
          isUser
            ? 'bg-emerald-500 text-white'
            : 'bg-zinc-800 text-white'
        } ${isDraft ? 'opacity-70' : ''}`}
      >
        <div>
          <p className="text-sm">
            {isDraft && '🎤 '}
            {message.content}
            {isDraft && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="ml-1"
              >
                |
              </motion.span>
            )}
          </p>
          {!isDraft && (
            <p className="text-xs opacity-70 mt-1">
              {new Date(message.created_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
