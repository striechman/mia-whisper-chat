
import { useRef, useCallback } from 'react';
import { useSimpleRecorder } from './useSimpleRecorder';
import { insertMessage } from '@/lib/supabase/chat';

export function useMiaRecording() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const { transcribeAudio } = useSimpleRecorder();

  const startRecording = useCallback(async (miaStream: MediaStream) => {
    if (isRecordingRef.current || !miaStream) return;

    try {
      console.log('🎤 Starting MIA recording...');
      
      const mediaRecorder = new MediaRecorder(miaStream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      isRecordingRef.current = true;
      
    } catch (error) {
      console.error('❌ Error starting MIA recording:', error);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<void> => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) return;

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current!;
      
      recorder.onstop = async () => {
        console.log('⏹️ MIA recording stopped, processing...');
        isRecordingRef.current = false;
        
        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          if (audioBlob.size > 0) {
            console.log('📄 Transcribing MIA audio...');
            const transcriptionText = await transcribeAudio(audioBlob);
            
            if (transcriptionText.trim()) {
              await insertMessage('mia', transcriptionText.trim());
              console.log('✅ MIA message added to chat:', transcriptionText.trim());
            }
          }
        } catch (error) {
          console.error('❌ Error processing MIA recording:', error);
        } finally {
          resolve();
        }
      };
      
      recorder.stop();
    });
  }, [transcribeAudio]);

  return {
    startRecording,
    stopRecording,
    isRecording: isRecordingRef.current
  };
}
