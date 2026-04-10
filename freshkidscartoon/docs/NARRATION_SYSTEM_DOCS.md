/**
 * Core AI Services Documentation
 * MyCartoon.org - Voice & Narration System
 * 
 * This document provides comprehensive technical documentation for the
 * AI-powered voice generation and director chat systems.
 * 
 * @module geminiService - Core Functions
 * @author Travis (MyCartoon.org)
 * @version 2.0
 */

// ==============================================================================
// NARRATION GENERATION SYSTEM
// ==============================================================================

/**
 * generateNarration() - Text-to-Speech Narrator Voice Generation
 * 
 * Converts script text into high-quality audio narration using Google's Gemini TTS.
 * Implements intelligent caching, retry logic, and age-appropriate voice styling.
 * 
 * PIPELINE:
 * 1. Input validation & cache lookup
 * 2. Age-based prompt modification
 * 3. Gemini TTS API call with voice configuration
 * 4. PCM16 → WAV conversion
 * 5. Cache storage & return
 * 
 * CACHING STRATEGY:
 * - Cache key: `narration_${text}_${age}_${voiceId}`
 * - Prevents redundant API calls for identical narration
 * - Persists in-memory for session duration
 * - Example: "Hello!" for age 6 with voice "Kore" caches separately from age 10
 * 
 * AGE-APPROPRIATE MODIFICATIONS:
 * - Ages < 8: Prefix "Speak cheerfully:" to prompt energetic delivery
 * - Ages ≥ 8: Use text as-is for neutral/professional tone
 * - Voice selection (Kore/Puck/Charon/etc) applied via speechConfig
 * 
 * AUDIO FORMAT:
 * - Gemini outputs: base64-encoded PCM16 (signed 16-bit, mono)
 * - Conversion: PCM16 → WAV with proper RIFF headers
 * - Sample rate: 24kHz (Gemini TTS default)
 * - Final output: base64-encoded WAV suitable for `<audio>` elements
 * 
 * ERROR HANDLING:
 * - Implements exponential backoff retry (max 2 retries, 2s base delay)
 * - Graceful degradation: Returns empty string on failure (silent fail)
 * - Respects AbortSignal for cancellation mid-generation
 * - Token budget tracking prevents runaway API costs
 * 
 * @param text - Script text to narrate (e.g., "The hero enters the forest")
 * @param age - Child's age (affects delivery style)
 * @param voiceId - TTS voice identifier ('Kore', 'Puck', 'Charon', etc)
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise<string> - Base64-encoded WAV audio, or empty string on error
 * 
 * @example Basic Usage
 * ```typescript
 * const audio = await generateNarration(
 *   "The brave knight entered the castle",
 *   8,
 *   'Charon'
 * );
 * if (audio) {
 *   const audioElement = new Audio(`data:audio/wav;base64,${audio}`);
 *   await audioElement.play();
 * }
 * ```
 * 
 * @example With Cancellation
 * ```typescript
 * const controller = new AbortController();
 * const audioPromise = generateNarration(text, age, voice, controller.signal);
 * 
 * // Cancel after 5 seconds
 * setTimeout(() => controller.abort(), 5000);
 * 
 * try {
 *   const audio = await audioPromise;
 * } catch (err) {
 *   if (err.message === 'Aborted') {
 *     console.log('Narration cancelled');
 *   }
 * }
 * ```
 * 
 * API CALL STRUCTURE:
 * ```typescript
 * await ai.models.generateContent({
 *   model: 'gemini-2.5-flash-preview-tts',
 *   contents: [{ parts: [{ text: ttsText }] }],
 *   config: {
 *     responseModalities: [Modality.AUDIO],
 *     speechConfig: {
 *       voiceConfig: { 
 *         prebuiltVoiceConfig: { voiceName: 'Kore' }
 *       }
 *     }
 *   }
 * });
 * ```
 * 
 * VOICE PROFILES:
 * - Kore: Balanced, friendly (FREE - default)
 * - Puck: Energetic, playful (4000 tokens)
 * - Charon: Deep, resonant (6000 tokens)
 * - Fenrir: Intense, commanding (8000 tokens)
 * - Zephyr: Calm, soothing (5000 tokens)
 */

// ==============================================================================
// DIRECTOR CHAT SYSTEM (FALLBACK MODE)
// ==============================================================================

