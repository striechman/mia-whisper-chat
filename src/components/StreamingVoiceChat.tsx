
'use client';

import { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedChatBubble } from './animated/AnimatedChatBubble';
import { AnimatedSiriRing } from './animated/AnimatedSiriRing';
import { useChat } from '@/lib/supabase/useChat';
import { useSmartMicrophone } from '@/lib/audio/useSmartMicrophone';
import { useMiaAudioStream } from '@/lib/audio/useMiaAudioStream';
import { useSmartMiaSpeaking } from '@/lib/audio/useSmartMiaSpeaking';
import { streamTranscribe, recordMicrophoneChunks } from '@/lib/openai/streamingWhisper';
import { toast } from 'sonner';

export function StreamingVoiceChat() {
  const { messages, insertMessage, updateDraftMessage, clearDraft } = useChat();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingAbortRef = useRef<AbortController | null>(null);

  // Initialize audio hooks
  const { 
    stream: micStream, 
    startMicrophone, 
    stopMicrophone, 
    muteMicrophone,
    isMuted 
  } = useSmartMicrophone();
  
  const { stream: miaStream } = useMiaAudioStream('miaAudio');
  
  const { isMiaSpeaking } = useSmartMiaSpeaking(
    miaStream,
    (shouldMute) => muteMicrophone(shouldMute)
  );

  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      setIsProcessing(true);
      clearDraft();
      
      const stream = await startMicrophone();
      const abortController = new AbortController();
      recordingAbortRef.current = abortController;
      
      let fullTranscript = '';
      
      try {
        // Start streaming transcription
        for await (const partialText of streamTranscribe(recordMicrophoneChunks(stream))) {
          if (abortController.signal.aborted) break;
          
          fullTranscript += (fullTranscript ? ' ' : '') + partialText;
          updateDraftMessage(fullTranscript);
          
          console.log('Partial transcription:', partialText);
          console.log('Full transcript so far:', fullTranscript);
        }
        
        // Finalize the message
        if (fullTranscript.trim() && !abortController.signal.aborted) {
          clearDraft();
          await insertMessage('user', fullTranscript.trim());
          toast.success('Message sent successfully');
        }
        
      } catch (error) {
        console.error('Error in streaming transcription:', error);
        toast.error('Transcription failed. Please try again.');
        clearDraft();
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not start recording. Please check microphone permissions.');
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
      stopMicrophone();
      recordingAbortRef.current = null;
    }
  };

  const handleStopRecording = () => {
    if (recordingAbortRef.current) {
      recordingAbortRef.current.abort();
    }
    setIsRecording(false);
    setIsProcessing(false);
    stopMicrophone();
  };

  const handleMicClick = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
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
            <p>👋 Hi! I'm MIA. Hold the microphone to start our conversation.</p>
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
          disabled={isProcessing && !isRecording}
          className={`w-16 h-16 rounded-full transition-all duration-200 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-white/20 hover:bg-white/30'
          } border-2 border-white/30`}
        >
          {isProcessing && !isRecording ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </Button>
      </div>

      {/* Status Text */}
      <div className="text-center pb-4">
        <p className="text-white/60 text-sm">
          {isProcessing && !isRecording
            ? 'Processing your message...'
            : isRecording
            ? 'Recording... Click to stop'
            : isMuted
            ? 'Microphone muted (MIA speaking)'
            : 'Hold to speak with MIA'}
        </p>
      </div>

      {/* Animated Siri Ring */}
      <AnimatedSiriRing isActive={isMiaSpeaking} />
    </main>
  );
}
