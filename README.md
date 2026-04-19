# AIchitect — AI-powered system design advisor

> Generate interview-ready system design documents in seconds.

**[Live Demo →](https://aichitect.vercel.app)**

---

## About

AIchitect takes a plain-language description of a system you want to build and produces a complete, structured system design document — the kind of answer a strong candidate would give in a senior engineering interview.

Describe your system (e.g. *"WhatsApp-style 1:1 chat app"*), let the AI suggest appropriate parameters, and click **Generate Design**. In seconds you get a full breakdown: requirements, scale estimates, architecture diagram, API design, database schema, scaling strategy, technology stack, bottlenecks, and interview tips — all rendered with interactive navigation and exportable as a clean PDF.

---

## Features

- **AI-suggested parameters** — "Suggest for me" pre-populates all four form fields (DAU, read/write ratio, geographic scope, key requirements) based on your system description. Per-field sparkle badges show which values are AI-chosen and disappear the moment you override them manually.
- **Structured nine-section output** — follows real interview conventions, with a Mermaid.js architecture diagram in every design
- **"Why the AI Chose These Parameters"** — optional rationale section explaining the AI's parameter choices, only shown when AI suggestions are active
- **Interactive Table of Contents** — instant scroll-to-section navigation
- **Print / Save as PDF** — clean print stylesheet, dynamic filename from the generated design title, Design Request summary and attribution footer on every export
- **Copy as Markdown** — raw output for Notion, Confluence, or any markdown tool
- **Collapsible form panel** — maximise reading space without losing form state

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Markdown rendering | react-markdown + remark-gfm |
| Diagram rendering | Mermaid.js |
| Backend | FastAPI (Python 3.11) |
| AI | Anthropic Claude API (Haiku for suggestions, Haiku/Sonnet/Opus for generation) |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- An [Anthropic API key](https://console.anthropic.com)

### Backend

```bash
cd backend

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt

cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
# Tip: set AI_PROVIDER=mock for zero-cost frontend development

uvicorn app.main:app --reload
# API:  http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

To point the frontend at a non-default backend URL, create `frontend/.env.local`:

```
VITE_API_URL=http://localhost:8000
```

---

## Deployment

### Backend → Render (free tier)

1. Create a **Web Service** on [render.com](https://render.com) and connect this repository
2. Set **Root Directory** to `backend`
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `AI_PROVIDER` = `claude`
   - `CLAUDE_MODEL` = `claude-haiku-4-5-20251001`
6. Note the generated Render URL (e.g. `https://aichitect-api.onrender.com`)
7. Update `backend/app/main.py` CORS origins with your Vercel frontend URL, then commit + push

### Frontend → Vercel

1. Import this repository in [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend` — this tells Vercel it's a Vite app
3. Framework preset will auto-detect as **Vite**
4. Add environment variable: `VITE_API_URL` = your Render URL from above
5. Deploy

> **Render free-tier note:** the backend spins down after 15 minutes of inactivity. The first request after a quiet period has a ~30 second cold start. This is fine for a portfolio demo.

---

## Cost Notes

- All AI calls use **Claude Haiku** — Anthropic's most cost-efficient model
- "Suggest for me" call: ~$0.001 · Full design generation: ~$0.01–0.03
- Set a **monthly spending limit** in the [Anthropic Console](https://console.anthropic.com) under Billing → Usage limits to cap your maximum exposure regardless of traffic volume
- During development, set `AI_PROVIDER=mock` in `.env` for instant, zero-cost responses

---

## Project Structure

```
02-aichitect/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app, CORS config
│   │   ├── models/design.py           # Pydantic request/response models
│   │   ├── routers/design.py          # API route handlers
│   │   ├── services/ai_service.py     # AI abstraction layer (Mock / Claude)
│   │   └── prompts/system_prompt.txt  # System design output specification
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx                    # Root layout, global state, API calls
    │   └── components/
    │       ├── DesignForm.jsx         # Form with AI suggestion + sparkle badges
    │       └── DesignOutput.jsx       # Markdown renderer, ToC, PDF export
    ├── public/favicon.svg
    ├── .env.example
    └── index.html                     # OG / Twitter meta tags
```

---

## Built by

**Michael Suh** — [michaelsuh.vercel.app](https://michaelsuh.vercel.app)

---

*AIchitect is a portfolio project demonstrating full-stack AI product development with React, FastAPI, and the Anthropic Claude API.*
