/**
 * System Constants & Configuration for MyCartoon.org
 * 
 * Centralized configuration for:
 * - AI Director personas and system prompts
 * - Theme configurations for UI customization
 * - Voice profiles for TTS narration
 * - Music tracks and sound effects libraries
 * 
 * @module constants
 * @author Travis (MyCartoon.org)
 * @version 2.0
 */

import { Theme, VoiceSkin } from "./types";

// ==============================================================================
// AI DIRECTOR PERSONAS - System Prompts
// ==============================================================================

/**
 * Fallback Text-Based Director Prompt
 * 
 * Used when Gemini Live API is unavailable (browser compatibility, network issues).
 * Provides basic brainstorming guidance with completion detection.
 * 
 * COMPLETION TRIGGER:
 * Director must append "[startFilming]" magic string when story is ready.
 * This signals the UI to transition from brainstorming to production mode.
 * 
 * @param age - Child's age (affects vocabulary and complexity)
 * @returns System instruction string for text-based chat
 */
export const GET_SYSTEM_INSTRUCTION_BRAINSTORM = (age: number) => `
You are a high-energy, friendly cartoon director. The user is a ${age}-year-old kid.
Your goal: Collaborate to invent a short, fun story for a cartoon.

**PERSONALITY & TONE:**
- Tone: Exciting, encouraging, simple words.
- Sound: Use short sentences. Be enthusiastic! Say things like "Wow!" and "Awesome!".

**RULES:**
1. Ask exactly 1 simple question at a time (e.g., "Is the hero a cat or a dog?", "Where do they live?").
2. Keep the conversation fast. Don't ramble. Let the kid do the talking.
3. **CRITICAL INSTRUCTION:** When you have gathered 3 key details (Hero, Setting, Problem) OR if the user says "Start", "I'm done", "Action", or "Ready":
   - **DO NOT** ask any more questions.
   - You MUST say a very short wrap-up phrase like "Awesome! Let's make this movie!"
   - You MUST append the exact phrase "[startFilming]" at the very end of your message. This is a magic trigger word. Do not forget it.
`;

// ==============================================================================
// LIVE API DIRECTOR PERSONAS
// ==============================================================================

/**
 * "Bubbles" - Director for Ages 5-7
 * 
 * PERSONA DESIGN:
 * - Target: Early elementary, limited attention span
 * - Energy: Maximum enthusiasm, giggly, playful
 * - Vocabulary: 1-2 syllable words, concrete nouns
 * - Questions: Binary choices ("cat or dog?", "pink or blue?")
 * - Patience: High tolerance for pauses and simple answers
 * 
 * CONVERSATION STRATEGY:
 * - Ask about appearance first (visual, engaging)
 * - Then location (easier than abstract plot)
 * - Finally action (what they do, not why)
 * - Example: "What color is the hero?" → "Where do they live?" → "What fun thing do they do?"
 * 
 * COMPLETION CRITERIA:
 * - 3 elements: Character + Place + Action
 * - Trigger phrases: "ready", "start", "done"
 * - Calls startFilming tool with simple summary
 */
const PERSONA_BUBBLES = `
You are "Bubbles", a silly, giggly, and incredibly enthusiastic cartoon director for little kids (ages 5-7).
Your goal is to help the child invent a short, fun story for a cartoon.

**CRITICAL INSTRUCTIONS:**
1. **SPEAK FIRST:** As soon as the connection starts, you MUST say: "Hi! I'm Bubbles! What kind of cartoon do you want to make today?"
2. **VOICE & TONE:** High energy, use simple words, and say things like "Wow!", "Cool!", and "Yippee!".
3. **STRATEGY:** Ask VERY simple, one-at-a-time questions. For example: "Is the hero a cat or a dog?", "Are they pink or blue?", "Where do they live?".
4. **BREVITY:** Keep your responses extremely short (1 sentence maximum). Let the child do most of the talking.
5. **SILENCE:** If the child stops talking or is quiet, ask a gentle prompt like "Are you there?" or "What happens next?".
6. **THE MAGIC BUTTON:** When you have gathered 3 key details (a Character, a Place, and a Fun Thing they do), or if the child says they are ready, you MUST say "Let's make it!" and IMMEDIATELY CALL THE TOOL \`startFilming\`.
7. **TOOL USAGE:** When calling \`startFilming\`, you MUST provide a \`summary\` of the story you created together. Do not ask any more questions after calling the tool.
`;

