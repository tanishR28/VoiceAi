"""
Vocal Biomarker Feature Extractor
Extracts clinically-relevant voice features using librosa (open-source).
Features: tremor, breathlessness, pitch, speech rate, pause patterns, MFCC, jitter, shimmer.
"""

import numpy as np
import librosa
from scipy import signal as scipy_signal


class FeatureExtractor:
    """Extracts vocal biomarkers from preprocessed audio signals."""

    def __init__(self, sr: int = 16000):
        self.sr = sr

    def extract_all(self, y: np.ndarray, sr: int) -> dict:
        """Extract all vocal biomarkers from audio signal.

        Args:
            y: Preprocessed audio signal
            sr: Sample rate

        Returns:
            Dictionary containing all extracted features
        """
        self.sr = sr
        features = {}

        # Core features
        features.update(self._extract_pitch_features(y))
        features.update(self._extract_tremor_features(y))
        features.update(self._extract_breathlessness_features(y))
        features.update(self._extract_speech_rate(y))
        features.update(self._extract_pause_patterns(y))
        features.update(self._extract_mfcc(y))
        features.update(self._extract_jitter_shimmer(y))
        features.update(self._extract_energy_features(y))

        return features

    def _extract_pitch_features(self, y: np.ndarray) -> dict:
        """Extract fundamental frequency (F0) features using pyin.

        Returns pitch mean, std, range, and variation coefficient.
        """
        try:
            f0, voiced_flag, voiced_probs = librosa.pyin(
                y, fmin=50, fmax=500, sr=self.sr
            )
            f0_valid = f0[~np.isnan(f0)]

            if len(f0_valid) == 0:
                return {
                    "pitch_mean": 0.0,
                    "pitch_std": 0.0,
                    "pitch_range": 0.0,
                    "pitch_variation_coeff": 0.0,
                    "voiced_fraction": 0.0,
                }

            return {
                "pitch_mean": float(np.mean(f0_valid)),
                "pitch_std": float(np.std(f0_valid)),
                "pitch_range": float(np.max(f0_valid) - np.min(f0_valid)),
                "pitch_variation_coeff": float(np.std(f0_valid) / np.mean(f0_valid)) if np.mean(f0_valid) > 0 else 0.0,
                "voiced_fraction": float(np.sum(voiced_flag) / len(voiced_flag)),
            }
        except Exception:
            return {
                "pitch_mean": 0.0,
                "pitch_std": 0.0,
                "pitch_range": 0.0,
                "pitch_variation_coeff": 0.0,
                "voiced_fraction": 0.0,
            }

    def _extract_tremor_features(self, y: np.ndarray) -> dict:
        """Detect voice tremor via amplitude envelope modulation analysis.

        Tremor typically manifests as 4-8 Hz modulation in the amplitude envelope.
        """
        try:
            # Get amplitude envelope
            analytic_signal = scipy_signal.hilbert(y)
            amplitude_envelope = np.abs(analytic_signal)

            # Low-pass filter the envelope to focus on tremor frequencies (4-8 Hz)
            nyquist = self.sr / 2
            b, a = scipy_signal.butter(4, [3.0 / nyquist, 12.0 / nyquist], btype='band')
            tremor_signal = scipy_signal.filtfilt(b, a, amplitude_envelope)

            # Tremor intensity = RMS of the tremor-band signal relative to overall envelope
            tremor_rms = np.sqrt(np.mean(tremor_signal ** 2))
            envelope_rms = np.sqrt(np.mean(amplitude_envelope ** 2))

            tremor_ratio = float(tremor_rms / envelope_rms) if envelope_rms > 0 else 0.0

            # Convert to 0-100 score (higher = more tremor = worse)
            tremor_score = min(100.0, tremor_ratio * 500)

            # Find dominant tremor frequency
            freqs = np.fft.rfftfreq(len(tremor_signal), 1.0 / self.sr)
            fft_vals = np.abs(np.fft.rfft(tremor_signal))
            tremor_band = (freqs >= 3) & (freqs <= 12)
            if np.any(tremor_band):
                dominant_freq = freqs[tremor_band][np.argmax(fft_vals[tremor_band])]
            else:
                dominant_freq = 0.0

            return {
                "tremor_score": float(tremor_score),
                "tremor_ratio": float(tremor_ratio),
                "tremor_dominant_freq": float(dominant_freq),
            }
        except Exception:
            return {
                "tremor_score": 0.0,
                "tremor_ratio": 0.0,
                "tremor_dominant_freq": 0.0,
            }

    def _extract_breathlessness_features(self, y: np.ndarray) -> dict:
        """Assess breathlessness through spectral and energy features.

        Breathlessness increases spectral noise, reduces HNR, and increases energy variance.
        """
        try:
            # Spectral centroid - breathy voice has higher spectral centroid
            spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=self.sr)[0]
            sc_mean = float(np.mean(spectral_centroid))

            # Spectral rolloff
            rolloff = librosa.feature.spectral_rolloff(y=y, sr=self.sr, roll_percent=0.85)[0]
            rolloff_mean = float(np.mean(rolloff))

            # HNR approximation using autocorrelation
            hnr = self._compute_hnr(y)

            # Energy variance (breathless speech has irregular energy)
            rms = librosa.feature.rms(y=y)[0]
            energy_var = float(np.var(rms))

            # Breathlessness score: high spectral centroid + low HNR + high energy variance = breathless
            # Normalize each component to 0-1 range and combine
            sc_norm = min(1.0, sc_mean / 4000.0)
            hnr_norm = max(0.0, 1.0 - (hnr / 30.0))  # Lower HNR = more breathless
            ev_norm = min(1.0, energy_var * 100)

            breathlessness_score = min(100.0, (sc_norm * 30 + hnr_norm * 50 + ev_norm * 20))

            return {
                "breathlessness_score": float(breathlessness_score),
                "spectral_centroid_mean": sc_mean,
                "spectral_rolloff_mean": rolloff_mean,
                "hnr": float(hnr),
                "energy_variance": energy_var,
            }
        except Exception:
            return {
                "breathlessness_score": 0.0,
                "spectral_centroid_mean": 0.0,
                "spectral_rolloff_mean": 0.0,
                "hnr": 0.0,
                "energy_variance": 0.0,
            }

    def _compute_hnr(self, y: np.ndarray) -> float:
        """Compute Harmonics-to-Noise Ratio using autocorrelation method."""
        try:
            autocorr = np.correlate(y, y, mode='full')
            autocorr = autocorr[len(autocorr) // 2:]
            autocorr = autocorr / autocorr[0]

            # Find first peak after zero crossing (fundamental period)
            min_lag = int(self.sr / 500)  # Max F0 = 500 Hz
            max_lag = int(self.sr / 50)   # Min F0 = 50 Hz

            if max_lag > len(autocorr):
                max_lag = len(autocorr) - 1

            segment = autocorr[min_lag:max_lag]
            if len(segment) == 0:
                return 10.0

            peak_idx = np.argmax(segment)
            r = segment[peak_idx]

            if r >= 1.0:
                r = 0.999
            if r <= 0:
                return 0.0

            hnr = 10 * np.log10(r / (1 - r))
            return max(0.0, min(40.0, hnr))
        except Exception:
            return 10.0

    def _extract_speech_rate(self, y: np.ndarray) -> dict:
        """Estimate speech rate using energy-based onset detection.

        Approximates syllable rate from detected onsets.
        """
        try:
            # Onset detection for syllable estimation
            onset_env = librosa.onset.onset_strength(y=y, sr=self.sr)
            onsets = librosa.onset.onset_detect(
                onset_envelope=onset_env, sr=self.sr, backtrack=False
            )

            duration = len(y) / self.sr
            num_syllables = len(onsets)

            speech_rate = float(num_syllables / duration) if duration > 0 else 0.0

            return {
                "speech_rate": speech_rate,
                "syllable_count": num_syllables,
                "duration_seconds": float(duration),
            }
        except Exception:
            return {
                "speech_rate": 0.0,
                "syllable_count": 0,
                "duration_seconds": float(len(y) / self.sr),
            }

    def _extract_pause_patterns(self, y: np.ndarray) -> dict:
        """Detect and analyze pause patterns in speech.

        Identifies silent intervals and computes statistics.
        """
        try:
            # Compute RMS energy in short frames
            frame_length = int(0.025 * self.sr)  # 25ms frames
            hop_length = int(0.010 * self.sr)     # 10ms hop

            rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]

            # Dynamic threshold for silence detection
            threshold = np.mean(rms) * 0.3

            # Find silent frames
            is_silent = rms < threshold

            # Count pauses (contiguous silent regions)
            pauses = []
            in_pause = False
            pause_start = 0

            for i, silent in enumerate(is_silent):
                if silent and not in_pause:
                    in_pause = True
                    pause_start = i
                elif not silent and in_pause:
                    in_pause = False
                    pause_duration_ms = (i - pause_start) * (hop_length / self.sr) * 1000
                    if pause_duration_ms > 50:  # Only count pauses > 50ms
                        pauses.append(pause_duration_ms)

            # Close any trailing pause
            if in_pause:
                pause_duration_ms = (len(is_silent) - pause_start) * (hop_length / self.sr) * 1000
                if pause_duration_ms > 50:
                    pauses.append(pause_duration_ms)

            pause_count = len(pauses)
            pause_duration_avg = float(np.mean(pauses)) if pauses else 0.0
            pause_duration_max = float(np.max(pauses)) if pauses else 0.0
            pause_ratio = sum(pauses) / (len(y) / self.sr * 1000) if len(y) > 0 else 0.0

            return {
                "pause_count": pause_count,
                "pause_duration_avg": pause_duration_avg,
                "pause_duration_max": pause_duration_max,
                "pause_ratio": float(pause_ratio),
            }
        except Exception:
            return {
                "pause_count": 0,
                "pause_duration_avg": 0.0,
                "pause_duration_max": 0.0,
                "pause_ratio": 0.0,
            }

    def _extract_mfcc(self, y: np.ndarray) -> dict:
        """Extract Mel-Frequency Cepstral Coefficients.

        13 MFCCs with mean and std for each coefficient.
        """
        try:
            mfccs = librosa.feature.mfcc(y=y, sr=self.sr, n_mfcc=13)
            mfcc_mean = np.mean(mfccs, axis=1).tolist()
            mfcc_std = np.std(mfccs, axis=1).tolist()

            return {
                "mfcc_mean": mfcc_mean,
                "mfcc_std": mfcc_std,
            }
        except Exception:
            return {
                "mfcc_mean": [0.0] * 13,
                "mfcc_std": [0.0] * 13,
            }

    def _extract_jitter_shimmer(self, y: np.ndarray) -> dict:
        """Compute jitter (pitch perturbation) and shimmer (amplitude perturbation).

        These are classic voice pathology markers.
        """
        try:
            # Extract pitch periods using pyin
            f0, voiced_flag, _ = librosa.pyin(y, fmin=50, fmax=500, sr=self.sr)
            f0_valid = f0[~np.isnan(f0)]

            if len(f0_valid) < 3:
                return {"jitter": 0.0, "shimmer": 0.0}

            # Jitter: mean absolute difference between consecutive periods
            periods = 1.0 / f0_valid
            period_diffs = np.abs(np.diff(periods))
            jitter = float(np.mean(period_diffs) / np.mean(periods) * 100)

            # Shimmer: compute from amplitude peaks at pitch periods
            # Approximate using RMS energy per frame
            hop = int(self.sr * np.mean(periods))
            if hop < 1:
                hop = 512
            rms = librosa.feature.rms(y=y, frame_length=hop * 2, hop_length=hop)[0]

            if len(rms) < 3:
                return {"jitter": jitter, "shimmer": 0.0}

            amp_diffs = np.abs(np.diff(rms))
            shimmer = float(np.mean(amp_diffs) / np.mean(rms) * 100) if np.mean(rms) > 0 else 0.0

            return {
                "jitter": min(jitter, 20.0),
                "shimmer": min(shimmer, 20.0),
            }
        except Exception:
            return {"jitter": 0.0, "shimmer": 0.0}

    def _extract_energy_features(self, y: np.ndarray) -> dict:
        """Extract energy-related features."""
        try:
            rms = librosa.feature.rms(y=y)[0]
            return {
                "energy_mean": float(np.mean(rms)),
                "energy_std": float(np.std(rms)),
                "energy_max": float(np.max(rms)),
            }
        except Exception:
            return {
                "energy_mean": 0.0,
                "energy_std": 0.0,
                "energy_max": 0.0,
            }
