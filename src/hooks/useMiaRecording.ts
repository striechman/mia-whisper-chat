
import { useState, useRef } from 'react';
import { transcribe } from '@/lib/openai/whisper';
import { insertMessage } from '@/lib/supabase/chat';
import { useToast } from '@/hooks/use-toast';

export function useMiaRecording() {
  const [isMiaRecording, setIsMiaRecording] = useState(false);
  const miaRecorderRef = useRef<MediaRecorder | null>(null);
  const miaAudioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startMiaRecording = async (miaStream: MediaStream) => {
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

  const stopMiaRecording = async (): Promise<void> => {
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

  return {
    isMiaRecording,
    startMiaRecording,
    stopMiaRecording
  };
}
