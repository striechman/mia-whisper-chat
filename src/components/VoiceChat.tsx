'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Square, Volume2, CheckCircle, Settings } from 'lucide-react';
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
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0=share-audio, 1=mia-login, 2=chat
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMiaSpeaking, setIsMiaSpeaking] = useState(false);
  const [isMiaRecording, setIsMiaRecording] = useState(false);
  const [showMiaSettings, setShowMiaSettings] = useState(false);
  const [miaReady, setMiaReady] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const miaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const miaAudioChunksRef = useRef<Blob[]>([]);
  const hiddenAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Initialize hooks
  const { stream: micStream, startMicrophone, stopMicrophone } = useMicrophoneStream();
  const { stream: miaStream, capture, stopCapture } = useSelfTabAudio();
  
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

  const enableTabAudio = async () => {
    try {
      console.log('Starting tab audio capture...');
      
      toast({
        title: "הוראות חשובות",
        description: "1) בחר 'הטאב הזה' 2) ודא שמסומן 'שתף אודיו' 3) לחץ 'שתף'",
      });
      
      const ms = await capture(); // This will show browser's tab selection dialog
      
      // Keep audio alive with hidden proxy element
      const proxyAudio = document.getElementById('miaProxy') as HTMLAudioElement;
      if (proxyAudio) {
        proxyAudio.srcObject = ms;
        proxyAudio.muted = true;
        proxyAudio.play().catch(() => {});
      }
      
      setStep(1); // Move to MIA login step
      
      console.log('✅ Tab audio captured successfully');
      
      toast({
        title: "אודיו הופעל בהצלחה!",
        description: "כעת התחבר ל-MIA בחלון למטה.",
      });
    } catch (error) {
      console.error('❌ Error enabling tab audio:', error);
      
      let errorMessage = "בבקשה נסה שוב";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "שגיאה בהפעלת אודיו",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleMiaReady = () => {
    console.log('MIA is ready, user completed login');
    setMiaReady(true);
    
    toast({
      title: "MIA מוכן!",
      description: "לחץ 'התחל צ'אט' כדי להתחיל לדבר עם MIA.",
    });
  };

  const startChat = () => {
    setStep(2); // Move to chat step - iframe will be hidden
    
    toast({
      title: "MIA פועל ברקע - התחל לדבר!",
      description: "כעת אתה יכול להתחיל לדבר עם MIA. ה-iframe הוסתר אך האודיו ממשיך לפעול.",
    });
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
          
          if (audioBlob.size > 1000) {
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
        title: "המיקרופון הופעל",
        description: "התחל לדבר עם MIA!",
      });
    } catch (error) {
      console.error('❌ Error starting microphone:', error);
      toast({
        title: "שגיאת מיקרופון",
        description: "בבקשה אפשר גישה למיקרופון ונסה שוב.",
        variant: "destructive"
      });
    }
  };

  const handleStopListening = () => {
    try {
      console.log('Stopping listening...');
      
      stopMicrophone();
      stopCapture();
      
      if (isMiaRecording) {
        stopMiaRecording();
      }
      
      setIsListening(false);
      setIsRecording(false);
      setIsMiaRecording(false);
      setStep(0);
      
      toast({
        title: "הפסקת האזנה",
        description: "נותק מכל מקורות האודיו.",
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
    <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#24243e] to-[#302B63] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col h-[90vh]">
        
        {/* Hidden audio element keeps MIA sound alive */}
        <audio id="miaProxy" className="hidden" />
        
        {/* Step 0: Enable Audio First */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-6 text-white/80">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">שלב 1: הפעל שיתוף אודיו</h2>
              <p className="text-white/70 mb-2">לחץ על "הפעל אודיו" כדי לשתף את אודיו הטאב הזה</p>
              <div className="text-sm text-white/50 space-y-1">
                <p>🔍 בחר "הטאב הזה" (Current Tab)</p>
                <p>🔊 ודא שמסומן "שתף אודיו" (Share audio)</p>
                <p>✅ לחץ "שתף" (Share)</p>
              </div>
            </div>
            
            <Button 
              onClick={enableTabAudio}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-lg font-semibold"
            >
              <Volume2 className="w-6 h-6 mr-2" />
              הפעל אודיו
            </Button>
            
            <div className="text-xs text-white/40 text-center max-w-md">
              הדפדפן דורש הרשאה למניעת הקלטה נסתרת - זה נורמלי גם לטאב הנוכחי
            </div>
          </div>
        )}

        {/* Step 1: MIA Login - visible and waiting for user to complete */}
        {step === 1 && (
          <div className="space-y-4 text-white/80">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-white mb-2">שלב 2: התחבר ל-MIA</h2>
              <p className="text-white/70">מלא פרטים ולחץ Start בתוך ה-iframe, ואז לחץ "התחל צ'אט" למטה</p>
            </div>
            
            <iframe
              id="miaFrame"
              src="https://online.meetinginsights.audiocodes.com/uigpt/miamarketing/index.php"
              className="w-full h-[500px] rounded-xl border-2 border-white/20"
              allow="microphone; autoplay"
              sandbox="allow-scripts allow-forms allow-same-origin"
              title="MIA Chat Interface"
              onLoad={handleMiaReady}
            />
            
            {miaReady && (
              <div className="text-center mt-4">
                <Button 
                  onClick={startChat}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-lg font-semibold"
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  התחל צ'אט
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Voice Chat */}
        {step === 2 && (
          <>
            {/* Success indicator with settings button */}
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-4 text-green-400 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span>מחובר בהצלחה ל-MIA! (פועל ברקע)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMiaSettings(!showMiaSettings)}
                  className="text-white/60 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Optional: Show MIA settings iframe */}
              {showMiaSettings && (
                <div className="mt-4">
                  <iframe
                    id="miaSettingsFrame"
                    src="https://online.meetinginsights.audiocodes.com/uigpt/miamarketing/index.php"
                    className="w-full h-[300px] rounded-xl border-2 border-white/20"
                    allow="microphone; autoplay"
                    sandbox="allow-scripts allow-forms allow-same-origin"
                    title="MIA Settings"
                  />
                </div>
              )}
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
          </>
        )}
      </div>
    </div>
  );
}
