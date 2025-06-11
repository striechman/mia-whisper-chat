
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Transcribe request received');
    
    // Check if OpenAI API key is available
    const openaiApiKey = Deno.env.get('VITE_OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found in environment');
      throw new Error('OpenAI API key not configured');
    }
    
    console.log('✅ OpenAI API key found');

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      console.error('❌ No audio file provided');
      throw new Error('No audio file provided');
    }

    console.log('📊 Received audio file:', audioFile.size, 'bytes, type:', audioFile.type);

    // Create FormData for OpenAI with improved settings
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, 'audio.webm');
    openaiFormData.append('model', 'whisper-1');
    openaiFormData.append('language', 'en'); // Force English transcription
    openaiFormData.append('temperature', '0'); // Maximum accuracy
    openaiFormData.append(
      'prompt',
      'Transcribe the following speech in clear, fluent English. ' +
      'Return the raw transcript only, no translation to Hebrew.'
    );

    console.log('🚀 Sending request to OpenAI API...');

    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: openaiFormData,
    });

    console.log('📨 OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const result = await openaiResponse.json();
    console.log('✅ Transcription successful:', result.text);

    return new Response(JSON.stringify({ text: result.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Transcription error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check Edge Function logs for more information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
