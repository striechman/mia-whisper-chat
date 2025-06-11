
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
    
    // Check if OpenAI API key is available - FIXED: use correct variable name
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
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

    // Skip very small files that won't have meaningful content
    if (audioFile.size < 2000) {
      console.log('⚠️ Audio file too small, returning empty result');
      return new Response(JSON.stringify({ text: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create FormData for OpenAI with improved settings
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, 'audio.webm');
    openaiFormData.append('model', 'whisper-1');
    openaiFormData.append('language', 'he'); // Hebrew for better accuracy
    openaiFormData.append('temperature', '0'); // Maximum accuracy

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
