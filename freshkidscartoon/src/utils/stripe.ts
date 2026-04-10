import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual Stripe publishable key
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');
