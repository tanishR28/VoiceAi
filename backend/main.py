"""
Voice Biomarker Disease Tracking - FastAPI Backend
Main application entry point with CORS middleware and routing.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()  # Load variables from .env into os.environ

from routers.analysis import router as analysis_router

app = FastAPI(
    title="Voice Biomarker API",
    description="AI-powered vocal biomarker analysis for disease tracking. "
                "Analyzes voice recordings to extract tremor, breathlessness, pitch, "
                "speech rate, pause patterns, and other clinically-relevant biomarkers.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analysis_router)


@app.get("/")
async def root():
    return {
        "message": "Voice Biomarker Disease Tracking API",
        "docs": "/docs",
        "version": "1.0.0",
    }
