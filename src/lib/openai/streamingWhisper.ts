
import { supabase } from '@/integrations/supabase/client';

export async function* streamTranscribe(chunks: AsyncIterable<Blob>): AsyncGenerator<string, void, unknown> {
  for await (const chunk of chunks) {
    try {
      console.log('Processing audio chunk:', chunk.size, 'bytes');
      
      // Create FormData for the Supabase edge function
      const formData = new FormData();
      formData.append('audio', chunk, 'audio.webm');

      // Use Supabase edge function instead of direct OpenAI API call
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (error) {
        console.error('Supabase function error:', error);
        continue; // Skip this chunk and continue with next
      }

      if (data?.text && data.text.trim()) {
        yield data.text.trim();
      }
    } catch (error) {
      console.error('Error in streaming transcription:', error);
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

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
      if (resolveChunk) {
        const chunk = new Blob(chunks.splice(0), { type: 'audio/webm' });
        resolveChunk(chunk);
        resolveChunk = null;
      }
    }
  };

  console.log('Starting streaming recording with 1-second intervals');
  
  // Start timeslice recording - sends data every 1000ms
  mediaRecorder.start(1000);

  try {
    while (mediaRecorder.state === 'recording') {
      const chunk = await new Promise<Blob>((resolve) => {
        resolveChunk = resolve;
      });
      yield chunk;
    }
  } finally {
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }
}
