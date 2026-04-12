from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AnalysisResponse(BaseModel):
    """Simulated response from Grok"""
    recording_id: Optional[str] = None
    pitch_variation: float = Field(..., description="Pitch variation score")
    breath_score: float = Field(..., description="Breathlessness score")
    pause_score: float = Field(..., description="Pause pattern score")
    speech_rate: float = Field(..., description="Estimated speech rate")
    tremor_score: float = Field(0.0, description="Voice tremor score (jitter based)")
    signature_detected: float = Field(0.0, description="Signature detection severity")
    health_score: int = Field(..., description="Composite health score (0-100)")
    status: str = Field(..., description="Status string (e.g. Warning, OK, Critical)")
    analyzed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AnalysisRequest(BaseModel):
    """Request metadata for analysis."""
    user_id: Optional[str] = None
    condition: Optional[str] = None
    notes: Optional[str] = None
