
export async function transcribe(blob: Blob): Promise<string> {
  console.log('🎤 Starting transcription process...');
  console.log('📊 Audio blob size:', blob.size, 'bytes');
  console.log('📊 Audio blob type:', blob.type);
  
  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "en"); // Fixed to English

  try {
    // Get API key from environment variable
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    console.log('🔑 Checking API key...');
    if (!apiKey) {
      console.error('❌ OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not found in environment variables');
    }
    console.log('✅ API key found, length:', apiKey.length);

    console.log('🚀 Sending request to OpenAI Whisper API...');
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Whisper API error:', response.status, response.statusText, errorText);
      throw new Error(`Whisper API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Transcription successful!');
    console.log('📝 Transcription result:', result);
    console.log('📝 Transcription text:', result.text);
    
    const transcriptionText = result.text || '';
    if (transcriptionText.trim()) {
      console.log('✅ Valid transcription received:', transcriptionText);
    } else {
      console.log('⚠️ Empty transcription received');
    }
    
    return transcriptionText;
  } catch (error) {
    console.error('❌ Transcription error:', error);
    throw error;
  }
}
