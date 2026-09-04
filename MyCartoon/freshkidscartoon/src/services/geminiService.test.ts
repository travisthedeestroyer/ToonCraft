import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateSceneImage, clearAssetCache, hashToSeed, toImageDataUrl } from './geminiService';

const jpegBlob = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], { type: 'image/jpeg' });

const okResponse = () => ({ ok: true, status: 200, blob: async () => jpegBlob() });

describe('generateSceneImage', () => {
  beforeEach(() => {
    clearAssetCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generates through the free keyless provider, not a paid API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    const image = await generateSceneImage('a cat on a skateboard', 6, undefined, false, undefined, {
      seed: 42,
      characterBible: 'Pip: a small blue robot with a red scarf',
    });

    expect(image.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.host).toBe('image.pollinations.ai');
    expect(url.searchParams.get('seed')).toBe('42');
    expect(url.searchParams.get('width')).toBe('1280');
    expect(url.searchParams.get('height')).toBe('720');
    expect(url.searchParams.get('safe')).toBe('true');

    // The character sheet must ride along, since the free provider can't take a reference frame
    const decodedPrompt = decodeURIComponent(url.pathname);
    expect(decodedPrompt).toContain('Pip: a small blue robot with a red scarf');
    expect(decodedPrompt).toContain('a cat on a skateboard');
  });

  it('keeps the caller-supplied seed stable across different scenes of one movie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    await generateSceneImage('scene one', 6, undefined, false, undefined, { seed: 777 });
    await generateSceneImage('scene two', 6, undefined, false, undefined, { seed: 777 });

    const seeds = fetchMock.mock.calls.map(c => new URL(c[0] as string).searchParams.get('seed'));
    expect(seeds).toEqual(['777', '777']);
  });

  it('retries the free provider with a different seed before giving up', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 502, blob: async () => jpegBlob() })
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    await generateSceneImage('a rainy day', 9, undefined, false, undefined, { seed: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const seeds = fetchMock.mock.calls.map(c => new URL(c[0] as string).searchParams.get('seed'));
    expect(seeds).toEqual(['10', '11']);
  });

  it('serves a repeated scene from cache instead of regenerating', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    const first = await generateSceneImage('a sunny hill', 6, undefined, false, undefined, { seed: 5 });
    const second = await generateSceneImage('a sunny hill', 6, undefined, false, undefined, { seed: 5 });

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates caller aborts without falling through to other providers', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();

    await expect(
      generateSceneImage('anything', 6, undefined, false, controller.signal, { seed: 1 })
    ).rejects.toThrow('Aborted');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('image helpers', () => {
  it('hashToSeed is deterministic and bounded', () => {
    expect(hashToSeed('a story about frogs')).toBe(hashToSeed('a story about frogs'));
    expect(hashToSeed('a story about frogs')).not.toBe(hashToSeed('a story about cats'));
    expect(hashToSeed('x')).toBeGreaterThanOrEqual(0);
    expect(hashToSeed('x')).toBeLessThan(1000000);
  });

  it('sniffs the image format rather than assuming JPEG', () => {
    expect(toImageDataUrl('/9j/4AAQ')).toBe('data:image/jpeg;base64,/9j/4AAQ');
    expect(toImageDataUrl('iVBORw0KGgo')).toBe('data:image/png;base64,iVBORw0KGgo');
    expect(toImageDataUrl(undefined)).toBe('');
  });
});
