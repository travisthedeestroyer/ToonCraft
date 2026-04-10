import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-goog-api-client, x-goog-api-key',
}

const TIER_LIMITS = {
  free:  { maxScenes: 12, movieMode: true, imageQuality: '1K' },
  trial: { maxScenes: 4, movieMode: true,  imageQuality: '1K' },
  pro:   { maxScenes: 8, movieMode: true,  imageQuality: '2K' }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      throw new Error('Missing x-user-id header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Read the user's profile from Supabase server-side
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    // Determine tier
    let tier = 'free';
    if (profile.is_pro) {
      tier = 'pro';
    } else if (profile.veo_trials > 0) {
      tier = 'trial';
    }

    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/generate', '');
    
    // Check if it's a Veo video generation request
    if (path.includes('veo') || path.includes('generateVideos')) {
      if (!limits.movieMode) {
        throw new Error('Video generation requires Pro or available trials');
      }
      
    // Proxy the request
    let targetUrl: URL;
    let headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('x-user-id');

    if (path.startsWith('/huggingface/')) {
      const hfPath = path.replace('/huggingface', '');
      targetUrl = new URL(hfPath + url.search, 'https://api-inference.huggingface.co');
      headers.set('Authorization', `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY') ?? ''}`);
    } else {
      targetUrl = new URL(path + url.search, 'https://generativelanguage.googleapis.com');
      headers.set('x-goog-api-key', Deno.env.get('GEMINI_API_KEY') ?? '');
    }

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: req.body
    });

    // If it's a successful Veo video generation POST request, decrement the trial
    if (response.ok && !profile.is_pro && req.method === 'POST' && (path.includes('veo') || path.includes('generateVideos'))) {
      const { error: decrementError } = await supabaseClient
        .rpc('decrement_veo_trial', { p_user_id: userId });
        
      if (decrementError) {
        console.error('Failed to decrement trial:', decrementError);
      }
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
