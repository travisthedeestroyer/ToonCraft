import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import App from './App';
import { AppState } from './types';
import { useAppStore } from './store';

// The Director's voice is the thing under test; everything else the app reaches
// for on mount is stubbed out.
const generateNarration = vi.fn(async (_text: string) => 'BASE64AUDIO');

vi.mock('./services/geminiService', () => ({
  generateNarration: (...args: any[]) => generateNarration(...(args as [string])),
  generateScript: vi.fn(),
  generateSceneImage: vi.fn(),
  generateVeoVideo: vi.fn(),
  generateBackgroundMusic: vi.fn(),
  hashToSeed: () => 1,
  toImageDataUrl: (b?: string) => (b ? `data:image/jpeg;base64,${b}` : ''),
  TokenTracker: { reset: vi.fn(), addUsage: vi.fn() },
}));

vi.mock('./utils/storage', () => ({
  getProjectsFromDB: vi.fn().mockResolvedValue([]),
  saveProjectToDB: vi.fn().mockResolvedValue(undefined),
  getUserId: vi.fn().mockResolvedValue('test-user'),
}));

vi.mock('./components/DirectorChat', () => ({ DirectorChat: () => <div>Director Chat</div> }));

const play = vi.fn().mockResolvedValue(undefined);
const pause = vi.fn();

beforeAll(() => {
  HTMLMediaElement.prototype.play = play;
  HTMLMediaElement.prototype.pause = pause;
  HTMLMediaElement.prototype.load = vi.fn();
});

const startFlow = async () => {
  await act(async () => {
    screen.getByText(/Make a Movie!/).closest('button')!.click();
  });
};

describe('spoken prompts for pre-readers', () => {
  beforeEach(() => {
    generateNarration.mockClear();
    play.mockClear();
    useAppStore.getState().setAppState(AppState.HOME);
  });

  it('asks the age question out loud when the age screen opens', async () => {
    render(<App />);
    await startFlow();

    await waitFor(() => expect(screen.getByText('How old are you?')).toBeInTheDocument());
    await waitFor(() => expect(generateNarration).toHaveBeenCalled());

    expect(generateNarration.mock.calls[0][0]).toMatch(/How old are you/i);
    await waitFor(() => expect(play).toHaveBeenCalled());
  });

  it('asks the story-length question out loud when that screen opens', async () => {
    render(<App />);
    await startFlow();
    await waitFor(() => expect(screen.getByText('How old are you?')).toBeInTheDocument());

    await act(async () => {
      screen.getByText('11').click();
    });

    await waitFor(() => expect(screen.getByText('How long is your story?')).toBeInTheDocument());
    await waitFor(() =>
      expect(generateNarration.mock.calls.some(c => /How long should your story be/i.test(c[0]))).toBe(true)
    );
  });

  it('replays the question when the kid taps "Hear it again"', async () => {
    render(<App />);
    await startFlow();
    await waitFor(() => expect(generateNarration).toHaveBeenCalled());

    const callsAfterOpen = generateNarration.mock.calls.length;

    await act(async () => {
      screen.getByLabelText('Hear the question again').click();
    });

    await waitFor(() => expect(generateNarration.mock.calls.length).toBe(callsAfterOpen + 1));
    expect(generateNarration.mock.calls.at(-1)![0]).toMatch(/How old are you/i);
  });

  it('speaks the age question even though no age is known yet', async () => {
    render(<App />);
    await startFlow();

    await waitFor(() => expect(generateNarration).toHaveBeenCalled());
    // Falls back to a mid-range age rather than bailing out
    expect(typeof (generateNarration.mock.calls[0] as any)[1]).toBe('number');
  });
});
