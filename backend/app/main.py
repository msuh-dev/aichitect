from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import design

load_dotenv()

app = FastAPI(
    title="AIchitect API",
    description="AI-powered system design generator for interview prep and architecture planning.",
    version="0.1.0",
)

# CORS — allows the React frontend (running on localhost:5173 in dev,
# or the Vercel domain in prod) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # fallback
        # Add your Vercel frontend URL here before deploying:
        # "https://aichitect.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(design.router)


@app.get("/")
async def root():
    return {"message": "AIchitect API is running. Visit /docs for the API reference."}
