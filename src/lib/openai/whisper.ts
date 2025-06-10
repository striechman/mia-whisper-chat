
export async function transcribe(blob: Blob): Promise<string> {
  console.log('Transcribing audio blob:', blob.size, 'bytes');
  
  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "en"); // קיבוע לאנגלית

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Transcription result:', result.text);
    return result.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}
