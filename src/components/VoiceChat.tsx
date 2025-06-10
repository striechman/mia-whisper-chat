
'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatBubble } from './ChatBubble';
import { SiriRing } from './SiriRing';
import { ChatMessage, useSupabaseRealtime, insertMessage } from '@/lib/supabase/chat';
import { useMicrophoneStream } from '@/lib/audio/useMicrophoneStream';
import { useTabAudioCapture } from '@/lib/audio/useTabAudioCapture';
import { useMiaSpeaking } from '@/lib/audio/useMiaSpeaking';
import { useVAD } from '@/lib/audio/useVAD';
import { transcribe } from '@/lib/openai/whisper';
import { useToast } from '@/hooks/use-toast';

export function VoiceChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMiaSpeaking, setIsMiaSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  // Initialize hooks
  const { stream: micStream, startMicrophone, stopMicrophone } = useMicrophoneStream();
  const { stream: miaStream, startTabCapture, stopTabCapture } = useTabAudioCapture();
  
  // MIA speaking detection with callback
  useMiaSpeaking(miaStream, (speaking: boolean) => {
    setIsMiaSpeaking(speaking);
    console.log(speaking ? 'MIA started speaking' : 'MIA stopped speaking');
  });
  
  // Realtime subscription
  useSupabaseRealtime(setMessages);

  // Connect MIA stream to audio element when available
  useEffect(() => {
    if (!miaStream) return;
    const el = document.getElementById('miaAudio') as HTMLAudioElement;
    if (el) {
      el.srcObject = miaStream;
      el.play().catch(console.error);
    }
  }, [miaStream]);

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
    if (!micStream) return;
    
    try {
      const mediaRecorder = new MediaRecorder(micStream, {
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
        description: "Could not start recording. Please try again.",
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
          resolve();
        }
      };
      
      recorder.stop();
    });
  };

  const handleStartListening = async () => {
    try {
      // Start microphone
      await startMicrophone();
      
      // Start tab capture for MIA
      await startTabCapture();
      
      setIsListening(true);
      
      toast({
        title: "Listening Started",
        description: "Connected to microphone and MIA audio. Start speaking!",
      });
    } catch (error) {
      console.error('Error starting listening:', error);
      toast({
        title: "Setup Error",
        description: "Could not start listening. Please check permissions and try again.",
        variant: "destructive"
      });
    }
  };

  const handleStopListening = () => {
    try {
      // Stop microphone
      stopMicrophone();
      
      // Stop tab capture
      stopTabCapture();
      
      setIsListening(false);
      setIsRecording(false);
      
      toast({
        title: "Listening Stopped",
        description: "Disconnected from audio sources.",
      });
    } catch (error) {
      console.error('Error stopping listening:', error);
    }
  };

  const handleMainButtonClick = () => {
    if (isListening) {
      handleStopListening();
    } else {
      handleStartListening();
    }
  };

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
      return 'Processing your message...';
    }
    if (isRecording) {
      return 'Recording... Stop speaking to send';
    }
    if (isMiaSpeaking) {
      return 'MIA is speaking...';
    }
    if (isListening) {
      return 'Listening... Start speaking';
    }
    return 'Click to start listening to you and MIA';
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
              <p>👋 Hi! I'm MIA. Click the button below to start our conversation.</p>
              <p className="mt-2 text-sm">You'll need to grant microphone access and select MIA's tab.</p>
            </div>
          )}
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </div>

        {/* Main Control Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleMainButtonClick}
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
      </div>
    </div>
  );
}
