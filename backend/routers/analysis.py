"""
Analysis Router
API endpoints for voice biomarker analysis.
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from models.schemas import AnalysisResponse

router = APIRouter(prefix="/api", tags=["analysis"])

import os
import sys
import shutil
import traceback
import subprocess
import time
from fastapi.responses import JSONResponse


ml_model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ML", "rudra123"))
if ml_model_dir not in sys.path:
    sys.path.insert(0, ml_model_dir)

try:
    from inference import MultiDiseaseInferenceEngine  # type: ignore
except ImportError as import_error:
    print(f"[ERROR] Failed to import ML engine from {ml_model_dir}: {import_error}")
    MultiDiseaseInferenceEngine = None


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_voice(
    file: UploadFile = File(...),
    disease: str = Form("unknown"),
):
    """Voice biomarker analysis using authentic PyTorch models.

    Args:
        file: Audio file upload
        disease: The user's selected disease condition

    Returns:
        AnalysisResponse with extracted biomarkers
    """
    temp_file_name = f"temp_{uuid.uuid4()}_{file.filename}"
    try:
        print(f"[DEBUG] Audio received: {file.filename}")
        with open(temp_file_name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        time.sleep(0.4) # Delay to avoid incomplete file writes
        
        file_size = os.path.getsize(temp_file_name)
        print(f"[DEBUG] File size: {file_size} bytes")

        if file_size == 0 or file_size < 1000:
            if os.path.exists(temp_file_name): os.remove(temp_file_name)
            return JSONResponse(
                status_code=400,
                content={"error": "Audio file is empty or too small. Please record at least a few seconds."}
            )

        recording_id = str(uuid.uuid4())

        disease_mapping = {
            "parkinson's": "Parkinson’s",
            "asthma": "Asthma",
            "post-stroke": "Post-Stroke",
            "neurological": "Neurological",
            "cardiovascular": "skip",
            "depression": "skip"
        }
        
        target_disease = disease_mapping.get(disease.lower(), None)

        if target_disease == "skip":
            if os.path.exists(temp_file_name): os.remove(temp_file_name)
            return AnalysisResponse(
                recording_id=recording_id,
                pitch_variation=0.0,
                breath_score=0.0,
                pause_score=0.0,
                speech_rate=0.0,
                tremor_score=0.0,
                signature_detected=0.0,
                health_score=85,
                status="Feature Not Available",
                analyzed_at=datetime.utcnow().isoformat(),
            )
            
        if not target_disease:
            if os.path.exists(temp_file_name): os.remove(temp_file_name)
            return JSONResponse(status_code=400, content={"error": f"Unsupported disease selected: {disease}"})
            
        if MultiDiseaseInferenceEngine is None:
            if os.path.exists(temp_file_name): os.remove(temp_file_name)
            return JSONResponse(status_code=500, content={"error": "ML engine failed to load. Ensure the file path to ml/rudra123 is valid."})
            
        original_cwd = os.getcwd()
        os.chdir(ml_model_dir)
        
        try:
            print("[DEBUG] Model loaded")
            engine = MultiDiseaseInferenceEngine(target_disease)
            
            print("[DEBUG] Extracting features...")
            print("[DEBUG] Sending to model")
            report = engine.predict(os.path.join(original_cwd, temp_file_name))
            
            print("[DEBUG] Prediction made")
        finally:
            os.chdir(original_cwd)

        bios = report.get('biomarkers', {})
        sigs = report.get('signals', {})
        d_score = report.get('disease_score', 0.0)
        health_score = int((1.0 - d_score) * 100)
        health_score = max(0, min(100, health_score))
        
        sig_detected = report.get('signature_detected', False)
        # If true, it means disease specific signature was found. Let's make it a value of 1.0 or 0.0 for graphing.
        sig_val = 1.0 if sig_detected else 0.0
        
        return AnalysisResponse(
            recording_id=recording_id,
            pitch_variation=float(sigs.get('pitch_std', 0.0)),
            breath_score=float(sigs.get('shimmer', 0.0)),
            pause_score=float(sigs.get('pause_count', 0.0)),
            speech_rate=float(sigs.get('speech_rate', 0.0)),
            tremor_score=float(sigs.get('jitter', 0.0)),
            signature_detected=sig_val,
            health_score=health_score,
            status=report.get('prediction', 'Unknown'),
            analyzed_at=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        err_msg = str(e)
        if not err_msg:
            err_msg = repr(e)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": err_msg})
    finally:
        if os.path.exists(temp_file_name):
            os.remove(temp_file_name)


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Voice Biomarker Analysis API",
        "version": "1.0.0",
    }


@router.get("/biomarker-info")
async def biomarker_info():
    """Return information about tracked biomarkers and their meaning."""
    return {
        "biomarkers": [
            {
                "name": "Voice Tremor",
                "key": "tremor_score",
                "unit": "score (0-100)",
                "description": "Measures involuntary oscillations in voice amplitude. Higher scores indicate more tremor, often associated with Parkinson's or neurological conditions.",
                "healthy_range": "0-15",
                "warning_range": "15-30",
                "critical_range": "30+",
            },
            {
                "name": "Breathlessness",
                "key": "breathlessness_score",
                "unit": "score (0-100)",
                "description": "Assesses breathiness in voice through spectral analysis and harmonics-to-noise ratio. Elevated in asthma, cardiovascular, and respiratory conditions.",
                "healthy_range": "0-20",
                "warning_range": "20-40",
                "critical_range": "40+",
            },
            {
                "name": "Pitch (F0)",
                "key": "pitch_mean",
                "unit": "Hz",
                "description": "Fundamental frequency of voice. Changes can indicate vocal cord issues, hormonal changes, or neurological conditions.",
                "healthy_range": "85-300 Hz (varies by gender)",
            },
            {
                "name": "Pitch Variation",
                "key": "pitch_variation",
                "unit": "Hz (std dev)",
                "description": "Variability in pitch over time. Monotone speech may indicate depression; excessive variation may signal other conditions.",
            },
            {
                "name": "Speech Rate",
                "key": "speech_rate",
                "unit": "syllables/sec",
                "description": "Rate of speech production. Slowed speech can indicate cognitive decline, depression, or medication effects.",
                "healthy_range": "3-5 syl/s",
            },
            {
                "name": "Pause Patterns",
                "key": "pause_count",
                "unit": "count",
                "description": "Number and distribution of pauses during speech. Increased pausing may indicate breathlessness, cognitive changes, or fatigue.",
            },
            {
                "name": "Jitter",
                "key": "jitter",
                "unit": "%",
                "description": "Cycle-to-cycle variation in pitch period. Elevated jitter is associated with voice pathology and neurological conditions.",
                "healthy_range": "< 1.5%",
            },
            {
                "name": "Shimmer",
                "key": "shimmer",
                "unit": "%",
                "description": "Cycle-to-cycle variation in amplitude. High shimmer suggests incomplete vocal fold closure or neurological issues.",
                "healthy_range": "< 3%",
            },
        ]
    }
