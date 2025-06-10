
import { useState, useRef } from 'react';

export function useSimpleRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async (): Promise<void> => {
    try {
      console.log('🎤 Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      console.log('✅ Microphone access granted');
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('📊 Audio chunk received:', event.data.size, 'bytes');
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      console.log('🔴 Recording started successfully');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      throw new Error('לא ניתן לגשת למיקרופון. אנא בדק את ההרשאות.');
    }
  };

  const stopRecording = async (): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      const recorder = mediaRecorderRef.current;
      
      recorder.onstop = () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          console.log('🎵 Audio blob created:', audioBlob.size, 'bytes');
          
          // Clean up
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          
          setIsRecording(false);
          resolve(audioBlob);
        } catch (error) {
          console.error('❌ Error creating audio blob:', error);
          reject(error);
        }
      };

      recorder.stop();
    });
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      setIsProcessing(true);
      console.log('🔄 Starting transcription...');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('https://nzlvrflmawihndfsavpg.supabase.co/functions/v1/transcribe-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'שגיאה בתמלול');
      }

      const result = await response.json();
      console.log('✅ Transcription successful:', result.text);
      
      return result.text || '';
    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw new Error('שגיאה בתמלול הקול. נסה שוב.');
    } finally {
      setIsProcessing(false);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsProcessing(false);
  };

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    transcribeAudio,
    cleanup,
  };
}