/**
 * chatWithDirector() - Text-Based Director Conversation
 * 
 * Fallback chat system when Gemini Live API is unavailable.
 * Maintains conversation history and uses age-appropriate director personas.
 * 
 * WHEN THIS IS USED:
 * - Live API connection fails (WebRTC/WebSocket issues)
 * - Browser doesn't support ScriptProcessorNode/getUserMedia
 * - Network conditions prevent real-time streaming
 * - User explicitly disables microphone
 * 
 * CONVERSATION FLOW:
 * 1. Construct context from message history
 * 2. Inject age-appropriate system prompt (Bubbles/Spark/Ace)
 * 3. Send to Gemini text model (flash-lite for speed)
 * 4. Extract director's response text
 * 5. Update conversation history
 * 
 * DIRECTOR PERSONAS (from constants.ts):
 * 
 * Ages < 8 - "Bubbles":
 * - High energy, giggly, uses simple words
 * - Example: "Hi! I'm Bubbles! What kind of cartoon do you want to make today?"
 * - Asks one simple question at a time
 * - Triggers: "Cool!", "Yippee!", "Wow!"
 * 
 * Ages 8-10 - "Director Spark":
 * - Adventurous, action-packed, like a sports coach
 * - Example: "Lights, Camera, Action! I'm Director Spark. What epic movie are we filming today?"
 * - Uses "Would you rather" questions
 * - Focuses on superpowers, villains, quests
 * 
 * Ages ≥ 11 - "Ace":
 * - Professional, cool, slightly edgy Hollywood director
 * - Example: "Welcome to the studio. I'm Ace. Pitch me your movie idea."
 * - Uses industry terms: "Scene", "Plot twist", "Character Arc"
 * - Treats user like a real screenwriter
 * 
 * COMPLETION DETECTION:
 * Director watches for trigger phrases:
 * - "Start", "Ready", "Action", "I'm done"
 * - 3 story elements gathered (Hero, Setting, Problem)
 * - Responds with wrap-up + "[startFilming]" magic string
 * 
 * CONVERSATION HISTORY FORMAT:
 * ```
 * Kid: I want to make a story about a robot
 * Director: Cool! What does the robot look like?
 * Kid: It's blue with red eyes
 * Director: Awesome! Where does this robot live?
 * ...
 * ```
 * 
 * @param history - Array of previous messages (Message[])
 * @param userInput - Latest message from child
 * @param age - Child's age (determines persona)
 * @returns Promise<string> - Director's text response
 * 
 * @example
 * ```typescript
 * const history: Message[] = [
 *   { role: 'user', text: 'I want a story about a cat' },
 *   { role: 'assistant', text: 'Cool! What color is the cat?' },
 *   { role: 'user', text: 'Orange' }
 * ];
 * 
 * const response = await chatWithDirector(history, "Orange with stripes", 7);
 * console.log(response); 
 * // "Awesome! Where does this orange cat live?"
 * ```
 * 
 * SYSTEM PROMPT CONSTRUCTION:
 * ```typescript
 * const systemPrompt = GET_SYSTEM_INSTRUCTION_BRAINSTORM(age);
 * const contextHistory = history.map(m => 
 *   `${m.role === 'user' ? 'Kid' : 'Director'}: ${m.text}`
 * ).join('\n');
 * 
 * const prompt = `
 * ${systemPrompt}
 * 
 * Existing Conversation:
 * ${contextHistory}
 * 
 * Kid says: "${userInput}"
 * 
 * Director response:
 * `;
 * ```
 * 
 * MODEL SELECTION:
 * - Primary: gemini-3.1-flash-lite-preview (fastest, cheapest)
 * - Fallback: (none - single model for chat)
 * - ThinkingLevel: MINIMAL (faster responses)
 */

// ==============================================================================
// LIVE API SYSTEM (PRIMARY MODE)
// ==============================================================================

