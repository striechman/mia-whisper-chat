
'use client';

import { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatBubble } from './ChatBubble';
import { SiriRing } from './SiriRing';
import { ChatMessage, useSupabaseRealtime, insertMessage } from '@/lib/supabase/chat';
import { useMicrophoneStream } from '@/lib/audio/useMicrophoneStream';
import { useMiaAudioStream } from '@/lib/audio/useMiaAudioStream';
import { useMiaSpeaking } from '@/lib/audio/useMiaSpeaking';
import { useVAD } from '@/lib/audio/useVAD';
import { transcribe } from '@/lib/openai/whisper';
import { useToast } from '@/hooks/use-toast';

export function VoiceChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  // Initialize hooks
  const { stream: micStream, startMicrophone, stopMicrophone } = useMicrophoneStream();
  const { stream: miaStream } = useMiaAudioStream('miaAudio');
  const { isMiaSpeaking } = useMiaSpeaking(miaStream);
  
  // Realtime subscription
  useSupabaseRealtime(setMessages);

  // VAD for user microphone
  useVAD(
    micStream,
    () => {
      console.log('User started speaking');
    },
    async () => {
      console.log('User stopped speaking - processing recording');
      if (isRecording) {
        await stopRecording();
      }
    }
  );

  const startRecording = async () => {
    try {
      const stream = await startMicrophone();
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not start recording. Please check microphone permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      
      recorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        setIsRecording(false);
        setIsTranscribing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('Audio blob created:', audioBlob.size, 'bytes');
          
          const transcriptionText = await transcribe(audioBlob);
          
          if (transcriptionText.trim()) {
            await insertMessage('user', transcriptionText);
            toast({
              title: "Message sent",
              description: transcriptionText,
            });
          }
        } catch (error) {
          console.error('Error processing recording:', error);
          toast({
            title: "Transcription Error",
            description: "Could not process your recording. Please try again.",
            variant: "destructive"
          });
        } finally {
          setIsTranscribing(false);
          stopMicrophone();
          resolve();
        }
      };
      
      recorder.stop();
    });
  };

  const handleMicClick = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#24243e] to-[#302B63] flex flex-col items-center justify-center p-4">
      {/* Hidden audio element for MIA */}
      <audio id="miaAudio" className="hidden" />
      
      <div className="w-full max-w-md flex flex-col h-[80vh]">
        {/* MIA Avatar with Siri Ring */}
        <div className="relative flex justify-center mb-8">
          <div className="relative w-32 h-32">
            <img
              src="/placeholder.svg"
              alt="MIA"
              className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
            />
            <SiriRing isActive={isMiaSpeaking} />
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 px-2">
          {messages.length === 0 && (
            <div className="text-center text-white/70 py-8">
              <p>👋 Hi! I'm MIA. Press the microphone to start our conversation.</p>
            </div>
          )}
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </div>

        {/* Microphone Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleMicClick}
            disabled={isTranscribing}
            className={`w-16 h-16 rounded-full transition-all duration-200 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-white/20 hover:bg-white/30'
            } border-2 border-white/30`}
          >
            {isTranscribing ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </Button>
        </div>

        {/* Status Text */}
        <div className="text-center mt-4">
          <p className="text-white/60 text-sm">
            {isTranscribing
              ? 'Processing your message...'
              : isRecording
              ? 'Recording... Stop speaking to send'
              : 'Tap to speak with MIA'}
          </p>
        </div>
      </div>
    </div>
  );
}
