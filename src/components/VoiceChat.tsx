'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Square, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatBubble } from './ChatBubble';
import { SiriRing } from './SiriRing';
import { ChatMessage, useSupabaseRealtime, insertMessage } from '@/lib/supabase/chat';
import { useMicrophoneStream } from '@/lib/audio/useMicrophoneStream';
import { useSelfTabAudio } from '@/lib/audio/useSelfTabAudio';
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
  const [isMiaRecording, setIsMiaRecording] = useState(false);
  const [miaVisible, setMiaVisible] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const miaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const miaAudioChunksRef = useRef<Blob[]>([]);
  const hiddenAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Initialize hooks
  const { stream: micStream, startMicrophone, stopMicrophone } = useMicrophoneStream();
  const { stream: miaStream, capture: captureTab, stopCapture } = useSelfTabAudio();
  
  // MIA speaking detection with callback
  useMiaSpeaking(miaStream, async (speaking: boolean) => {
    setIsMiaSpeaking(speaking);
    console.log(speaking ? 'MIA started speaking' : 'MIA stopped speaking');
    
    // Anti-echo: disable microphone when MIA is speaking
    if (micStream) {
      const micTrack = micStream.getAudioTracks()[0];
      if (micTrack) {
        micTrack.enabled = !speaking;
      }
    }
    
    // Start/stop MIA recording based on speaking
    if (speaking && !isMiaRecording) {
      await startMiaRecording();
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
      console.log('User started speaking');
    },
    async () => {
      console.log('User stopped speaking - processing recording');
      if (isRecording) {
        await stopRecording();
      }
    }
  );

  const startMiaInside = async () => {
    try {
      setMiaVisible(true);
      console.log('Starting MIA inside page...');
      
      // Capture this tab's audio
      const mediaStream = await captureTab();
      console.log('✅ Tab audio captured successfully');
      
      toast({
        title: "MIA Launched",
        description: "MIA iframe loaded and audio capture started. You can now log in to MIA.",
      });
    } catch (error) {
      console.error('❌ Error launching MIA:', error);
      setMiaVisible(false);
      toast({
        title: "Tab Capture Error",
        description: "Need tab-audio permission. Please try again and select 'This Tab'.",
        variant: "destructive"
      });
    }
  };

  const startMiaRecording = async () => {
    if (!miaStream || isMiaRecording) return;
    
    try {
      const mediaRecorder = new MediaRecorder(miaStream, {
        mimeType: 'audio/webm',
      });
      
      miaAudioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          miaAudioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      miaRecorderRef.current = mediaRecorder;
      setIsMiaRecording(true);
      
      console.log('MIA recording started');
    } catch (error) {
      console.error('Error starting MIA recording:', error);
    }
  };

  const stopMiaRecording = async () => {
    if (!miaRecorderRef.current || !isMiaRecording) return;

    return new Promise<void>((resolve) => {
      const recorder = miaRecorderRef.current!;
      
      recorder.onstop = async () => {
        console.log('MIA recording stopped, processing audio...');
        setIsMiaRecording(false);
        
        try {
          const audioBlob = new Blob(miaAudioChunksRef.current, { type: 'audio/webm' });
          console.log('MIA audio blob created:', audioBlob.size, 'bytes');
          
          if (audioBlob.size > 1000) { // Only transcribe if there's meaningful audio
            const transcriptionText = await transcribe(audioBlob);
            
            if (transcriptionText.trim()) {
              await insertMessage('mia', transcriptionText);
              console.log('MIA message saved:', transcriptionText);
            }
          }
        } catch (error) {
          console.error('Error processing MIA recording:', error);
        } finally {
          resolve();
        }
      };
      
      recorder.stop();
    });
  };

  const startRecording = async () => {
    if (!micStream) {
      console.error('No microphone stream available for recording');
      return;
    }
    
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
      console.log('Starting microphone...');
      await startMicrophone();
      setIsListening(true);
      
      toast({
        title: "Listening Started",
        description: "Connected to microphone. Start speaking!",
      });
    } catch (error) {
      console.error('❌ Microphone error:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const handleStopListening = () => {
    try {
      console.log('Stopping listening...');
      
      // Stop microphone
      stopMicrophone();
      console.log('✅ Microphone stopped');
      
      // Stop tab capture
      stopCapture();
      console.log('✅ Tab capture stopped');
      
      // Stop any ongoing recordings
      if (isMiaRecording) {
        stopMiaRecording();
      }
      
      setIsListening(false);
      setIsRecording(false);
      setIsMiaRecording(false);
      setMiaVisible(false);
      
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
      <div className="w-full max-w-4xl flex flex-col h-[90vh]">
        {/* MIA Launch Button */}
        {!miaVisible && (
          <div className="text-center mb-6">
            <Button
              onClick={startMiaInside}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Launch MIA Inside Page
            </Button>
          </div>
        )}

        {/* MIA iframe */}
        <iframe
          id="miaFrame"
          src="https://online.meetinginsights.audiocodes.com/uigpt/miamarketing/index.php"
          className={`w-full h-[450px] rounded-xl border-2 border-white/20 mt-2 ${miaVisible ? '' : 'hidden'}`}
          allow="microphone; autoplay"
          sandbox="allow-scripts allow-forms allow-same-origin"
          title="MIA Chat Interface"
        />

        {/* MIA Avatar with Siri Ring */}
        {miaVisible && (
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
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 px-2">
          {messages.length === 0 && isListening && (
            <div className="text-center text-white/70 py-8">
              <p>✅ Ready! Start speaking to chat with MIA.</p>
            </div>
          )}
          {messages.length === 0 && !isListening && (
            <div className="text-center text-white/70 py-8">
              <p>👋 Hi! I'm MIA. Launch me above to start our conversation.</p>
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
