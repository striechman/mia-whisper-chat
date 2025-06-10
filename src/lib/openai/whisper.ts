
export async function transcribe(blob: Blob): Promise<string> {
  console.log('Transcribing audio blob:', blob.size, 'bytes');
  
  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "en"); // Fixed to English

  try {
    // Get API key from environment variable
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', response.status, response.statusText, errorText);
      throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Transcription result:', result.text);
    return result.text || '';
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}
