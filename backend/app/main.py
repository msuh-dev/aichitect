import logging
import os
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import design, webhooks

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

app = FastAPI(
    title="AIchitect API",
    description="AI-powered system design generator for interview prep and architecture planning.",
    version="0.1.0",
)

# CORS — allows the React frontend (running on localhost:5173 in dev,
# or the Vercel domain in prod) to call this API.
# Auth is done via Authorization: Bearer header, so allow_credentials is not needed.
_EXTRA_ORIGINS = [o.strip() for o in os.getenv("EXTRA_CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                        # Vite dev server
        "http://localhost:3000",                        # fallback
        "https://momijilabs-aichitect.vercel.app",     # Production frontend
        *_EXTRA_ORIGINS,
    ],
    allow_origin_regex=r"https://momijilabs-aichitect.*\.vercel\.app",  # PR preview deployments
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(design.router)
app.include_router(webhooks.router)


@app.get("/")
async def root():
    return {"message": "AIchitect API is running. Visit /docs for the API reference."}
