"""
ML Model Service
Anomaly detection using Isolation Forest and health scoring.
All open-source (scikit-learn), no paid APIs.
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Optional

from models.schemas import BiomarkerResult, HealthScore, AlertInfo


class MLModel:
    """ML model for anomaly detection and health scoring."""

    def __init__(self):
        self.isolation_forest = IsolationForest(
            contamination=0.15,
            random_state=42,
            n_estimators=100,
        )
        self.scaler = StandardScaler()
        self._is_fitted = False
        self._baseline_features = None

        # Reference ranges for biomarkers (population norms)
        self.reference_ranges = {
            "tremor_score": {"healthy_max": 15.0, "warning": 30.0, "critical": 60.0},
            "breathlessness_score": {"healthy_max": 20.0, "warning": 40.0, "critical": 70.0},
            "pitch_variation_coeff": {"healthy_min": 0.05, "healthy_max": 0.25, "warning": 0.35},
            "speech_rate": {"healthy_min": 2.0, "healthy_max": 6.0, "warning_low": 1.5, "warning_high": 7.0},
            "pause_ratio": {"healthy_max": 0.3, "warning": 0.5, "critical": 0.7},
            "jitter": {"healthy_max": 1.5, "warning": 3.0, "critical": 5.0},
            "shimmer": {"healthy_max": 3.0, "warning": 6.0, "critical": 10.0},
            "hnr": {"healthy_min": 15.0, "warning": 10.0, "critical": 5.0},
        }

    def compute_biomarker_result(self, features: dict) -> BiomarkerResult:
        """Convert raw features into structured BiomarkerResult.

        Args:
            features: Raw features dict from FeatureExtractor

        Returns:
            BiomarkerResult with normalized scores
        """
        return BiomarkerResult(
            tremor_score=round(features.get("tremor_score", 0.0), 2),
            breathlessness_score=round(features.get("breathlessness_score", 0.0), 2),
            pitch_mean=round(features.get("pitch_mean", 0.0), 2),
            pitch_variation=round(features.get("pitch_std", 0.0), 2),
            speech_rate=round(features.get("speech_rate", 0.0), 2),
            pause_count=features.get("pause_count", 0),
            pause_duration_avg=round(features.get("pause_duration_avg", 0.0), 2),
            energy_mean=round(features.get("energy_mean", 0.0), 4),
            spectral_centroid_mean=round(features.get("spectral_centroid_mean", 0.0), 2),
            hnr=round(features.get("hnr", 0.0), 2),
            jitter=round(features.get("jitter", 0.0), 4),
            shimmer=round(features.get("shimmer", 0.0), 4),
        )

    def compute_health_score(self, features: dict, baseline: Optional[dict] = None) -> HealthScore:
        """Compute a composite health score from extracted features.

        The score is 0-100 where 100 = healthiest.
        Uses weighted combination of biomarker deviations from healthy ranges.

        Args:
            features: Raw features from FeatureExtractor
            baseline: Optional baseline features for comparison

        Returns:
            HealthScore with score, category, trend, and confidence
        """
        scores = []
        weights = []

        # 1. Tremor component (weight: 20%)
        tremor = features.get("tremor_score", 0.0)
        tremor_health = max(0, 100 - tremor * 1.5)
        scores.append(tremor_health)
        weights.append(0.20)

        # 2. Breathlessness component (weight: 20%)
        breathlessness = features.get("breathlessness_score", 0.0)
        breathlessness_health = max(0, 100 - breathlessness * 1.3)
        scores.append(breathlessness_health)
        weights.append(0.20)

        # 3. Pitch stability (weight: 15%)
        pitch_var = features.get("pitch_variation_coeff", 0.0)
        if 0.05 <= pitch_var <= 0.25:
            pitch_health = 100.0
        elif pitch_var < 0.05:
            pitch_health = max(0, pitch_var / 0.05 * 100)
        else:
            pitch_health = max(0, 100 - (pitch_var - 0.25) * 200)
        scores.append(pitch_health)
        weights.append(0.15)

        # 4. Speech rate (weight: 10%)
        sr = features.get("speech_rate", 0.0)
        if 2.0 <= sr <= 6.0:
            sr_health = 100.0
        elif sr < 2.0:
            sr_health = max(0, sr / 2.0 * 100)
        else:
            sr_health = max(0, 100 - (sr - 6.0) * 50)
        scores.append(sr_health)
        weights.append(0.10)

        # 5. Pause patterns (weight: 10%)
        pause_ratio = features.get("pause_ratio", 0.0)
        pause_health = max(0, 100 - pause_ratio * 150)
        scores.append(pause_health)
        weights.append(0.10)

        # 6. Jitter (weight: 10%)
        jitter = features.get("jitter", 0.0)
        jitter_health = max(0, 100 - jitter * 20)
        scores.append(jitter_health)
        weights.append(0.10)

        # 7. Shimmer (weight: 5%)
        shimmer = features.get("shimmer", 0.0)
        shimmer_health = max(0, 100 - shimmer * 10)
        scores.append(shimmer_health)
        weights.append(0.05)

        # 8. HNR (weight: 10%)
        hnr = features.get("hnr", 10.0)
        hnr_health = min(100, hnr * 5)
        scores.append(hnr_health)
        weights.append(0.10)

        # Weighted composite
        composite = sum(s * w for s, w in zip(scores, weights))
        composite = max(0, min(100, composite))

        # Determine category
        if composite >= 80:
            category = "Excellent"
        elif composite >= 65:
            category = "Good"
        elif composite >= 45:
            category = "Fair"
        elif composite >= 25:
            category = "Concerning"
        else:
            category = "Critical"

        # Determine trend
        trend = "stable"
        if baseline:
            baseline_score = self._compute_simple_score(baseline)
            diff = composite - baseline_score
            if diff > 5:
                trend = "improving"
            elif diff < -5:
                trend = "declining"

        # Confidence based on signal quality
        voiced = features.get("voiced_fraction", 0.5)
        confidence = min(1.0, max(0.3, voiced * 1.2))

        return HealthScore(
            score=round(composite, 1),
            category=category,
            trend=trend,
            confidence=round(confidence, 2),
        )

    def _compute_simple_score(self, features: dict) -> float:
        """Quick score computation for baseline comparison."""
        tremor = features.get("tremor_score", 0.0)
        breathlessness = features.get("breathlessness_score", 0.0)
        return max(0, 100 - (tremor + breathlessness) / 2)

    def detect_anomalies(self, features: dict) -> tuple[bool, float]:
        """Detect if current features are anomalous.

        Uses reference ranges for rule-based detection.

        Args:
            features: Raw features dict

        Returns:
            Tuple of (is_anomaly, anomaly_score)
        """
        anomaly_indicators = 0
        total_checks = 0

        checks = [
            ("tremor_score", features.get("tremor_score", 0), "above", 30),
            ("breathlessness_score", features.get("breathlessness_score", 0), "above", 40),
            ("jitter", features.get("jitter", 0), "above", 3.0),
            ("shimmer", features.get("shimmer", 0), "above", 6.0),
            ("hnr", features.get("hnr", 20), "below", 10.0),
            ("pause_ratio", features.get("pause_ratio", 0), "above", 0.5),
            ("speech_rate", features.get("speech_rate", 3), "below", 1.5),
        ]

        for name, value, direction, threshold in checks:
            total_checks += 1
            if direction == "above" and value > threshold:
                anomaly_indicators += 1
            elif direction == "below" and value < threshold:
                anomaly_indicators += 1

        anomaly_score = anomaly_indicators / total_checks if total_checks > 0 else 0
        is_anomaly = anomaly_score >= 0.3  # 30% of metrics are abnormal

        return is_anomaly, anomaly_score

    def generate_alerts(self, features: dict, health_score: HealthScore) -> list[AlertInfo]:
        """Generate alerts based on biomarker analysis.

        Args:
            features: Raw features
            health_score: Computed health score

        Returns:
            List of AlertInfo objects
        """
        alerts = []

        # Tremor alert
        tremor = features.get("tremor_score", 0)
        if tremor > 60:
            alerts.append(AlertInfo(
                alert_type="threshold",
                severity="critical",
                message=f"High voice tremor detected (score: {tremor:.1f}). This may indicate motor function changes.",
                biomarker="tremor",
            ))
        elif tremor > 30:
            alerts.append(AlertInfo(
                alert_type="threshold",
                severity="medium",
                message=f"Elevated voice tremor detected (score: {tremor:.1f}). Monitor closely.",
                biomarker="tremor",
            ))

        # Breathlessness alert
        breathlessness = features.get("breathlessness_score", 0)
        if breathlessness > 70:
            alerts.append(AlertInfo(
                alert_type="threshold",
                severity="critical",
                message=f"Significant breathlessness detected (score: {breathlessness:.1f}). Consider medical consultation.",
                biomarker="breathlessness",
            ))
        elif breathlessness > 40:
            alerts.append(AlertInfo(
                alert_type="threshold",
                severity="medium",
                message=f"Moderate breathlessness detected (score: {breathlessness:.1f}).",
                biomarker="breathlessness",
            ))

        # Speech rate alert
        speech_rate = features.get("speech_rate", 3.0)
        if speech_rate < 1.5:
            alerts.append(AlertInfo(
                alert_type="anomaly",
                severity="high",
                message=f"Unusually slow speech rate ({speech_rate:.1f} syl/s). May indicate cognitive or motor changes.",
                biomarker="speech_rate",
            ))

        # HNR alert
        hnr = features.get("hnr", 15.0)
        if hnr < 5:
            alerts.append(AlertInfo(
                alert_type="threshold",
                severity="high",
                message=f"Very low harmonics-to-noise ratio ({hnr:.1f} dB). Voice quality significantly degraded.",
                biomarker="hnr",
            ))

        # Overall health decline alert
        if health_score.score < 25:
            alerts.append(AlertInfo(
                alert_type="anomaly",
                severity="critical",
                message=f"Overall voice health score is critical ({health_score.score:.0f}/100). Please consult your healthcare provider.",
                biomarker="overall",
            ))
        elif health_score.trend == "declining":
            alerts.append(AlertInfo(
                alert_type="trend_decline",
                severity="medium",
                message="Voice health trend is declining compared to your baseline. Monitor for continued changes.",
                biomarker="overall",
            ))

        return alerts
