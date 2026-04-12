"""
Analysis Router
API endpoints for voice biomarker analysis.
"""

import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, Any, Dict, Tuple

from supabase import create_client, Client

from models.schemas import AnalysisResponse

router = APIRouter(prefix="/api", tags=["analysis"])

import os
import sys
import shutil
import traceback
import subprocess
import time
import re
from fastapi.responses import JSONResponse


_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_ml_candidates = [
    os.path.join(_repo_root, "ML", "rudra123"),  # legacy layout
    os.path.join(_repo_root, "ML"),               # current layout
]
ml_model_dir = next(
    (p for p in _ml_candidates if os.path.exists(os.path.join(p, "inference.py"))),
    _ml_candidates[0],
)

if ml_model_dir not in sys.path:
    sys.path.insert(0, ml_model_dir)

try:
    from inference import MultiDiseaseInferenceEngine  # type: ignore
except ImportError as import_error:
    print(f"[ERROR] Failed to import ML engine from {ml_model_dir}: {import_error}")
    MultiDiseaseInferenceEngine = None


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except Exception as supabase_init_error:
        print(f"[ERROR] Failed to initialize Supabase client: {supabase_init_error}")


DOCUMENT_CONDITION_KEYWORDS = {
    "Asthma": ["asthma", "wheezing", "bronchodilator", "shortness of breath", "inhaler"],
    "Cardiovascular": ["cardiovascular", "hypertension", "blood pressure", "cholesterol", "heart failure", "arrhythmia"],
    "Neurological": ["neurological", "seizure", "epilepsy", "migraine", "cognitive", "neuropathy"],
    "Post-Stroke": ["stroke", "cva", "post stroke", "post-stroke", "hemiparesis", "aphasia"],
    "Parkinson's": ["parkinson", "bradykinesia", "tremor", "rigidity", "dopamin", "micrographia"],
    "Depression": ["depression", "depressed", "low mood", "anhedonia", "antidepressant", "sadness"],
}


def _extract_text_from_document(file_path: str, filename: str, content_type: Optional[str]) -> Tuple[str, str]:
    lower_name = filename.lower()
    is_pdf = lower_name.endswith(".pdf") or content_type == "application/pdf"

    if is_pdf:
        try:
            from pypdf import PdfReader  # type: ignore

            reader = PdfReader(file_path)
            pages = []
            for page in reader.pages:
                extracted = page.extract_text() or ""
                if extracted.strip():
                    pages.append(extracted)
            return "\n".join(pages).strip(), "pdf"
        except Exception as pdf_error:
            raise RuntimeError(f"Failed to read PDF text: {pdf_error}") from pdf_error

    try:
        import easyocr  # type: ignore

        reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        lines = reader.readtext(file_path, detail=0, paragraph=True)
        text = "\n".join(line.strip() for line in lines if str(line).strip()).strip()
        return text, "image"
    except Exception as ocr_error:
        raise RuntimeError(f"Failed to read image text: {ocr_error}") from ocr_error


def _detect_conditions_from_text(text: str) -> list[dict[str, Any]]:
    lowered = text.lower()
    detections: list[dict[str, Any]] = []

    for condition, keywords in DOCUMENT_CONDITION_KEYWORDS.items():
        matched_keywords = [keyword for keyword in keywords if keyword in lowered]
        if matched_keywords:
            detections.append(
                {
                    "condition": condition,
                    "matched_keywords": matched_keywords,
                    "confidence": min(0.95, 0.35 + 0.15 * len(matched_keywords)),
                }
            )

    detections.sort(key=lambda item: item["confidence"], reverse=True)
    return detections


def _summarize_medical_text(text: str, detections: list[dict[str, Any]]) -> str:
    if not text.strip():
        return "No readable text was found in the uploaded page."

    first_lines = [line.strip() for line in text.splitlines() if line.strip()][:3]
    summary_parts = []
    if detections:
        top_conditions = ", ".join(item["condition"] for item in detections[:3])
        summary_parts.append(f"Possible conditions mentioned: {top_conditions}.")
    else:
        summary_parts.append("No clear condition keyword was detected automatically.")

    if first_lines:
        summary_parts.append(f"Text sample: {first_lines[0][:180]}")

    return " ".join(summary_parts)