/**
 * Live API Architecture Overview
 * 
 * The primary director chat mode uses Gemini's Live API for real-time
 * bidirectional voice streaming. This provides a more natural conversation
 * experience compared to the text-based fallback.
 * 
 * CORE COMPONENTS:
 * 
 * 1. AUDIO CAPTURE (DirectorChat.tsx)
 *    - getUserMedia() → MediaStream from microphone
 *    - ScriptProcessorNode (legacy but stable) for raw PCM capture
 *    - 16kHz sample rate, mono, 16-bit signed integers
 *    - 2048-sample buffer size for low latency
 * 
 * 2. LIVE SESSION MANAGEMENT (startLiveSession/stopLiveSession)
 *    - WebSocket connection to Gemini Live API
 *    - Bidirectional streaming (send mic data, receive TTS)
 *    - Session initialization with system prompt + tools
 *    - Persistent connection with automatic reconnection
 * 
 * 3. AUDIO PLAYBACK (playStreamAudio)
 *    - Receives base64 PCM16 from Gemini
 *    - Converts to Float32Array via base64PCM16ToFloat32()
 *    - Creates AudioBuffer at 24kHz (Gemini TTS output rate)
 *    - Queues playback with precise timing (nextStartTimeRef)
 *    - Prevents audio overlap/gaps with time-based scheduling
 * 
 * 4. VISUALIZATION (drawVisualizer)
 *    - Canvas-based frequency domain visualization
 *    - AnalyserNode processes mic input + TTS output
 *    - Real-time FFT (Fast Fourier Transform) for frequency data
 *    - Pulsing orb with frequency-reactive tentacles
 * 
 * 5. IDLE DETECTION (checkIdle + triggerIdlePrompt)
 *    - Monitors user activity every 1 second
 *    - If no speech for 12 seconds → idle prompt
 *    - Generates prompt: "Are you still there? Tell me about your story!"
 *    - Plays via TTS to re-engage user
 * 
 * SESSION LIFECYCLE:
 * 
 * 1. INITIALIZATION
 *    ```typescript
 *    const ctx = new AudioContext({ sampleRate: 16000 });
 *    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 *    const processor = ctx.createScriptProcessor(2048, 1, 1);
 *    ```
 * 
 * 2. CONNECTION
 *    ```typescript
 *    const ai = getLiveClient();
 *    const session = ai.connectLive({
 *      model: 'gemini-3.1-flash-live-preview',
 *      systemPrompt: GET_LIVE_SYSTEM_INSTRUCTION(age),
 *      tools: [startFilmingTool],
 *      config: {
 *        responseModalities: [Modality.AUDIO],
 *        speechConfig: { voiceConfig: { ... } }
 *      }
 *    });
 *    ```
 * 
 * 3. BIDIRECTIONAL STREAMING
 *    ```
 *    User speaks → ScriptProcessor → Float32 → Int16 → base64 → WebSocket
 *                                                                    ↓
 *    User hears ← AudioBuffer ← Float32 ← base64 PCM16 ← WebSocket ←
 *    ```
 * 
 * 4. TOOL INVOCATION
 *    ```typescript
 *    // Gemini calls startFilming({ summary: "..." })
 *    if (message.toolCall?.name === 'startFilming') {
 *      const summary = message.toolCall.functionCalls[0].args.summary;
 *      onStoryReady(summary); // Transition to production
 *    }
 *    ```
 * 
 * 5. CLEANUP
 *    ```typescript
 *    processor.disconnect();
 *    stream.getTracks().forEach(t => t.stop());
 *    await session.disconnect();
 *    ```
 * 
 * AUDIO SYNCHRONIZATION:
 * 
 * Problem: Multiple audio chunks from Gemini must play sequentially without gaps
 * Solution: Time-based queuing with AudioContext.currentTime
 * 
 * ```typescript
 * const currentTime = audioContext.currentTime;
 * if (nextStartTimeRef.current < currentTime) {
 *   nextStartTimeRef.current = currentTime; // Catch up if behind
 * }
 * source.start(nextStartTimeRef.current);
 * nextStartTimeRef.current += audioBuffer.duration; // Queue next chunk
 * ```
 * 
 * FREQUENCY VISUALIZATION:
 * 
 * The visualizer creates a pulsing orb effect that reacts to audio:
 * 
 * 1. FFT Analysis (Fast Fourier Transform):
 *    ```typescript
 *    analyser.fftSize = 256;
 *    const dataArray = new Uint8Array(analyser.frequencyBinCount);
 *    analyser.getByteFrequencyData(dataArray);
 *    ```
 * 
 * 2. Average Amplitude Calculation:
 *    ```typescript
 *    const sum = dataArray.reduce((a, b) => a + b, 0);
 *    const average = sum / dataArray.length;
 *    const intensity = average / 255; // Normalize to [0, 1]
 *    ```
 * 
 * 3. Visual Scaling:
 *    ```typescript
 *    const baseRadius = 120;
 *    const targetScale = 1 + intensity * 0.5; // 1.0 to 1.5x
 *    const radius = baseRadius * smoothedScale;
 *    ```
 * 
 * 4. Tentacle Generation (12 points):
 *    ```typescript
 *    for (let i = 0; i < 12; i++) {
 *      const angle = (i / 12) * Math.PI * 2;
 *      const tentacleLength = radius * (1.2 + Math.random() * 0.3);
 *      const x = Math.cos(angle) * tentacleLength;
 *      const y = Math.sin(angle) * tentacleLength;
 *      // Draw with radial gradient
 *    }
 *    ```
 */

// ==============================================================================
// INTEGRATION EXAMPLES
// ==============================================================================

