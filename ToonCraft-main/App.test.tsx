import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the storage utility to avoid IndexedDB issues in test environment
vi.mock('./utils/storage', () => ({
  getProjectsFromDB: vi.fn().mockResolvedValue([]),
  saveProjectToDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock the Gemini service to avoid network calls
vi.mock('./services/geminiService', () => ({
  generateScript: vi.fn(),
  generateSceneImage: vi.fn(),
  generateNarration: vi.fn(),
  generateVeoVideo: vi.fn(),
}));

describe('App System Test', () => {
  it('renders the ToonCraft home screen', async () => {
    render(<App />);
    
    // Check for the main title
    const titleElement = await screen.findByText(/ToonCraft/i);
    expect(titleElement).toBeInTheDocument();

    // Check for the subtitle
    const subtitleElement = await screen.findByText(/The AI Cartoon Studio for Kids/i);
    expect(subtitleElement).toBeInTheDocument();
    
    // Check for the "Start Filming" button
    const startButton = await screen.findByRole('button', { name: /Start Filming/i });
    expect(startButton).toBeInTheDocument();
  });
});
