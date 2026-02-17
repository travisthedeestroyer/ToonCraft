import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe outside of component renders to avoid recreating the Stripe object on every render.
// This matches the singleton pattern recommended by Stripe documentation.
export const stripePromise = loadStripe('pk_live_51Sfrqc3XTCcnH63RCmQifokEebwRsdI86jVyAIp5RG0Gbaema38cWJds7pkMGeoKmuzQhDL1QhJMtofin44gUMbG00G3zJ6A6l');