/**
 * "Director Spark" - Director for Ages 8-10
 * 
 * PERSONA DESIGN:
 * - Target: Mid-elementary, developing narrative sense
 * - Energy: Action-packed, adventurous, coach-like
 * - Vocabulary: 2-3 syllable words, action verbs
 * - Questions: Open-ended with guidance ("Tell me about the villain!", "What superpower?")
 * - Engagement: Use competitive framing ("epic quest", "ultimate challenge")
 * 
 * CONVERSATION STRATEGY:
 * - Lead with genre/mood ("action movie? comedy?")
 * - Build character with motivation ("What does the hero want?")
 * - Introduce conflict ("Who tries to stop them?")
 * - Example: "What epic adventure are we making?" → "Who's the hero?" → "What villain are they fighting?"
 * 
 * COMPLETION CRITERIA:
 * - 3 elements: Hero + Villain/Problem + Setting
 * - More complex summary expected
 * - Trigger: "Action!", "Ready!", or complete plot
 */
const PERSONA_SPARK = `
You are "Director Spark", an adventurous, action-packed movie director for kids (ages 8-10).
Your goal is to collaborate with the child to create an awesome, exciting cartoon story.

**CRITICAL INSTRUCTIONS:**
1. **SPEAK FIRST:** As soon as the connection starts, you MUST say: "Lights, Camera, Action! I'm Director Spark. What epic movie are we filming today?"
2. **VOICE & TONE:** Enthusiastic, confident, like an action hero or a sports coach.
3. **STRATEGY:** Ask fun, engaging questions to build the plot. Use "Would you rather" questions or ask about superpowers, villains, and epic quests.
4. **BREVITY:** Keep your responses short and punchy (1-2 sentences). Keep the pace fast and exciting.
5. **THE MAGIC BUTTON:** When the story has a clear Hero, a Villain/Problem, and a Setting, or if the child says "Action!" or "Ready", you MUST say "Rolling camera!" and IMMEDIATELY CALL THE TOOL \`startFilming\`.
6. **TOOL USAGE:** When calling \`startFilming\`, you MUST provide a detailed \`summary\` of the plot. Do not continue the conversation after calling the tool.
`;

/**
 * "Ace" - Director for Ages 11-13
 * 
 * PERSONA DESIGN:
 * - Target: Pre-teen, capable of abstract thinking
 * - Energy: Professional, cool, slightly sarcastic
 * - Vocabulary: Industry jargon, sophisticated concepts
 * - Questions: Screenwriting terms ("character arc", "plot twist", "climax")
 * - Respect: Treats user as peer, not child
 * 
 * CONVERSATION STRATEGY:
 * - Start with pitch ("Sell me the movie in one sentence")
 * - Dig into theme ("What's it really about?")
 * - Challenge structure ("How does it end?")
 * - Example: "Pitch me your idea" → "What's the main conflict?" → "How does the protagonist change?"
 * 
 * COMPLETION CRITERIA:
 * - Full three-act structure: Setup, Conflict, Resolution
 * - Character motivation and arc
 * - Trigger: "done", "that's it", or complete narrative
 */
const PERSONA_ACE = `
You are "Ace", a professional, cool, and slightly edgy Hollywood director for older kids (ages 11-13).
Your goal is to help the user craft a cinematic masterpiece with a compelling narrative.

**CRITICAL INSTRUCTIONS:**
1. **SPEAK FIRST:** As soon as the connection starts, you MUST say: "Welcome to the studio. I'm Ace. Pitch me your movie idea."
2. **VOICE & TONE:** Confident, slightly sarcastic but encouraging. Use movie industry terms like "Scene", "Action", "Plot twist", "Climax", and "Character Arc".
3. **STRATEGY:** Ask about the genre, the main conflict, the protagonist's motivation, and the climax. Treat them like a real screenwriter.
4. **BREVITY:** Keep it conversational but focused. Do not ramble. (2 sentences maximum).
5. **THE MAGIC BUTTON:** When the plot is solid and has a clear beginning, middle, and end, or if the user says they are done, you MUST say "That's a wrap on the writing room! Let's shoot this." and IMMEDIATELY CALL THE TOOL \`startFilming\`.
6. **TOOL USAGE:** When calling \`startFilming\`, you MUST provide a comprehensive \`summary\` of the story. End the conversation once the tool is called.
`;

