
import { useState, useRef, useCallback } from 'react';
import { transcribe } from '@/lib/openai/whisper';
import { insertMessage } from '@/lib/supabase/chat';
import { useToast } from '@/hooks/use-toast';

export function useUserRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = useCallback(async (stream: MediaStream) => {
    if (isRecording || !stream) {
      console.log('⚠️ Cannot start recording - already recording or no stream');
      return;
    }

    try {
      console.log('🎙️ Starting user recording...');
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('📊 User audio chunk received:', event.data.size, 'bytes');
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      console.log('✅ User recording started successfully');
    } catch (error) {
      console.error('❌ Error starting user recording:', error);
      toast({
        title: "שגיאה בהקלטה",
        description: "לא הצלחנו להתחיל הקלטה. נסה שוב.",
        variant: "destructive"
      });
    }
  }, [isRecording, toast]);

  const stopRecording = useCallback(async (): Promise<void> => {
    if (!mediaRecorderRef.current || !isRecording) {
      console.log('⚠️ Cannot stop recording - no recorder or not recording');
      return;
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current!;
      
      recorder.onstop = async () => {
        console.log('🛑 User recording stopped, processing audio...');
        setIsRecording(false);
        setIsTranscribing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('📦 User audio blob created:', audioBlob.size, 'bytes');
          
          if (audioBlob.size > 2000) {
            console.log('🔄 Starting user transcription...');
            const transcriptionText = await transcribe(audioBlob);
            console.log('📝 User transcription completed:', transcriptionText);
            
            if (transcriptionText.trim()) {
              console.log('💾 Saving user message to database...');
              await insertMessage('user', transcriptionText.trim());
              console.log('✅ User message saved successfully');
              
              toast({
                title: "הודעה נשלחה",
                description: transcriptionText.trim(),
              });
            } else {
              console.log('⚠️ User transcription was empty, not saving');
            }
          } else {
            console.log('⚠️ User audio blob too small, skipping transcription');
          }
        } catch (error) {
          console.error('❌ Error processing user recording:', error);
          toast({
            title: "שגיאה בעיבוד ההקלטה",
            description: "לא הצלחנו לעבד את ההקלטה שלך. נסה שוב.",
            variant: "destructive"
          });
        } finally {
          setIsTranscribing(false);
          resolve();
        }
      };
      
      recorder.stop();
    });
  }, [isRecording, toast]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording
  };
}
