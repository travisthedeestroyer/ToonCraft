#!/bin/bash
# You need to have the Supabase CLI installed and logged in.
# https://supabase.com/docs/guides/cli

# Replace with your project ID
supabase functions deploy payment-sheet
supabase functions deploy webhook

# Set secrets
# supabase secrets set STRIPE_SECRET_KEY=sk_test_...
# supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