def _health_category_from_score(score: float) -> str:
    if score >= 80:
        return "Stable"
    if score >= 60:
        return "Normal"
    if score >= 40:
        return "Moderate"
    return "Warning"


def _parse_document_report_rows(text: str) -> Dict[str, Any]:
    source_text = str(text or "")
    patient_name_match = re.search(r"name\s*:\s*([^\n]+)", source_text, flags=re.IGNORECASE)
    disease_match = re.search(r"disease\s*:\s*([^\n]+)", source_text, flags=re.IGNORECASE)
    final_match = re.search(
        r"final\s+health\s+score\s*:\s*([0-9]+(?:\.[0-9]+)?)(?:\s*\(([^)]+)\))?",
        source_text,
        flags=re.IGNORECASE,
    )

    normalized = re.sub(r"\s+", " ", source_text).strip()
    row_regex = re.compile(
        r"day\s*(\d+)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)",
        flags=re.IGNORECASE,
    )

    rows = []
    for match in row_regex.finditer(normalized):
        rows.append(
            {
                "day": int(match.group(1)),
                "breath_score": float(match.group(2)),
                "pause_score": float(match.group(3)),
                "speech_rate": float(match.group(4)),
                "health_score": float(match.group(5)),
            }
        )

    rows.sort(key=lambda item: item["day"])

    return {
        "patient_name": patient_name_match.group(1).strip() if patient_name_match else None,
        "disease": disease_match.group(1).strip() if disease_match else None,
        "final_health_score": float(final_match.group(1)) if final_match else None,
        "final_health_status": final_match.group(2).strip() if final_match and final_match.group(2) else None,
        "rows": rows,
    }


def _persist_document_rows_to_supabase(
    report: Dict[str, Any],
    detections: list[dict[str, Any]],
    source_type: str,
    filename: str,
    user_id: Optional[str] = None,
) -> Tuple[bool, int, Optional[str]]:
    if supabase is None:
        return False, 0, "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"

    rows = report.get("rows", []) or []
    if not rows:
        return True, 0, None

    condition = report.get("disease") or (detections[0].get("condition") if detections else "Imported Record")
    patient_name = report.get("patient_name") or "Unknown"

    recordings_payload = []
    biomarkers_payload = []
    total_rows = len(rows)

    for index, row in enumerate(rows):
        recording_id = str(uuid.uuid4())
        # Keep chronology so dashboard/history charts reflect the uploaded timeline.
        recorded_at = (datetime.utcnow() - timedelta(days=(total_rows - index - 1))).isoformat()
        health_score = float(row.get("health_score") or 0.0)
        category = _health_category_from_score(health_score)

        recordings_payload.append(
            {
                "id": recording_id,
                "user_id": user_id,
                "duration": 0.0,
                "status": "analyzed",
                "notes": f"Imported {condition} Day {row.get('day')} ({patient_name})",
                "recorded_at": recorded_at,
            }
        )

        biomarkers_payload.append(
            {
                "recording_id": recording_id,
                "user_id": user_id,
                "tremor_score": 0.0,
                "breathlessness_score": float(row.get("breath_score") or 0.0),
                "pitch_mean": 0.0,
                "pitch_variation": 0.0,
                "speech_rate": float(row.get("speech_rate") or 0.0),
                "pause_count": int(round(float(row.get("pause_score") or 0.0) * 10)),
                "pause_duration_avg": float(row.get("pause_score") or 0.0),
                "hnr": 0.0,
                "jitter": 0.0,
                "shimmer": 0.0,
                "health_score": health_score,
                "health_category": category,
                "confidence": float(detections[0].get("confidence") if detections else 0.6),
                "is_anomaly": bool(health_score < 45),
                "raw_features": {
                    "source": "imported-medical-record",
                    "source_type": source_type,
                    "filename": filename,
                    "day": row.get("day"),
                },
                "analyzed_at": recorded_at,
            }
        )

    try:
        supabase.table("recordings").insert(recordings_payload).execute()
        supabase.table("biomarkers").insert(biomarkers_payload).execute()
        return True, len(rows), None
    except Exception as db_error:
        return False, 0, str(db_error)


