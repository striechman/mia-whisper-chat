
import { supabase } from '@/integrations/supabase/client';

export async function* streamTranscribe(chunks: AsyncIterable<Blob>): AsyncGenerator<string, void, unknown> {
  for await (const chunk of chunks) {
    try {
      console.log('Processing audio chunk:', chunk.size, 'bytes');
      
      // Skip very small chunks (likely silence)
      if (chunk.size < 1000) {
        console.log('⚠️ Skipping small chunk:', chunk.size, 'bytes');
        continue;
      }
      
      // Create FormData for the Supabase edge function
      const formData = new FormData();
      formData.append('audio', chunk, 'audio.webm');

      // Use Supabase edge function instead of direct OpenAI API call
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (error) {
        console.error('🔥 Supabase function error:', error);
        // Don't throw error, just continue with next chunk
        continue;
      }

      if (data?.text && data.text.trim()) {
        console.log('✅ Transcription chunk received:', data.text.trim());
        yield data.text.trim();
      }
    } catch (error) {
      console.error('💥 Error in streaming transcription:', error);
      // Continue with next chunk even if this one fails
    }
  }
}

export async function* recordMicrophoneChunks(stream: MediaStream): AsyncGenerator<Blob, void, unknown> {
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm',
  });

  const chunks: Blob[] = [];
  let resolveChunk: ((blob: Blob) => void) | null = null;
  let isRecording = true;

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0 && isRecording) {
      chunks.push(event.data);
      if (resolveChunk) {
        const chunk = new Blob(chunks.splice(0), { type: 'audio/webm' });
        resolveChunk(chunk);
        resolveChunk = null;
      }
    }
  };

  mediaRecorder.onstop = () => {
    isRecording = false;
    console.log('🛑 Microphone recording stopped');
  };

  console.log('🎙️ Starting streaming recording with 2-second intervals');
  
  // Start timeslice recording - sends data every 2000ms (increased to reduce API calls)
  mediaRecorder.start(2000);

  try {
    while (mediaRecorder.state === 'recording' && isRecording) {
      const chunk = await new Promise<Blob>((resolve) => {
        resolveChunk = resolve;
        
        // Add timeout to prevent hanging
        setTimeout(() => {
          if (resolveChunk === resolve) {
            resolveChunk = null;
            resolve(new Blob([], { type: 'audio/webm' }));
          }
        }, 3000);
      });
      
      if (chunk.size > 0) {
        yield chunk;
      }
    }
  } finally {
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording = false;
  }
}
