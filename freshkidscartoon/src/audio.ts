/**
 * Audio Format Conversion Utilities for MyCartoon.org
 * 
 * Handles conversion between various audio formats required by different APIs:
 * - Gemini Live API outputs: base64-encoded PCM16 (signed 16-bit integers)
 * - WebAudio API requires: Float32Array normalized to [-1.0, 1.0] range
 * - Browser playback: WAV format with proper RIFF headers
 * 
 * TECHNICAL BACKGROUND:
 * PCM16 (Pulse Code Modulation, 16-bit) stores audio as signed integers:
 * - Range: -32768 to +32767
 * - Negative values represent negative amplitude (speaker cone moving backward)
 * - Positive values represent positive amplitude (speaker cone moving forward)
 * 
 * Float32 normalization is asymmetric to preserve full dynamic range:
 * - Positive int16 (0 to 32767) → float (0.0 to 1.0) via division by 32767
 * - Negative int16 (-32768 to -1) → float (-1.0 to ~0.0) via division by 32768
 * - This asymmetry is mathematically correct due to two's complement representation
 * 
 * @module audio
 * @author Travis (MyCartoon.org)
 * @version 2.0
 */

/**
 * Converts base64-encoded PCM16 audio data to Float32Array for WebAudio playback
 * 
 * PIPELINE:
 * 1. Decode base64 string to binary data (atob)
 * 2. Convert binary string to Uint8Array of raw bytes
 * 3. Reinterpret bytes as Int16Array (signed 16-bit integers)
 * 4. Normalize each int16 value to [-1.0, 1.0] range
 * 
 * NORMALIZATION FORMULA:
 * - For positive values: float = int16 / 32767
 * - For negative values: float = int16 / 32768
 * - Uses ternary for correctness (avoids precision loss from single divisor)
 * 
 * @param base64 - Base64-encoded PCM16 audio data (from Gemini Live API)
 * @returns Float32Array suitable for WebAudio API's AudioBuffer
 * 
 * @example
 * ```typescript
 * const audioContext = new AudioContext({ sampleRate: 16000 });
 * const float32Data = base64PCM16ToFloat32(geminiAudioResponse);
 * const audioBuffer = audioContext.createBuffer(1, float32Data.length, 16000);
 * audioBuffer.copyToChannel(float32Data, 0);
 * ```
 */
export function base64PCM16ToFloat32(base64: string): Float32Array {
  // Step 1: Decode base64 to binary string
  const binaryString = atob(base64);
  const len = binaryString.length;
  
  // Step 2: Convert binary string to Uint8Array (raw bytes)
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Step 3: Reinterpret bytes as signed 16-bit integers (PCM16 format)
  const int16Array = new Int16Array(bytes.buffer);
  
  // Step 4: Normalize to Float32 range [-1.0, 1.0]
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    const int16Value = int16Array[i];
    // Asymmetric normalization to preserve full dynamic range
    float32Array[i] = int16Value >= 0 
      ? int16Value / 32767   // Positive: 0 to 1.0
      : int16Value / 32768;  // Negative: -1.0 to ~0.0
  }
  
  return float32Array;
}

/**
 * Converts raw PCM16 data to WAV file format with proper RIFF headers
 * 
 * WAV FILE STRUCTURE:
 * - RIFF Header (12 bytes): File type and size
 * - fmt Chunk (24 bytes): Audio format specifications
 * - data Chunk (8 bytes + audio): Raw PCM samples
 * 
 * SPECIFICATIONS:
 * - Format: PCM (uncompressed)
 * - Channels: 1 (mono)
 * - Bit depth: 16 bits per sample
 * - Sample rate: Configurable (default 24kHz for Gemini TTS)
 * - Byte rate: sampleRate * 2 (16 bits = 2 bytes per sample)
 * - Block align: 2 (bytes per sample)
 * 
 * @param pcmData - Int16Array of raw PCM samples
 * @param sampleRate - Audio sample rate in Hz (default: 24000 for Gemini)
 * @returns Blob containing complete WAV file with headers
 * 
 * @example
 * ```typescript
 * const pcmSamples = new Int16Array([0, 16383, 32767, 16383, 0, -16384, -32768]);
 * const wavBlob = pcmToWav(pcmSamples, 24000);
 * const audioUrl = URL.createObjectURL(wavBlob);
 * const audio = new Audio(audioUrl);
 * audio.play();
 * ```
 */