/**
 * Returns age-appropriate Live API system prompt
 * 
 * AGE BRACKETS:
 * - < 8: Bubbles (simple, binary questions, high energy)
 * - 8-10: Spark (adventurous, action-focused, coach-like)
 * - ≥ 11: Ace (professional, industry terms, peer-level)
 * 
 * @param age - Child's age
 * @returns System instruction for Gemini Live API
 */
export const GET_LIVE_SYSTEM_INSTRUCTION = (age: number) => {
    if (age < 8) return PERSONA_BUBBLES;
    if (age < 11) return PERSONA_SPARK;
    return PERSONA_ACE;
};

// ==============================================================================
// SCRIPT GENERATION SYSTEM PROMPT
// ==============================================================================

/**
 * Script Writer System Prompt
 * 
 * Generates structured JSON scripts from story concepts.
 * Handles both Storybook (static images) and Movie (8-second videos) modes.
 * 
 * KEY REQUIREMENTS:
 * 
 * 1. SCENE COUNT:
 *    - Exactly N scenes (default 6)
 *    - Each scene = 1 image/video + narration
 * 
 * 2. VISUAL DESCRIPTIONS:
 *    - CRITICAL: Repeat character details in every scene
 *    - Example: "The blue robot with red eyes" (not just "the robot")
 *    - Prevents character inconsistency across scenes
 *    - Specify camera angle: "Wide shot", "Full body shot", "Medium shot"
 *    - Avoid extreme close-ups (causes AI generation issues)
 * 
 * 3. NARRATION PACING (Movie Mode):
 *    - Each scene = 8-second video
 *    - Narration = 15-20 words (fits 8 seconds at normal speech rate)
 *    - Too short: Awkward silence
 *    - Too long: Cuts off mid-sentence
 * 
 * 4. AGE APPROPRIATENESS:
 *    - Vocabulary matches target age
 *    - Themes suitable for age group
 *    - No violence, scary content, or complex concepts for young kids
 * 
 * @param age - Target audience age
 * @param isMovieMode - true = video generation, false = static images
 * @param sceneCount - Number of scenes to generate (default 6)
 * @returns System instruction for script generation
 */
export const GET_SYSTEM_INSTRUCTION_SCRIPT = (age: number, isMovieMode: boolean = false, sceneCount: number = 6) => `
You are a professional screenwriter for children's cartoons targeting ${age}-year-olds.
Output a JSON object ONLY. 
Structure the story into exactly ${sceneCount} distinct scenes.
${isMovieMode ? 'Since this is a movie, keep visual descriptions SHORT and PUNCHY (under 15 words) for video generation. Ensure consistent character details (e.g. "blue cat in red hat") in every scene. CRITICAL: The narration for each scene MUST be exactly paced to fit an 8-second video. Write enough narration to fill 8 seconds, but no more (roughly 15-20 words).' : ''}
- For age ${age}, ensure the vocabulary and themes are appropriate.
Also return "characters": one line per character locking in their fixed appearance (name, colour, shape, clothing). The image generator is given this list for every scene, so it must never change between scenes.
Each scene must have:
- narrative: The exact text the narrator will speak (${isMovieMode ? 'roughly 15-20 words to fit an 8-second video' : '1-2 sentences max'}).
- visualDescription: A detailed, vivid description for the image generator. ALWAYS repeat the main character's physical details (e.g., "The blue robot with red eyes") to ensure consistency. Specify the camera angle (e.g., "Wide shot", "Full body shot") to avoid extreme close-ups. Describe the background and action clearly.
`;

// ==============================================================================
// AUDIO ASSET LIBRARIES
// ==============================================================================

/**
 * Background Music Tracks
 * 
 * Curated royalty-free music from Mixkit.
 * Users can select tracks in the production interface.
 * 
 * CATEGORIES:
 * - Upbeat/Happy: "Happy Day", "Playful Fun"
 * - Adventure: "Epic Adventure", "Action Hero"
 * - Calm/Dreamy: "Dreamy Stars"
 * - Suspense: "Secret Mission"
 * - Electronic: "Space Disco"
 */
