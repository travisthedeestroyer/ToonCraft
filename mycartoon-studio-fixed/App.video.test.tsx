
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as geminiService from './services/geminiService';

// Mock the storage utility
vi.mock('./utils/storage', () => ({
  getProjectsFromDB: vi.fn().mockResolvedValue([]),
  saveProjectToDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock the components to control flow
vi.mock('./components/DirectorChat', () => ({
  DirectorChat: ({ onStoryReady, isMovieMode, setIsMovieMode }: any) => (
    <div data-testid="director-chat">
      <div data-testid="mode-indicator">{isMovieMode ? 'Movie' : 'Classic'}</div>
      <button onClick={() => setIsMovieMode(!isMovieMode)}>Toggle Mode</button>
      <button onClick={() => onStoryReady('A brave toaster goes to Mars.')}>Start Filming</button>
    </div>
  )
}));

vi.mock('./components/ProductionLoader', () => ({
  ProductionLoader: () => <div data-testid="production-loader">Production Loader</div>
}));

vi.mock('./components/CinemaPlayer', () => ({
  CinemaPlayer: () => <div>Cinema Player</div>
}));

// Mock the Gemini service
vi.mock('./services/geminiService', () => ({
  generateScript: vi.fn(),
  generateSceneImage: vi.fn(),
  generateNarration: vi.fn(),
  generateVeoVideo: vi.fn(),
}));

describe('App Video Mode Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup environment for API key check
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
  });

  it('triggers generateVeoVideo when Movie Mode is enabled', async () => {
    // Mock return values for the service
    const mockScript = {
      title: "Test Movie",
      scenes: [
        { narrative: "Scene 1", visualDescription: "Visual 1" },
        { narrative: "Scene 2", visualDescription: "Visual 2" },
      ]
    };
    
    vi.mocked(geminiService.generateScript).mockResolvedValue(mockScript);
    vi.mocked(geminiService.generateSceneImage).mockResolvedValue('fake-image-base64');
    vi.mocked(geminiService.generateNarration).mockResolvedValue('fake-audio-base64');
    vi.mocked(geminiService.generateVeoVideo).mockResolvedValue('fake-video-base64');

    render(<App />);

    // 1. Navigate to DirectorChat
    const startButton = await screen.findByRole('button', { name: /Start Filming/i });
    fireEvent.click(startButton);

    // Select Age (>= 10 goes to Scene Selection, < 10 goes to Brainstorm)
    // App.tsx: if (userAge >= 10) setAppState(AppState.SCENE_SELECTION) else BRAINSTORM
    // Let's pick age 8 to go straight to Brainstorm
    const ageButton = await screen.findByText('8');
    fireEvent.click(ageButton);

    // 2. Verify we are in DirectorChat
    const directorChat = await screen.findByTestId('director-chat');
    expect(directorChat).toBeInTheDocument();

    // 3. Toggle Movie Mode
    // Initial state should be Classic
    expect(screen.getByTestId('mode-indicator')).toHaveTextContent('Classic');
    
    const toggleButton = screen.getByText('Toggle Mode');
    fireEvent.click(toggleButton);
    
    // Verify state updated in UI
    expect(screen.getByTestId('mode-indicator')).toHaveTextContent('Movie');

    // 4. Start Filming
    const startFilmingButton = screen.getByText('Start Filming');
    fireEvent.click(startFilmingButton);

    // 5. Wait for Production to Start
    await waitFor(() => {
        expect(screen.getByTestId('production-loader')).toBeInTheDocument();
    });

    // 6. Assert generateVeoVideo was called
    // App.tsx logic: if isMovieMode, scene 1 (index 0) calls generateVeoVideo?
    // Wait, the logic is: 
    // i=0 (Scene 1): Video (isStatic = false)
    // i=1 (Scene 2): Image (isStatic = true)
    
    await waitFor(() => {
        expect(geminiService.generateVeoVideo).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Verify it was called with correct parameters
    expect(geminiService.generateVeoVideo).toHaveBeenCalledWith(
        "Visual 1", // Prompt from scene 1
        expect.any(String), // Base image
        expect.any(AbortSignal)
    );
  });

  it('allows video generation in DEV mode even if trials are exhausted', async () => {
    // Mock local storage to simulate 0 trials
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    getItemSpy.mockImplementation((key) => {
      if (key === 'tooncraft_veo_trials') return '0';
      return null;
    });

    // Mock return values for the service
    const mockScript = {
      title: "Test Movie Zero Trials",
      scenes: [
        { narrative: "Scene 1", visualDescription: "Visual 1" },
      ]
    };
    
    vi.mocked(geminiService.generateScript).mockResolvedValue(mockScript);
    vi.mocked(geminiService.generateSceneImage).mockResolvedValue('fake-image-base64');
    vi.mocked(geminiService.generateNarration).mockResolvedValue('fake-audio-base64');
    vi.mocked(geminiService.generateVeoVideo).mockResolvedValue('fake-video-base64');

    render(<App />);

    // 1. Navigate to DirectorChat (Age 8)
    const startButton = await screen.findByRole('button', { name: /Start Filming/i });
    fireEvent.click(startButton);
    const ageButton = await screen.findByText('8');
    fireEvent.click(ageButton);

    // 2. Enable Movie Mode
    const toggleButton = await screen.findByText('Toggle Mode');
    fireEvent.click(toggleButton);
    expect(screen.getByTestId('mode-indicator')).toHaveTextContent('Movie');

    // 3. Start Filming
    const startFilmingButton = screen.getByText('Start Filming');
    fireEvent.click(startFilmingButton);

    // 4. Expect generateVeoVideo to be called despite 0 trials because DEV=true
    await waitFor(() => {
        expect(geminiService.generateVeoVideo).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});