export function pcmToWav(pcmData: Int16Array, sampleRate: number = 24000): Blob {
  // Allocate buffer: 44 bytes (headers) + audio data
  const buffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(buffer);
  
  // --- RIFF CHUNK DESCRIPTOR (12 bytes) ---
  writeString(view, 0, 'RIFF');                           // ChunkID: "RIFF" (4 bytes)
  view.setUint32(4, 36 + pcmData.length * 2, true);       // ChunkSize: file size - 8 (4 bytes, little-endian)
  writeString(view, 8, 'WAVE');                           // Format: "WAVE" (4 bytes)
  
  // --- FMT SUB-CHUNK (24 bytes) ---
  writeString(view, 12, 'fmt ');                          // Subchunk1ID: "fmt " (4 bytes)
  view.setUint32(16, 16, true);                           // Subchunk1Size: 16 for PCM (4 bytes)
  view.setUint16(20, 1, true);                            // AudioFormat: 1 = PCM (2 bytes)
  view.setUint16(22, 1, true);                            // NumChannels: 1 = mono (2 bytes)
  view.setUint32(24, sampleRate, true);                   // SampleRate: e.g., 24000 Hz (4 bytes)
  view.setUint32(28, sampleRate * 2, true);               // ByteRate: SampleRate * NumChannels * BitsPerSample/8 (4 bytes)
  view.setUint16(32, 2, true);                            // BlockAlign: NumChannels * BitsPerSample/8 (2 bytes)
  view.setUint16(34, 16, true);                           // BitsPerSample: 16 (2 bytes)
  
  // --- DATA SUB-CHUNK (8 bytes + audio) ---
  writeString(view, 36, 'data');                          // Subchunk2ID: "data" (4 bytes)
  view.setUint32(40, pcmData.length * 2, true);           // Subchunk2Size: audio data size in bytes (4 bytes)
  
  // Write PCM samples (little-endian signed 16-bit integers)
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(44 + i * 2, pcmData[i], true);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Converts base64-encoded PCM16 to base64-encoded WAV
 * 
 * Useful for scenarios where you need to:
 * - Store audio in a database (as base64 string)
 * - Embed audio in JSON responses
 * - Create data URLs for <audio> elements
 * 
 * PROCESS FLOW:
 * 1. Decode base64 PCM → raw bytes
 * 2. Convert bytes → Int16Array
 * 3. Wrap PCM in WAV headers → Blob
 * 4. Read Blob as Data URL → base64 WAV
 * 
 * @param base64Pcm - Base64-encoded PCM16 audio data
 * @param sampleRate - Sample rate in Hz (default: 24000)
 * @returns Promise resolving to base64-encoded WAV (without data URL prefix)
 * 
 * @example
 * ```typescript
 * const pcmBase64 = "AAD//wAA..."; // From Gemini API
 * const wavBase64 = await pcmBase64ToWavBase64(pcmBase64, 24000);
 * const dataUrl = `data:audio/wav;base64,${wavBase64}`;
 * document.querySelector('audio').src = dataUrl;
 * ```
 */
export async function pcmBase64ToWavBase64(base64Pcm: string, sampleRate: number = 24000): Promise<string> {
  // Decode base64 to raw bytes
  const binaryString = atob(base64Pcm);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Convert bytes to Int16Array PCM samples
  const pcmData = new Int16Array(bytes.buffer);
  
  // Wrap PCM in WAV format
  const wavBlob = pcmToWav(pcmData, sampleRate);
  
  // Convert Blob to base64 via FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Extract base64 portion (strip "data:audio/wav;base64," prefix)
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('FileReader failed to convert WAV Blob'));
    reader.readAsDataURL(wavBlob);
  });
}

/**
 * Internal helper: Writes ASCII string to DataView at specified offset
 * 
 * Used for writing RIFF/WAV chunk identifiers like "RIFF", "WAVE", "fmt ", "data"
 * Each character is written as a single byte (ASCII encoding)
 * 
 * @param view - DataView to write into
 * @param offset - Byte offset to start writing at
 * @param string - ASCII string to write
 * 
 * @internal
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
