
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage, useSupabaseRealtime } from '@/lib/supabase/chat';
import { useMicrophoneStream } from '@/lib/audio/useMicrophoneStream';
import { useTabAudioCapture } from '@/lib/audio/useTabAudioCapture';
import { useMiaSpeaking } from '@/lib/audio/useMiaSpeaking';
import { useVAD } from '@/lib/audio/useVAD';
import { useUserRecording } from '@/lib/audio/useUserRecording';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useChatSteps } from '@/hooks/useChatSteps';
import { useMiaRecording } from '@/hooks/useMiaRecording';
import { InitialStep } from './chat/InitialStep';
import { AudioSetupStep } from './chat/AudioSetupStep';
import { ChatInterface } from './chat/ChatInterface';

export function VoiceChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isMiaSpeaking, setIsMiaSpeaking] = useState(false);
  
  const hiddenAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Custom hooks
  const { step, openMiaInNewTab, setStep } = useChatSteps();
  const { stream: micStream, startMicrophone, stopMicrophone } = useMicrophoneStream();
  const { stream: miaStream, startTabCapture, stopTabCapture } = useTabAudioCapture();
  const { isRecording, isTranscribing, startRecording, stopRecording } = useUserRecording();
  const { isMiaRecording, startMiaRecording, stopMiaRecording } = useMiaRecording();
  
  // MIA speaking detection with callback
  useMiaSpeaking(miaStream, async (speaking: boolean) => {
    console.log(speaking ? '🗣️ MIA started speaking' : '🤐 MIA stopped speaking');
    setIsMiaSpeaking(speaking);
    
    // Anti-echo: disable microphone when MIA is speaking
    if (micStream) {
      const micTrack = micStream.getAudioTracks()[0];
      if (micTrack) {
        micTrack.enabled = !speaking;
      }
    }
    
    // Start/stop MIA recording based on speaking
    if (speaking && !isMiaRecording && miaStream) {
      await startMiaRecording(miaStream);
    } else if (!speaking && isMiaRecording) {
      await stopMiaRecording();
    }
  });
  
  // Realtime subscription
  useSupabaseRealtime(setMessages);

  // Keep MIA stream alive with hidden audio element
  useEffect(() => {
    if (miaStream && !hiddenAudioRef.current) {
      const hiddenAudio = new Audio();
      hiddenAudio.srcObject = miaStream;
      hiddenAudio.muted = true;
      hiddenAudio.play().catch(() => {});
      hiddenAudioRef.current = hiddenAudio;
    }
  }, [miaStream]);

  // VAD for user microphone
  useVAD(
    micStream,
    () => {
      console.log('🎤 User started speaking');
      if (!isMiaSpeaking && !isRecording && !isTranscribing && micStream) {
        console.log('✅ Starting user recording...');
        startRecording(micStream);
      } else {
        console.log('⚠️ Skipping recording start - MIA speaking:', isMiaSpeaking, 'recording:', isRecording, 'transcribing:', isTranscribing);
      }
    },
    async () => {
      console.log('🎤 User stopped speaking - processing recording');
      if (isRecording) {
        console.log('✅ Stopping user recording...');
        await stopRecording();
      } else {
        console.log('⚠️ Skipping recording stop - not currently recording');
      }
    }
  );

  const clearChatHistory = async () => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error('Error clearing chat history:', error);
      } else {
        setMessages([]);
        console.log('✅ Chat history cleared automatically');
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const captureMiaTabAudio = async () => {
    try {
      console.log('🎧 Starting MIA tab audio capture...');
      
      await clearChatHistory();
      
      toast({
        title: "Audio sharing instructions",
        description: "🟣 Select the tab where MIA is open and share the audio to listen to her here",
      });
      
      const ms = await startTabCapture();
      
      const proxyAudio = document.getElementById('miaProxy') as HTMLAudioElement;
      if (proxyAudio) {
        proxyAudio.srcObject = ms;
        proxyAudio.muted = true;
        proxyAudio.play().catch(() => {});
      }
      
      setStep(2);
      
      console.log('✅ MIA tab audio captured successfully');
      
      toast({
        title: "Audio sharing successful!",
        description: "You can now start talking with MIA. Listening to MIA tab is active!",
      });
    } catch (error) {
      console.error('❌ Error capturing MIA tab audio:', error);
      
      let errorMessage = "Please try again";
      if (error instanceof Error) {
        if (error.message.includes('No audio track')) {
          errorMessage = "No audio found. Make sure you selected the tab with MIA and that 'Also share tab audio' is checked";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Audio sharing error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleStartListening = async () => {
    try {
      console.log('🎤 Starting microphone...');
      await startMicrophone();
      setIsListening(true);
      
      toast({
        title: "Microphone activated",
        description: "Start talking with MIA!",
      });
    } catch (error) {
      console.error('❌ Error starting microphone:', error);
      toast({
        title: "Microphone error",
        description: "Please allow microphone access and try again.",
        variant: "destructive"
      });
    }
  };

  const handleStopListening = () => {
    try {
      console.log('🛑 Stopping listening...');
      
      stopMicrophone();
      stopTabCapture();
      
      if (isMiaRecording) {
        stopMiaRecording();
      }
      
      // Reset all states
      setIsListening(false);
      setStep(0);
      
      toast({
        title: "Stopped listening",
        description: "Disconnected from all audio sources.",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#24243e] to-[#302B63] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col h-[90vh]">
        
        {/* Hidden audio element keeps MIA sound alive */}
        <audio id="miaProxy" className="hidden" />
        
        {step === 0 && <InitialStep onOpenMiaTab={openMiaInNewTab} />}

        {step === 1 && <AudioSetupStep onCaptureAudio={captureMiaTabAudio} />}

        {step === 2 && (
          <ChatInterface
            messages={messages}
            isMiaSpeaking={isMiaSpeaking}
            isListening={isListening}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            onMainButtonClick={handleMainButtonClick}
          />
        )}
      </div>
    </div>
  );
}
