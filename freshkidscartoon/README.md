<div align="center">
<img width="1200" height="475" alt="MyCartoon Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎨 MyCartoon — AI Cartoon Studio for Kids

A magical, voice-directed cartoon creator powered by Google Gemini. Kids use their voice to direct their own animated cartoons with AI-generated characters, scenes, and narration.

## ✨ Features

- 🎙️ Voice-directed cartoon creation via Gemini Live API
- 🎬 Full cinema playback with narration and captions
- 🛍️ In-app shop with Stripe payments
- 🕹️ Mini-games during AI generation (Bubble Pop, Catch Stars, Geometry Wars, Whack-a-Mole)
- 💾 Projects saved locally via IndexedDB
- 🔒 COPPA-compliant privacy policy built in

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| AI | Google Gemini (`@google/genai`) |
| Backend / DB | Supabase (Edge Functions + Postgres) |
| Payments | Stripe |
| Build | Vite 6, Vitest |
| State | Zustand |
| Animation | Motion (Framer Motion) |
| Audio | Howler.js |

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 (v20 LTS recommended)
- **Supabase CLI** (for Edge Functions) — `npm install -g supabase`

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd mycartoon
npm install
```

### 2. Configure Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|----------|----------------|
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) |
| `VITE_SUPABASE_URL` | Supabase project → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase project → Settings → API |

> ⚠️ **Never commit `.env.local` or any file containing real API keys.**

### 3. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

### 4. Run Tests

```bash
npm test
```

### 5. Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

## 🗄️ Supabase Setup

Apply the database schema:

```bash
supabase db push  # or run supabase_schema.sql manually in the SQL editor
```

Deploy Edge Functions:

```bash
bash deploy_functions.sh
```

Set required Supabase secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set GEMINI_API_KEY=your_key_here
```

## 📁 Project Structure

```
mycartoon/
├── src/
│   ├── components/
│   │   ├── minigames/          # BubblePop, CatchStars, GeometryWars, WhackAMole
│   │   ├── CinemaPlayer.tsx    # Cartoon playback engine
│   │   ├── DirectorChat.tsx    # Voice/text director interface
│   │   ├── ProductionLoader.tsx
│   │   ├── Shop.tsx
│   │   ├── CoppaPrivacyPolicy.tsx
│   │   └── ErrorBoundary.tsx
│   ├── services/
│   │   └── geminiService.ts    # All Gemini API calls
│   ├── utils/
│   │   ├── storage.ts          # IndexedDB helpers
│   │   ├── supabase.ts
│   │   ├── stripe.ts
│   │   └── sound.ts
│   ├── App.tsx
│   ├── store.ts                # Zustand global store
│   ├── constants.ts
│   ├── types.ts
│   └── audio.ts
├── supabase/
│   ├── functions/              # Edge Functions (generate, webhook, payment-sheet, decrement-veo)
│   └── migrations/
├── docs/
│   └── NARRATION_SYSTEM_DOCS.md
├── .env.example                # Template — safe to commit
├── supabase_schema.sql
└── deploy_functions.sh
```

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push and open a PR

## 📄 License

Private — all rights reserved.

## 🚧 Coming Soon Mode

The app ships with a coming soon page (`coming-soon.html`) that can be served instead of the full app while you're not ready for public traffic.

**Serve the coming soon page locally:**
```bash
npm run dev:coming-soon
```

**Build & deploy the coming soon page:**
```bash
npm run build:coming-soon
```

**Deploy the real app when you're ready:**
```bash
npm run build
```

On hosting platforms (Netlify, Vercel, etc.) you can set `COMING_SOON=true` as an environment variable so you can flip it without changing code.
