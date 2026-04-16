# AIchitect

An AI-powered system design advisor for software engineers preparing for technical interviews and architects planning new systems.

Enter a system description and scale requirements — AIchitect generates a complete, structured system design document covering architecture, API design, database choices, scaling strategies, load estimates, and interview tips.

## Tech Stack

- **Frontend:** React + Vite, Tailwind CSS, Mermaid.js
- **Backend:** Python + FastAPI
- **AI:** Claude API (Anthropic) → abstracted for future model migration
- **Deployment:** Vercel (frontend) + Railway (backend)

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # then add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive API reference.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`.

## Project Structure

```
aichitect/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── routers/          # API route handlers
│   │   ├── services/         # AI service abstraction layer
│   │   ├── models/           # Pydantic request/response models
│   │   └── prompts/          # AI system prompt
│   └── requirements.txt
└── frontend/                 # React + Vite (scaffolded separately)
```

## License

MIT
