'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Square, Volume2, CheckCircle, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatBubble } from './ChatBubble';
import { SiriRing } from './SiriRing';
import { ChatMessage, useSupabaseRealtime, insertMessage } from '@/lib/supabase/chat';
import { useMicrophoneStream } from '@/lib/audio/useMicrophoneStream';
import { useTabAudioCapture } from '@/lib/audio/useTabAudioCapture';
import { useMiaSpeaking } from '@/lib/audio/useMiaSpeaking';
import { useVAD } from '@/lib/audio/useVAD';
import { useUserRecording } from '@/lib/audio/useUserRecording';
import { transcribe } from '@/lib/openai/whisper';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function VoiceChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0=open-mia, 1=capture-audio, 2=chat
  const [isListening, setIsListening] = useState(false);
  const [isMiaSpeaking, setIsMiaSpeaking] = useState(false);
  const [isMiaRecording, setIsMiaRecording] = useState(false);
  const [miaTabOpened, setMiaTabOpened] = useState(false);
  
  const miaRecorderRef = useRef<MediaRecorder | null>(null);
  const miaAudioChunksRef = useRef<Blob[]>([]);
  const hiddenAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Initialize hooks
  const { stream: micStream, startMicrophone, stopMicrophone } = useMicrophoneStream();
  const { stream: miaStream, startTabCapture, stopTabCapture } = useTabAudioCapture();
  const { isRecording, isTranscribing, startRecording, stopRecording } = useUserRecording();
  
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

  // VAD for user microphone - SIMPLIFIED
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

  const openMiaInNewTab = () => {
    window.open("https://online.meetinginsights.audiocodes.com/uigpt/miamarketing/index.php", "_blank");
    setMiaTabOpened(true);
    setStep(1);
    
    toast({
      title: "MIA נפתחה בטאב חדש!",
      description: "מלא את הפרטים בטאב החדש ולחץ 'Start'. אחר כך חזור לכאן ולחץ 'התחל להאזין ל-MIA'.",
    });
  };

  const captureMiaTabAudio = async () => {
    try {
      console.log('🎧 Starting MIA tab audio capture...');
      
      await clearChatHistory();
      
      toast({
        title: "הוראות שיתוף אודיו",
        description: "🟣 בחר את הטאב שבו MIA פתוחה ושתף את האודיו כדי להאזין לה כאן",
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
        title: "שיתוף אודיו הצליח!",
        description: "כעת אתה יכול להתחיל לדבר עם MIA. האזנה לטאב MIA פעילה!",
      });
    } catch (error) {
      console.error('❌ Error capturing MIA tab audio:', error);
      
      let errorMessage = "בבקשה נסה שוב";
      if (error instanceof Error) {
        if (error.message.includes('No audio track')) {
          errorMessage = "לא נמצא אודיו. ודא שבחרת את הטאב עם MIA ושמסומן 'Also share tab audio'";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "שגיאה בשיתוף אודיו",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const startMiaRecording = async () => {
    if (!miaStream || isMiaRecording) {
      console.log('⚠️ Cannot start MIA recording - no stream or already recording');
      return;
    }
    
    try {
      console.log('🎙️ Starting MIA recording...');
      const mediaRecorder = new MediaRecorder(miaStream, {
        mimeType: 'audio/webm',
      });
      
      miaAudioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('📊 MIA audio chunk received:', event.data.size, 'bytes');
          miaAudioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      miaRecorderRef.current = mediaRecorder;
      setIsMiaRecording(true);
      
      console.log('✅ MIA recording started successfully');
    } catch (error) {
      console.error('❌ Error starting MIA recording:', error);
    }
  };

  const stopMiaRecording = async () => {
    if (!miaRecorderRef.current || !isMiaRecording) {
      console.log('⚠️ Cannot stop MIA recording - no recorder or not recording');
      return;
    }

    return new Promise<void>((resolve) => {
      const recorder = miaRecorderRef.current!;
      
      recorder.onstop = async () => {
        console.log('🛑 MIA recording stopped, processing audio...');
        setIsMiaRecording(false);
        
        try {
          const audioBlob = new Blob(miaAudioChunksRef.current, { type: 'audio/webm' });
          console.log('📦 MIA audio blob created:', audioBlob.size, 'bytes');
          
          if (audioBlob.size > 2000) {
            console.log('🔄 Starting MIA transcription...');
            const transcriptionText = await transcribe(audioBlob);
            console.log('📝 MIA transcription completed:', transcriptionText);
            
            if (transcriptionText.trim()) {
              console.log('💾 Saving MIA message to database...');
              await insertMessage('mia', transcriptionText);
              console.log('✅ MIA message saved successfully');
              
              toast({
                title: "MIA אמרה",
                description: transcriptionText,
              });
            } else {
              console.log('⚠️ MIA transcription was empty, not saving');
            }
          } else {
            console.log('⚠️ MIA audio blob too small, skipping transcription');
          }
        } catch (error) {
          console.error('❌ Error processing MIA recording:', error);
          toast({
            title: "שגיאה בעיבוד הקלטת MIA",
            description: error instanceof Error ? error.message : "נסה שוב",
            variant: "destructive"
          });
        } finally {
          resolve();
        }
      };
      
      recorder.stop();
    });
  };

  const handleStartListening = async () => {
    try {
      console.log('🎤 Starting microphone...');
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
      console.log('🛑 Stopping listening...');
      
      stopMicrophone();
      stopTabCapture();
      
      if (isMiaRecording) {
        stopMiaRecording();
      }
      
      // Reset all states
      setIsListening(false);
      setIsMiaRecording(false);
      setStep(0);
      setMiaTabOpened(false);
      
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
        
        {step === 0 && (
          <div className="flex flex-col items-center gap-6 text-white/80">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">שלב 1: פתח את MIA בטאב חדש</h2>
              <p className="text-white/70 mb-4">לחץ על הכפתור למטה כדי לפתוח את MIA בטאב נפרד</p>
              
              <div className="text-sm text-white/50 space-y-2 bg-white/5 p-4 rounded-lg max-w-md">
                <p className="font-semibold text-white/70">הוראות:</p>
                <p>1️⃣ לחץ "פתח את MIA בטאב חדש"</p>
                <p>2️⃣ מלא פרטים בטאב החדש ולחץ "Start"</p>
                <p>3️⃣ חזור לטאב הזה ועבור לשלב הבא</p>
              </div>
            </div>
            
            <Button 
              onClick={openMiaInNewTab}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-lg font-semibold"
            >
              <ExternalLink className="w-6 h-6 mr-2" />
              פתח את MIA בטאב חדש
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col items-center gap-6 text-white/80">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">שלב 2: התחל להאזין ל-MIA</h2>
              <p className="text-white/70 mb-4">כעת לכוד את האודיו של MIA מהטאב השני</p>
              
              <div className="text-sm text-white/50 space-y-2 bg-white/5 p-4 rounded-lg max-w-md">
                <p className="font-semibold text-white/70">הוראות מפורטות:</p>
                <p>1️⃣ לחץ "התחל להאזין ל-MIA" למטה</p>
                <p>2️⃣ בחר "Chrome Tab" (לא Window או Entire Screen)</p>
                <p>3️⃣ בחר את הטאב עם MIA</p>
                <p>4️⃣ ✅ ודא שמסומן "Also share tab audio"</p>
                <p>5️⃣ לחץ "Share"</p>
              </div>
            </div>
            
            <Button 
              onClick={captureMiaTabAudio}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-lg font-semibold"
            >
              <Volume2 className="w-6 h-6 mr-2" />
              התחל להאזין ל-MIA
            </Button>
            
            <div className="text-xs text-white/40 text-center max-w-md">
              הדפדפן דורש הרשאה למניעת הקלטה נסתרת - זה נורמלי גם לטאב אחר
            </div>
          </div>
        )}

        {/* Step 2: Voice Chat - SIMPLIFIED WITHOUT DRAFT */}
        {step === 2 && (
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

            {/* Chat Messages - NO MORE DRAFT BUBBLE */}
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
