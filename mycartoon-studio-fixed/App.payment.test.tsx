import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import * as geminiService from './services/geminiService';
import * as storage from './utils/storage';

// Mock services and utilities

vi.mock('./services/geminiService', () => ({

  // We need to provide a mock for getLiveClient because DirectorChat uses it

  getLiveClient: vi.fn(() => ({

    live: {

      connect: vi.fn().mockResolvedValue({

        sendRealtimeInput: vi.fn(),

        sendToolResponse: vi.fn(),

      }),

    },

  })),

  // Keep mocks for other functions used in App.tsx

  generateScript: vi.fn(),

  generateSceneImage: vi.fn(),

  generateNarration: vi.fn(),

  generateVeoVideo: vi.fn(),

}));

vi.mock('./utils/storage');





describe('App Payment Flow', () => {



  beforeEach(() => {

    // Reset mocks before each test

    vi.clearAllMocks();



    // Mock the global fetch to prevent network errors when the modal opens

    global.fetch = vi.fn().mockResolvedValue({

        json: vi.fn().mockResolvedValue({ clientSecret: 'mock_secret' })

    } as any);

    

    // Mock the async functions to return promises

    (storage.getProjectsFromDB as vi.Mock).mockResolvedValue([]);

    (storage.getUserProfile as vi.Mock).mockResolvedValue({

      wallet: 0,

      is_pro: false,

      veo_trials: 0, // CRITICAL: User has no trials

      owned_themes: ['default'],

      owned_voices: ['Kore']

    });

    (geminiService.generateScript as vi.Mock).mockResolvedValue({ scenes: [{ narrative: 'A test scene', visualDescription: 'A test visual' }] });

    (geminiService.generateNarration as vi.Mock).mockResolvedValue('audio_base64');

    (geminiService.generateSceneImage as vi.Mock).mockResolvedValue('image_base64');

  });



  it('should open the subscription modal when a user with 0 trials tries to generate a video', async () => {

    render(<App />);



    // 1. Navigate to the brainstorming phase

    await act(async () => {

        const startButton = await screen.findByRole('button', { name: /Start Filming/i });

        fireEvent.click(startButton);

    });

    

    // 2. Select an age

    await act(async () => {

        const ageButton = await screen.findByText('8');

        fireEvent.click(ageButton);

    });



    // 3. CRITICAL: Enable AI Video mode to trigger the payment check

    const movieModeToggle = await screen.findByText(/AI Video/i);

    await act(async () => {

      fireEvent.click(movieModeToggle);

    });



    // 4. Start production using the "Random Story" button

    const randomStoryButton = await screen.findByTitle(/Random Story/i);

    await act(async () => {

        fireEvent.click(randomStoryButton);

    });



    // 5. Assert that the payment modal appears

    const modalTitle = await screen.findByText(/Unlock ToonCraft Pro!/i);

    expect(modalTitle).toBeInTheDocument();

    

    // 6. Assert that video generation was NOT called

    expect(geminiService.generateVeoVideo).not.toHaveBeenCalled();

  });

});






