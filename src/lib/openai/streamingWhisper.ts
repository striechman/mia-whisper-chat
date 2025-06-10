
export async function* streamTranscribe(chunks: AsyncIterable<Blob>): AsyncGenerator<string, void, unknown> {
  for await (const chunk of chunks) {
    try {
      console.log('Processing audio chunk:', chunk.size, 'bytes');
      
      const formData = new FormData();
      formData.append('file', chunk, 'audio.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        console.error('Whisper API error:', response.status, response.statusText);
        continue; // Skip this chunk and continue with next
      }

      const result = await response.json();
      if (result.text && result.text.trim()) {
        yield result.text.trim();
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