export const MUSIC_TRACKS = [
  { name: 'Silence 😶', url: '' },
  { name: 'Happy Day ☀️', url: 'https://assets.mixkit.co/music/preview/mixkit-happy-day-526.mp3' },
  { name: 'Playful Fun 🍭', url: 'https://assets.mixkit.co/music/preview/mixkit-funny-and-playful-childhood-music-592.mp3' },
  { name: 'Epic Adventure ⚔️', url: 'https://assets.mixkit.co/music/preview/mixkit-epic-hero-journey-theme-music-2487.mp3' },
  { name: 'Dreamy Stars 🌙', url: 'https://assets.mixkit.co/music/preview/mixkit-dreamy-lullaby-and-piano-background-539.mp3' },
  { name: 'Action Hero ⚡', url: 'https://assets.mixkit.co/music/preview/mixkit-energetic-hero-adventure-theme-2484.mp3' },
  { name: 'Secret Mission 🔍', url: 'https://assets.mixkit.co/music/preview/mixkit-suspenseful-mystery-and-thriller-track-1262.mp3' },
  { name: 'Space Disco 🚀', url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3' }
];

/**
 * Sound Effects Library
 * 
 * Cartoony sound effects for enhancing scenes.
 * Royalty-free from Mixkit.
 * 
 * CATEGORIES:
 * - Magic/Fantasy: "Magic" (sparkle)
 * - Comedy: "Laugh", "Boing", "Pop", "Bonk"
 * - Transitions: "Swoosh"
 * - Victory: "Cheer", "Tada!"
 */
export const SOUND_EFFECTS = [
  { name: 'No Sound 🔇', url: '' },
  { name: 'Magic ✨', url: 'https://assets.mixkit.co/sfx/preview/mixkit-fairy-dust-sparkle-861.mp3' },
  { name: 'Laugh 😂', url: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-laugh-voice-2838.mp3' },
  { name: 'Boing 🦘', url: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-boing-2832.mp3' },
  { name: 'Cheer 🎉', url: 'https://assets.mixkit.co/sfx/preview/mixkit-animated-small-group-applause-523.mp3' },
  { name: 'Pop 🎈', url: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-pop-sound-2868.mp3' },
  { name: 'Swoosh 💨', url: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-fast-swoosh-2882.mp3' },
  { name: 'Tada! 🎺', url: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-musical-surprise-2877.mp3' },
  { name: 'Bonk 🔨', url: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-funny-bonk-2875.mp3' }
];

// ==============================================================================
// UI THEMES
// ==============================================================================

/**
 * Studio Theme Configurations
 * 
 * Customizable UI themes purchasable with in-app tokens.
 * Each theme provides:
 * - Gradient background
 * - Panel styling (background, border)
 * - Button styles (primary, secondary)
 * - Accent colors
 * - Font family override
 * 
 * PRICING TIERS:
 * - Free: Classic Studio (default)
 * - Budget: 1500-3000 tokens (Neon City, Candy Cloud, Ocean Deep)
 * - Mid: 3500-5000 tokens (Jungle Safari, Space Station, Royal Castle)
 * - Premium: 5500-7500 tokens (Volcano Magma, Ice Palace, Pixel Retro, Pirate Ship)
 * - Ultimate: 8000-10000 tokens (Superhero HQ, Secret Spy)
 */
export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Classic Studio',
    cost: 0,
    description: 'The standard MyCartoon studio look.',
    mainGradient: 'from-violet-900 via-fuchsia-900 to-indigo-900',
    bgClass: 'bg-violet-900',
    fontClass: 'font-sans',
    panelBg: 'bg-white/10',
    panelBorder: 'border-white/20',
    buttonPrimary: 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(192,38,211,0.5)]',
    buttonSecondary: 'bg-white/10 hover:bg-white/20',
    textAccent: 'text-fuchsia-400',
    bubbleColor: 'bg-fuchsia-600'
  },
  {
    id: 'neon_city',
    name: 'Neon City',
    cost: 1500,
    description: 'Electric vibes for night owls.',
    mainGradient: 'from-black via-slate-900 to-fuchsia-900',
    bgClass: 'bg-black',
    fontClass: 'font-mono',
    panelBg: 'bg-black/80',
    panelBorder: 'border-fuchsia-500/50',
    buttonPrimary: 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]',
    buttonSecondary: 'bg-cyan-800 hover:bg-cyan-700',
    textAccent: 'text-cyan-400',
    bubbleColor: 'bg-fuchsia-600'
  },
  {
    id: 'candy_cloud',
    name: 'Candy Cloud',
    cost: 2500,
    description: 'Sweet, sugary, and full of dreams.',
    mainGradient: 'from-pink-200 via-purple-100 to-sky-200',
    bgClass: 'bg-pink-100',
    fontClass: 'font-serif',
    panelBg: 'bg-white/60',
    panelBorder: 'border-pink-300',
    buttonPrimary: 'bg-pink-400 hover:bg-pink-300',
    buttonSecondary: 'bg-sky-400 hover:bg-sky-300',
    textAccent: 'text-pink-600',
    bubbleColor: 'bg-pink-400'
  },
  {
    id: 'ocean_deep',
    name: 'Ocean Deep',
    cost: 3000,
    description: 'Dive into the mysterious blue.',
    mainGradient: 'from-cyan-900 via-blue-900 to-indigo-950',
    bgClass: 'bg-cyan-950',
    fontClass: 'font-sans',
    panelBg: 'bg-blue-900/40',
    panelBorder: 'border-cyan-500/30',
    buttonPrimary: 'bg-cyan-600 hover:bg-cyan-500',
    buttonSecondary: 'bg-blue-800 hover:bg-blue-700',
    textAccent: 'text-cyan-300',
    bubbleColor: 'bg-cyan-600'
  },
  {
    id: 'jungle_safari',
    name: 'Jungle Safari',
    cost: 3500,
    description: 'Wild adventures in the green.',
    mainGradient: 'from-green-900 via-emerald-800 to-yellow-900',
    bgClass: 'bg-green-950',
    fontClass: 'font-sans',
    panelBg: 'bg-green-950/60',
    panelBorder: 'border-green-400/30',
    buttonPrimary: 'bg-green-600 hover:bg-green-500',
    buttonSecondary: 'bg-yellow-800 hover:bg-yellow-700',
    textAccent: 'text-green-400',
    bubbleColor: 'bg-green-600'
  },
  {
    id: 'space_station',
    name: 'Space Station',
    cost: 4000,
    description: 'Orbit the earth in high tech style.',
    mainGradient: 'from-gray-900 via-slate-800 to-black',
    bgClass: 'bg-slate-900',
    fontClass: 'font-mono',
    panelBg: 'bg-slate-800/80',
    panelBorder: 'border-white/20',
    buttonPrimary: 'bg-white text-black hover:bg-gray-200',
    buttonSecondary: 'bg-slate-700 hover:bg-slate-600',
    textAccent: 'text-white',
    bubbleColor: 'bg-slate-500'
  },
  {
    id: 'royal_castle',
    name: 'Royal Castle',
    cost: 5000,
    description: 'For kings, queens, and knights.',
    mainGradient: 'from-purple-900 via-fuchsia-900 to-yellow-700',
    bgClass: 'bg-purple-950',
    fontClass: 'font-serif',
    panelBg: 'bg-purple-950/70',
    panelBorder: 'border-yellow-400/50',
    buttonPrimary: 'bg-yellow-500 hover:bg-yellow-400 text-black',
    buttonSecondary: 'bg-purple-800 hover:bg-purple-700',
    textAccent: 'text-yellow-400',
    bubbleColor: 'bg-yellow-500'
  },
  {
    id: 'volcano_magma',
    name: 'Volcano Magma',
    cost: 5500,
    description: 'Hot! Hot! Hot!',
    mainGradient: 'from-red-900 via-orange-900 to-yellow-900',
    bgClass: 'bg-red-950',
    fontClass: 'font-sans',
    panelBg: 'bg-red-950/60',
    panelBorder: 'border-orange-500',
    buttonPrimary: 'bg-orange-600 hover:bg-orange-500',
    buttonSecondary: 'bg-red-800 hover:bg-red-700',
    textAccent: 'text-orange-400',
    bubbleColor: 'bg-orange-600'
  },
  {
    id: 'ice_palace',
    name: 'Ice Palace',
    cost: 6000,
    description: 'Frozen fractals all around.',
    mainGradient: 'from-cyan-100 via-blue-200 to-white',
    bgClass: 'bg-cyan-50',
    fontClass: 'font-serif',
    panelBg: 'bg-white/40',
    panelBorder: 'border-cyan-200',
    buttonPrimary: 'bg-cyan-400 hover:bg-cyan-300 text-black',
    buttonSecondary: 'bg-blue-200 hover:bg-blue-100 text-black',
    textAccent: 'text-cyan-700',
    bubbleColor: 'bg-cyan-400'
  },
  {
    id: 'pixel_retro',
    name: 'Pixel Retro',
    cost: 7000,
    description: '8-bit gaming nostalgia.',
    mainGradient: 'from-green-900 via-black to-green-900',
    bgClass: 'bg-black',
    fontClass: 'font-mono',
    panelBg: 'bg-black/90',
    panelBorder: 'border-green-500 dashed',
    buttonPrimary: 'bg-green-500 hover:bg-green-400 text-black font-mono',
    buttonSecondary: 'bg-green-900 hover:bg-green-800 font-mono',
    textAccent: 'text-green-500 font-mono',
    bubbleColor: 'bg-green-600'
  },
  {
    id: 'pirate_ship',
    name: 'Pirate Ship',
    cost: 7500,
    description: 'Yarrr! Sail the seven seas.',
    mainGradient: 'from-amber-900 via-yellow-900 to-black',
    bgClass: 'bg-amber-950',
    fontClass: 'font-serif',
    panelBg: 'bg-amber-950/80',
    panelBorder: 'border-amber-600/50',
    buttonPrimary: 'bg-amber-600 hover:bg-amber-500',
    buttonSecondary: 'bg-black/50 hover:bg-black/70',
    textAccent: 'text-amber-400',
    bubbleColor: 'bg-amber-700'
  },
  {
    id: 'superhero_hq',
    name: 'Superhero HQ',
    cost: 8000,
    description: 'Save the day in style.',
    mainGradient: 'from-blue-900 via-red-900 to-yellow-900',
    bgClass: 'bg-blue-950',
    fontClass: 'font-sans',
    panelBg: 'bg-slate-900/90',
    panelBorder: 'border-yellow-500',
    buttonPrimary: 'bg-red-600 hover:bg-red-500',
    buttonSecondary: 'bg-blue-700 hover:bg-blue-600',
    textAccent: 'text-yellow-400',
    bubbleColor: 'bg-blue-600'
  },
  {
    id: 'secret_spy',
    name: 'Secret Spy',
    cost: 10000,
    description: 'Top secret blueprint mode.',
    mainGradient: 'from-blue-950 via-slate-950 to-black',
    bgClass: 'bg-black',
    fontClass: 'font-mono',
    panelBg: 'bg-blue-950/90',
    panelBorder: 'border-blue-400/20',
    buttonPrimary: 'bg-blue-600/50 hover:bg-blue-500/50 border border-blue-400',
    buttonSecondary: 'bg-black hover:bg-slate-900',
    textAccent: 'text-blue-400 font-mono',
    bubbleColor: 'bg-blue-900'
  }
];

// ==============================================================================
// TTS VOICE PROFILES
// ==============================================================================

/**
 * Text-to-Speech Voice Skins
 * 
 * Purchasable narrator voices for cartoon narration.
 * Each voice has distinct characteristics suitable for different story types.
 * 
 * VOICE CHARACTERISTICS:
 * - Kore (FREE): Balanced, friendly, universal (default choice)
 * - Puck: Energetic, playful, comedic (great for silly stories)
 * - Charon: Deep, resonant, epic (adventure/fantasy stories)
 * - Fenrir: Intense, commanding, powerful (action movies)
 * - Zephyr: Calm, soothing, gentle (fairytales, bedtime stories)
 * 
 * TECHNICAL DETAILS:
 * - Voices are Gemini TTS prebuilt configurations
 * - Applied via speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName
 * - Same voice used for both director chat and scene narration
 */
export const VOICE_SKINS: VoiceSkin[] = [
  {
    id: 'Kore',
    name: 'Director Kore (Standard)',
    cost: 0,
    description: 'A balanced, friendly voice. Perfect for any story.',
    gender: 'Female',
    tone: 'Warm'
  },
  {
    id: 'Puck',
    name: 'Director Puck',
    cost: 4000,
    description: 'Energetic, playful, and mischievous. Great for comedy!',
    gender: 'Male',
    tone: 'Playful'
  },
  {
    id: 'Charon',
    name: 'Director Charon',
    cost: 6000,
    description: 'Deep, resonant, and serious. Ideal for epic adventures.',
    gender: 'Male',
    tone: 'Deep'
  },
  {
    id: 'Fenrir',
    name: 'Director Fenrir',
    cost: 8000,
    description: 'Intense, strong, and commanding. For action movies!',
    gender: 'Male',
    tone: 'Intense'
  },
  {
    id: 'Zephyr',
    name: 'Director Zephyr',
    cost: 5000,
    description: 'Calm, soothing, and gentle. Perfect for fairytales.',
    gender: 'Female',
    tone: 'Calm'
  }
];
