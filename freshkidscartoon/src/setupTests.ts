import '@testing-library/jest-dom';
import { vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Globally mock environment variables for all tests
vi.stubEnv('VITE_PUBLIC_SUPABASE_URL', 'https://mock.supabase.co');
vi.stubEnv('VITE_PUBLIC_SUPABASE_ANON_KEY', 'mock-anon-key');
vi.stubEnv('VITE_GEMINI_API_KEY', 'mock-gemini-key');

// Mock Stripe.js to prevent it from trying to load the external script
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({
    _apiKey: 'mock-key', 
    elements: vi.fn(() => ({
      create: vi.fn(() => ({ mount: vi.fn(), on: vi.fn(), destroy: vi.fn() })),
      getElement: vi.fn(),
    })),
    confirmPayment: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

// Mock Browser APIs not present in happy-dom
class MockAudioContext {
    createAnalyser = vi.fn(() => ({ fftSize: 2048 }));
    createBuffer = vi.fn();
    createBufferSource = vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn() }));
    createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
    createScriptProcessor = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    destination = {};
    currentTime = 0;
    state = 'running';
}
if (typeof window.AudioContext === 'undefined') {
  (window as any).AudioContext = MockAudioContext;
}

if (typeof navigator.mediaDevices === 'undefined') {
  (navigator as any).mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn(() => [{ stop: vi.fn() }]),
    }),
  };
}

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ clientSecret: 'mock-client-secret' })
});
