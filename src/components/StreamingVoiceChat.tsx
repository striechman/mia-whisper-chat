
'use client';

import { useState, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedChatBubble } from './animated/AnimatedChatBubble';
import { AnimatedSiriRing } from './animated/AnimatedSiriRing';
import { useSupabaseRealtime, insertMessage } from '@/lib/supabase/chat';
import { useSimpleRecorder } from '@/lib/audio/useSimpleRecorder';
import { useMiaAudioStream } from '@/lib/audio/useMiaAudioStream';
import { useMiaSpeaking } from '@/lib/audio/useMiaSpeaking';
import { useMiaRecording } from '@/hooks/useMiaRecording';
import { toast } from 'sonner';

export function StreamingVoiceChat() {
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'mia';
    content: string;
    created_at: string;
  }>>([]);
  
  const { 
    isRecording, 
    isProcessing, 
    startRecording, 
    stopRecording, 
    transcribeAudio,
    cleanup 
  } = useSimpleRecorder();

  const { stream: miaStream } = useMiaAudioStream('miaAudio');
  const { startRecording: startMiaRecording, stopRecording: stopMiaRecording } = useMiaRecording();
  
  const [isMiaSpeaking, setIsMiaSpeaking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Realtime subscription
  useSupabaseRealtime(setMessages);

  // زيهوי דיבור של MIA וטיפול באנטי-Echo
  const handleMiaSpeaking = useCallback(async (speaking: boolean) => {
    setIsMiaSpeaking(speaking);
    
    // אנטי-Echo: השתק מיקרופון כשMIA מדברת
    if (micStreamRef.current) {
      const micTrack = micStreamRef.current.getAudioTracks()[0];
      if (micTrack) {
        micTrack.enabled = !speaking;
        console.log(speaking ? '🔇 Microphone muted (MIA speaking)' : '🎤 Microphone unmuted');
      }
    }

    // הקלטת MIA
    if (speaking && miaStream) {
      await startMiaRecording(miaStream);
    } else if (!speaking) {
      await stopMiaRecording();
    }
  }, [miaStream, startMiaRecording, stopMiaRecording]);

  useMiaSpeaking(miaStream, handleMiaSpeaking);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setPermissionGranted(true);
      console.log('✅ Microphone permission granted');
    } catch (error) {
      setPermissionGranted(false);
      console.error('❌ Microphone permission denied:', error);
    }
  };

  const handleMicClick = async () => {
    try {
      if (isRecording) {
        // Stop recording and transcribe
        console.log('🛑 Stopping recording...');
        const audioBlob = await stopRecording();
        
        if (audioBlob && audioBlob.size > 0) {
          const transcription = await transcribeAudio(audioBlob);
          
          if (transcription.trim()) {
            await insertMessage('user', transcription.trim());
            toast.success('הודעה נשלחה בהצלחה');
          } else {
            toast.error('לא זוהה טקסט. נסה שוב.');
          }
        }
      } else {
        // Start recording
        if (permissionGranted === null) {
          await checkMicrophonePermission();
        }
        
        if (permissionGranted !== false && !isMiaSpeaking) {
          console.log('🎤 Starting recording...');
          await startRecording();
          toast.info('מקליט... לחץ שוב כדי לסיים');
        } else if (isMiaSpeaking) {
          toast.error('המתן עד שMIA תסיים לדבר');
        } else {
          toast.error('נדרשת הרשאה לשימוש במיקרופון');
        }
      }
    } catch (error) {
      console.error('❌ Error in mic handler:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה לא ידועה');
      cleanup();
    }
  };

  const getStatusText = () => {
    if (isProcessing) return 'מעבד את ההקלטה...';
    if (isRecording) return 'מקליט... לחץ כדי לסיים';
    if (isMiaSpeaking) return 'MIA מדברת...';
    if (permissionGranted === false) return 'נדרשת הרשאה למיקרופון';
    return 'לחץ כדי להקליט הודעה';
  };

  const getMicIcon = () => {
    if (isProcessing) {
      return <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />;
    }
    if (isRecording) {
      return <MicOff className="w-6 h-6 text-white" />;
    }
    if (isMiaSpeaking) {
      return <Volume2 className="w-6 h-6 text-white" />;
    }
    return <Mic className="w-6 h-6 text-white" />;
  };

  const getButtonStyle = () => {
    if (isRecording) {
      return 'bg-red-500 hover:bg-red-600 animate-pulse';
    }
    if (isMiaSpeaking) {
      return 'bg-purple-500 hover:bg-purple-600';
    }
    if (isProcessing) {
      return 'bg-blue-500 cursor-wait';
    }
    return 'bg-white/20 hover:bg-white/30';
  };

  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-[#0F0C29] via-[#24243e] to-[#302B63] relative">
      {/* Hidden audio element for MIA */}
      <audio id="miaAudio" className="hidden" />
      
      {/* MIA Avatar Section */}
      <div className="flex justify-center pt-8 pb-4">
        <div className="relative w-32 h-32">
          <img
            src="/placeholder.svg"
            alt="MIA"
            className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
          />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center text-white/70 py-8">
            <p>👋 שלום! אני MIA. לחץ על המיקרופון כדי להתחיל לדבר איתי.</p>
          </div>
        )}
        {messages.map((message) => (
          <AnimatedChatBubble key={message.id} message={message} />
        ))}
      </div>

      {/* Microphone Button */}
      <div className="flex justify-center pb-8">
        <Button
          onClick={handleMicClick}
          disabled={isProcessing || isMiaSpeaking}
          className={`w-16 h-16 rounded-full transition-all duration-200 ${getButtonStyle()} border-2 border-white/30`}
        >
          {getMicIcon()}
        </Button>
      </div>

      {/* Status Text */}
      <div className="text-center pb-4">
        <p className="text-white/60 text-sm">
          {getStatusText()}
        </p>
      </div>

      {/* Animated Siri Ring */}
      <AnimatedSiriRing isActive={isMiaSpeaking} />
    </main>
  );
}