def _json_safe(value: Any) -> Any:
    try:
        import numpy as np  # type: ignore
    except Exception:
        np = None  # type: ignore

    if value is None:
        return None
    if np is not None and isinstance(value, np.ndarray):
        return [_json_safe(item) for item in value.tolist()]
    if np is not None and isinstance(value, np.generic):
        return value.item()
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    return value


def _persist_analysis_to_supabase(
    recording_id: str,
    user_id: Optional[str],
    disease: str,
    duration: float,
    analyzed_at_iso: str,
    report: Dict[str, Any],
    signals: Dict[str, Any],
    health_score: int,
) -> Tuple[bool, Optional[str]]:
    if supabase is None:
        return False, "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"

    try:
        recording_payload = {
            "id": recording_id,
            "user_id": user_id,
            "duration": duration,
            "status": "analyzed",
            "notes": f"Auto analysis for {disease}",
            "recorded_at": analyzed_at_iso,
        }
        supabase.table("recordings").insert(recording_payload).execute()

        biomarkers = report.get("biomarkers", {}) or {}
        biomarker_payload = {
            "recording_id": recording_id,
            "user_id": user_id,
            "tremor_score": float(signals.get("jitter", 0.0)),
            "breathlessness_score": float(signals.get("shimmer", 0.0)),
            "pitch_mean": float(signals.get("pitch_mean", 0.0)),
            "pitch_variation": float(signals.get("pitch_std", 0.0)),
            "speech_rate": float(signals.get("speech_rate", 0.0)),
            "pause_count": int(signals.get("pause_count", 0) or 0),
            "pause_duration_avg": float(signals.get("avg_pause_len", 0.0)),
            "hnr": float(signals.get("hnr", 0.0)),
            "jitter": float(signals.get("jitter", 0.0)),
            "shimmer": float(signals.get("shimmer", 0.0)),
            "health_score": float(health_score),
            "health_category": report.get("risk_level", "Unknown"),
            "confidence": float(report.get("confidence", 0.0)),
            "is_anomaly": bool(float(report.get("disease_score", 0.0)) > 0.7),
            "raw_features": {
                "signals": _json_safe(signals),
                "biomarkers": _json_safe(biomarkers),
                "disease_score": float(report.get("disease_score", 0.0)),
                "prediction": report.get("prediction", "Unknown"),
            },
            "analyzed_at": analyzed_at_iso,
        }
        supabase.table("biomarkers").insert(biomarker_payload).execute()
        return True, None
    except Exception as db_error:
        error_text = str(db_error)
        if "PGRST205" in error_text and "recordings" in error_text:
            error_text = (
                "Supabase table cache does not include public.recordings. "
                "Run supabase_schema.sql in the Supabase SQL editor, then refresh the schema cache with: "
                "NOTIFY pgrst, 'reload schema';"
            )
        return False, error_text


@router.get("/history")
async def get_history(limit: int = 20, user_id: Optional[str] = None, source: str = "all"):
    """Return recent analyzed recordings with linked biomarker rows."""
    if supabase is None:
        return JSONResponse(
            status_code=500,
            content={"error": "Supabase is not configured in backend. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"},
        )

    try:
        recording_query = (
            supabase.table("recordings")
            .select("id,user_id,duration,recorded_at,status,notes,created_at")
            .order("recorded_at", desc=True)
            .limit(max(1, min(limit, 100)))
        )
        if user_id:
            recording_query = recording_query.eq("user_id", user_id)

        recording_response = recording_query.execute()
        recordings = recording_response.data or []
        if not recordings:
            return {"items": []}

        recording_ids = [recording.get("id") for recording in recordings if recording.get("id")]
        biomarker_map: Dict[str, Dict[str, Any]] = {}

        if recording_ids:
            biomarker_response = (
                supabase.table("biomarkers")
                .select(
                    "id,recording_id,user_id,tremor_score,breathlessness_score,pitch_mean,pitch_variation,speech_rate,pause_count,pause_duration_avg,energy_mean,spectral_centroid_mean,hnr,jitter,shimmer,health_score,health_category,health_trend,confidence,is_anomaly,raw_features,analyzed_at"
                )
                .in_("recording_id", recording_ids)
                .execute()
            )
            for biomarker in biomarker_response.data or []:
                recording_key = biomarker.get("recording_id")
                if recording_key:
                    biomarker_map[recording_key] = biomarker

        items = []
        for recording in recordings:
            biomarker = biomarker_map.get(recording.get("id"), {})
            score = float(biomarker.get("health_score") or 0)
            category = biomarker.get("health_category") or recording.get("status") or "Unknown"
            raw_features = biomarker.get("raw_features") or {}
            item_source = raw_features.get("source") or "audio-analysis"

            if source == "audio" and item_source != "audio-analysis":
                continue
            if source == "imported" and item_source == "audio-analysis":
                continue

            items.append(
                {
                    "id": recording.get("id"),
                    "title": recording.get("notes") or category or "Voice Assessment",
                    "timestamp": biomarker.get("analyzed_at") or recording.get("recorded_at") or recording.get("created_at"),
                    "health_score": {
                        "score": score,
                        "category": category,
                    },
                    "recording": recording,
                    "biomarkers": biomarker,
                    "source": item_source,
                }
            )

        return {"items": items}
    except Exception as error:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(error) or repr(error)})


