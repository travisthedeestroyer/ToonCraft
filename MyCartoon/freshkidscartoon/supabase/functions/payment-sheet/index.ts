// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.4.0?target=deno'

console.log("Hello from Functions!")

serve(async (req) => {
  const { userId, amount } = await req.json()
  
  // This is needed if you're planning to invoke your function from a client.
  // 1. Create a Supabase client with the Auth context of the user that called the function.
  // This way we can verify the user is who they claim to be.
  const supabaseClient = createClient(
    // Supabase API URL - env var exported by default.
    Deno.env.get('SUPABASE_URL') ?? '',
    // Supabase API ANON KEY - env var exported by default.
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    // Create client with Auth context of the user that called the function.
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  // 2. Create Stripe instance
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
  })

  // 3. Create a PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount || 499, // Default to $4.99
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: {
        user_id: userId, // Attach user ID to the payment intent metadata
    },
  })

  // 4. Return the client secret to the client
  return new Response(
    JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    { headers: { "Content-Type": "application/json" } },
  )
})