/**
 * Example: Complete Narration System Integration
 * 
 * ```typescript
 * // 1. Generate script narration for all scenes
 * const script: Script = await generateScript(storyContext, userAge, isMovieMode);
 * 
 * // 2. Generate audio for each scene in parallel
 * const audioPromises = script.scenes.map(scene =>
 *   generateNarration(scene.narrative, userAge, currentVoiceId)
 * );
 * const sceneAudios = await Promise.all(audioPromises);
 * 
 * // 3. Attach audio to scenes
 * const scenesWithAudio = script.scenes.map((scene, i) => ({
 *   ...scene,
 *   audioData: sceneAudios[i]
 * }));
 * 
 * // 4. Play scene sequence
 * for (const scene of scenesWithAudio) {
 *   // Show image
 *   displayImage(scene.imageBase64);
 *   
 *   // Play narration
 *   if (scene.audioData) {
 *     const audio = new Audio(`data:audio/wav;base64,${scene.audioData}`);
 *     await audio.play();
 *     await new Promise(resolve => audio.onended = resolve);
 *   }
 *   
 *   // Wait before next scene
 *   await new Promise(r => setTimeout(r, 1000));
 * }
 * ```
 */

/**
 * Example: Director Chat Fallback Flow
 * 
 * ```typescript
 * // Component state
 * const [fallbackHistory, setFallbackHistory] = useState<Message[]>([]);
 * const [isFallbackMode, setIsFallbackMode] = useState(false);
 * 
 * // Handle failed Live API connection
 * try {
 *   await startLiveSession();
 * } catch (error) {
 *   console.warn("Live API unavailable, switching to fallback");
 *   setIsFallbackMode(true);
 * }
 * 
 * // In fallback mode: Record user audio, transcribe, then chat
 * const handleUserInput = async (audioBlob: Blob) => {
 *   // 1. Speech-to-text
 *   const userText = await transcribeAudio(audioBlob);
 *   
 *   // 2. Add to history
 *   const newHistory = [...fallbackHistory, { role: 'user', text: userText }];
 *   
 *   // 3. Get director response
 *   const directorText = await chatWithDirector(newHistory, userText, userAge);
 *   
 *   // 4. Generate TTS for director response
 *   const directorAudio = await generateNarration(directorText, userAge, currentVoiceId);
 *   
 *   // 5. Play audio
 *   if (directorAudio) {
 *     const audio = new Audio(`data:audio/wav;base64,${directorAudio}`);
 *     await audio.play();
 *   }
 *   
 *   // 6. Update history
 *   setFallbackHistory([...newHistory, { role: 'assistant', text: directorText }]);
 *   
 *   // 7. Check for completion
 *   if (directorText.includes('[startFilming]')) {
 *     const summary = directorText.replace('[startFilming]', '').trim();
 *     onStoryReady(summary);
 *   }
 * };
 * ```
 */

// ==============================================================================
// PERFORMANCE OPTIMIZATION NOTES
// ==============================================================================

/**
 * CACHING STRATEGY:
 * - AssetCache: In-memory Map for session-duration caching
 * - Keys include all relevant parameters (text, age, voice)
 * - Prevents redundant API calls for identical content
 * - Cleared on page refresh or via clearAssetCache()
 * 
 * TOKEN BUDGET MANAGEMENT:
 * - TokenTracker monitors cumulative API usage
 * - Budget cap: 150,000 tokens per session (safety limit)
 * - Prevents runaway costs from infinite loops or bugs
 * - Throws error if cap exceeded
 * 
 * ABORT SIGNAL PATTERN:
 * - All async functions accept optional AbortSignal
 * - Enables cancellation of in-progress operations
 * - Critical for UX: Cancel generation when user changes mind
 * - Prevents orphaned API calls on component unmount
 * 
 * RETRY LOGIC:
 * - Exponential backoff: 1s, 2s, 4s delays
 * - Retries on transient errors: 429 (rate limit), 500 (server), 503 (overload)
 * - No retry on permanent errors: 400 (bad request), auth failures
 * - Respects AbortSignal during retry delays
 * 
 * MODEL FALLBACKS:
 * - Primary model fails → try fallback models automatically
 * - Example: TTS model unavailable → degrades gracefully
 * - Logs warnings but doesn't expose errors to user
 * - Returns empty string on complete failure (silent degradation)
 */

/**
 * AUDIO LATENCY OPTIMIZATION:
 * 
 * Target: Sub-200ms end-to-end latency for Live API
 * 
 * 1. Capture Latency (~50ms):
 *    - Small buffer: 2048 samples at 16kHz = 128ms
 *    - ScriptProcessor fires every 128ms with fresh audio
 * 
 * 2. Network Latency (~20-100ms):
 *    - WebSocket persistent connection (no HTTP overhead)
 *    - Binary PCM transmission (minimal encoding)
 * 
 * 3. Processing Latency (~10-50ms):
 *    - Gemini Live API real-time inference
 *    - Optimized for low-latency streaming
 * 
 * 4. Playback Latency (~20ms):
 *    - AudioContext immediate scheduling
 *    - Pre-allocated buffers (no garbage collection pauses)
 * 
 * Total: ~100-220ms typical, <300ms worst case
 */