@router.post("/extract-medical-records")
async def extract_medical_records(file: UploadFile = File(...)):
    """Extract text from uploaded medical pages/images and infer likely conditions."""
    temp_file_name = f"temp_{uuid.uuid4()}_{file.filename}"
    try:
        with open(temp_file_name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        extracted_text, source_type = _extract_text_from_document(temp_file_name, file.filename, file.content_type)
        detections = _detect_conditions_from_text(extracted_text)
        report = _parse_document_report_rows(extracted_text)
        saved, imported_rows, save_error = _persist_document_rows_to_supabase(
            report=report,
            detections=detections,
            source_type=source_type,
            filename=file.filename,
        )

        if not saved:
            return JSONResponse(
                status_code=500,
                content={"error": f"Text extracted but failed to save imported rows: {save_error}"},
            )

        return {
            "source_type": source_type,
            "filename": file.filename,
            "detected_conditions": detections,
            "summary": _summarize_medical_text(extracted_text, detections),
            "extracted_text": extracted_text[:12000],
            "character_count": len(extracted_text),
            "report": report,
            "imported_rows": imported_rows,
        }
    except Exception as error:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Could not extract medical record text: {str(error) or repr(error)}"},
        )
    finally:
        if os.path.exists(temp_file_name):
            os.remove(temp_file_name)


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_voice(
    file: UploadFile = File(...),
    disease: str = Form("unknown"),
    user_id: Optional[str] = Form(None),
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

        if supabase is None:
            if os.path.exists(temp_file_name): os.remove(temp_file_name)
            return JSONResponse(
                status_code=500,
                content={"error": "Supabase is not configured in backend. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"},
            )
            
        if MultiDiseaseInferenceEngine is None:
            if os.path.exists(temp_file_name): os.remove(temp_file_name)
            return JSONResponse(
                status_code=500,
                content={"error": f"ML engine failed to load. Checked path: {ml_model_dir}"},
            )
            
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

        # Product rule: when Asthma analysis detects cough, force a conservative default score.
        cough_detected = bool(bios.get('cough_detected')) or ('COUGH' in str(report.get('prediction', '')).upper())
        if target_disease == 'Asthma' and cough_detected:
            health_score = 43
        
        sig_detected = report.get('signature_detected', False)
        # If true, it means disease specific signature was found. Let's make it a value of 1.0 or 0.0 for graphing.
        sig_val = 1.0 if sig_detected else 0.0
        analyzed_at = datetime.utcnow().isoformat()

        db_saved, db_error = _persist_analysis_to_supabase(
            recording_id=recording_id,
            user_id=user_id,
            disease=target_disease,
            duration=float(report.get("duration", 0.0)),
            analyzed_at_iso=analyzed_at,
            report=report,
            signals=sigs,
            health_score=health_score,
        )
        if not db_saved:
            return JSONResponse(status_code=500, content={"error": f"Analysis completed but failed to save in database: {db_error}"})
        
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
            analyzed_at=analyzed_at,
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
