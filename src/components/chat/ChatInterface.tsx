
import { CheckCircle, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatBubble } from '../ChatBubble';
import { SiriRing } from '../SiriRing';
import { ChatMessage } from '@/lib/supabase/chat';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isMiaSpeaking: boolean;
  isListening: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  onMainButtonClick: () => void;
}

export function ChatInterface({
  messages,
  isMiaSpeaking,
  isListening,
  isRecording,
  isTranscribing,
  onMainButtonClick
}: ChatInterfaceProps) {
  const getMainButtonContent = () => {
    if (isTranscribing) {
      return <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />;
    }
    
    if (isListening) {
      return <Square className="w-6 h-6 text-white" />;
    }
    
    return <Play className="w-6 h-6 text-white" />;
  };

  const getStatusText = () => {
    if (isTranscribing) {
      return 'מעבד את ההודעה שלך...';
    }
    if (isRecording) {
      return 'מקליט... הפסק לדבר כדי לשלוח';
    }
    if (isMiaSpeaking) {
      return 'MIA מדברת...';
    }
    if (isListening) {
      return 'מאזין... התחל לדבר';
    }
    return 'מוכן לצ׳אט עם MIA';
  };

  return (
    <>
      {/* Success indicator */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-4 text-green-400 mb-2">
          <CheckCircle className="w-5 h-5" />
          <span>מחובר בהצלחה ל-MIA! (מאזין לטאב)</span>
        </div>
      </div>

      {/* MIA Avatar with Siri Ring */}
      <div className="relative flex justify-center my-6">
        <div className="relative w-24 h-24">
          <img
            src="/placeholder.svg"
            alt="MIA"
            className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
          />
          <SiriRing isActive={isMiaSpeaking} />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6 px-2">
        {messages.length === 0 && (
          <div className="text-center text-white/70 py-8">
            <p>✅ מוכן! התחל לדבר עם MIA.</p>
          </div>
        )}
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
      </div>

      {/* Main Control Button */}
      <div className="flex justify-center">
        <Button
          onClick={onMainButtonClick}
          disabled={isTranscribing}
          className={`w-16 h-16 rounded-full transition-all duration-200 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          } border-2 border-white/30`}
        >
          {getMainButtonContent()}
        </Button>
      </div>

      {/* Status Text */}
      <div className="text-center mt-4">
        <p className="text-white/60 text-sm">
          {getStatusText()}
        </p>
      </div>
    </>
  );
}
