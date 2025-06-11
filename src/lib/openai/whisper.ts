
import { supabase } from '@/integrations/supabase/client';

export async function transcribe(blob: Blob): Promise<string> {
  console.log('🎤 Starting transcription process...');
  console.log('📊 Audio blob size:', blob.size, 'bytes');
  console.log('📊 Audio blob type:', blob.type);
  
  try {
    console.log('🚀 Sending request to Supabase transcribe-audio function...');
    
    // Create FormData for the edge function
    const formData = new FormData();
    formData.append('audio', blob, 'audio.webm');

    // Use Supabase edge function with proper error handling
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: formData,
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      throw new Error(`Transcription error: ${error.message}`);
    }

    console.log('✅ Transcription successful!');
    console.log('📝 Transcription result:', data);
    
    const transcriptionText = data?.text || '';
    if (transcriptionText.trim()) {
      console.log('✅ Valid transcription received:', transcriptionText);
    } else {
      console.log('⚠️ Empty transcription received');
    }
    
    return transcriptionText;
  } catch (error) {
    console.error('❌ Transcription error:', error);
    // Don't throw error, return empty string to avoid breaking the flow
    return '';
  }
}
