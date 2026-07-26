import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CinemaPlayer } from './CinemaPlayer';
import { THEMES } from '../constants';
import { useAppStore } from '../store';
import { Scene, Script } from '../types';

// happy-dom doesn't implement media playback
beforeAll(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.load = vi.fn();
});

const JPEG_BASE64 = '/9j/4AAQSkZJRg==';

const imageScene = (id: number, overrides: Partial<Scene> = {}): Scene => ({
  id,
  narrative: `Scene ${id} narrative`,
  visualDescription: `Scene ${id} visual`,
  imageUrl: JPEG_BASE64,
  isVideo: false,
  isReady: true,
  ...overrides,
});

const makeScript = (scenes: Scene[]): Script => ({
  title: 'Test Cartoon',
  characters: ['Hero'],
  scenes,
  isMovieMode: false,
});

const renderPlayer = (script: Script) =>
  render(
    <CinemaPlayer script={script} theme={THEMES[0]} onHome={() => {}} />
  );

describe('CinemaPlayer image mode', () => {
  beforeEach(() => {
    useAppStore.getState().setIsIntermission(false);
    vi.useRealTimers();
  });

  it('renders the scene image with a sniffed mime type, not a hardcoded one', () => {
    renderPlayer(makeScript([imageScene(1)]));
    const img = screen.getByAltText('Scene 1 visual') as HTMLImageElement;
    expect(img.src).toBe(`data:image/jpeg;base64,${JPEG_BASE64}`);
  });

  it('renders a PNG scene image as image/png', () => {
    const png = 'iVBORw0KGgoAAAA=';
    renderPlayer(makeScript([imageScene(1, { imageUrl: png })]));
    const img = screen.getByAltText('Scene 1 visual') as HTMLImageElement;
    expect(img.src).toBe(`data:image/png;base64,${png}`);
  });

  it('advances silent (no narration) scenes on a timer', async () => {
    vi.useFakeTimers();
    const { container } = renderPlayer(makeScript([imageScene(1), imageScene(2)]));

    expect(container.textContent).toContain('Scene 1 / 2');

    // Big play button
    const playButton = container.querySelector('button.absolute.top-1\\/2') as HTMLButtonElement;
    await act(async () => { playButton.click(); });

    // 100ms to bind assets, then the silent-scene hold
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(container.textContent).toContain('Scene 1 / 2');

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(container.textContent).toContain('Scene 2 / 2');

    vi.useRealTimers();
  });

  it('holds an intermission when the next scene is still generating, then resumes when it lands', async () => {
    vi.useFakeTimers();
    const pending = imageScene(2, { isReady: false, imageUrl: undefined });
    const script = makeScript([imageScene(1), pending]);
    const { container, rerender } = renderPlayer(script);

    const playButton = container.querySelector('button.absolute.top-1\\/2') as HTMLButtonElement;
    await act(async () => { playButton.click(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10_100); });

    expect(container.textContent).toContain('INTERMISSION');
    expect(container.textContent).toContain('Scene 1 / 2');

    // Background generation finishes scene 2 and publishes a new script object,
    // exactly as App.tsx does (new array + new scene object).
    const resolved = makeScript([script.scenes[0], imageScene(2)]);
    await act(async () => { rerender(<CinemaPlayer script={resolved} theme={THEMES[0]} onHome={() => {}} />); });

    expect(container.textContent).not.toContain('INTERMISSION');
    expect(container.textContent).toContain('Scene 2 / 2');

    vi.useRealTimers();
  });

  it('does not skip a scene when the narration element errors while being reset', async () => {
    vi.useFakeTimers();
    const { container } = renderPlayer(makeScript([imageScene(1), imageScene(2)]));

    const playButton = container.querySelector('button.absolute.top-1\\/2') as HTMLButtonElement;
    await act(async () => { playButton.click(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });

    // The scene has no audioUrl, so an error from the audio element is spurious
    const audio = container.querySelector('audio') as HTMLAudioElement;
    await act(async () => { audio.dispatchEvent(new Event('error')); });

    expect(container.textContent).toContain('Scene 1 / 2');

    vi.useRealTimers();
  });
});
