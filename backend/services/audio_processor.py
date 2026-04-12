"""
Audio Preprocessor Service
Handles noise reduction, normalization, silence trimming, and resampling.
All processing uses open-source libraries (librosa, noisereduce, scipy).
"""

import io
import numpy as np
import librosa
import soundfile as sf
import noisereduce as nr


TARGET_SR = 16000  # Standard sample rate for voice analysis


class AudioProcessor:
    """Preprocesses raw audio recordings for feature extraction."""

    def __init__(self, target_sr: int = TARGET_SR):
        self.target_sr = target_sr

    def load_audio(self, audio_bytes: bytes) -> tuple[np.ndarray, int]:
        """Load audio from bytes into numpy array.

        Args:
            audio_bytes: Raw audio file bytes (WAV, WebM, etc.)

        Returns:
            Tuple of (audio_signal, sample_rate)
        """
        buffer = io.BytesIO(audio_bytes)
        try:
            y, sr = librosa.load(buffer, sr=self.target_sr, mono=True)
        except Exception:
            # Fallback: try soundfile directly
            buffer.seek(0)
            y, sr = sf.read(buffer)
            if len(y.shape) > 1:
                y = np.mean(y, axis=1)
            if sr != self.target_sr:
                y = librosa.resample(y, orig_sr=sr, target_sr=self.target_sr)
                sr = self.target_sr
        return y, sr

    def reduce_noise(self, y: np.ndarray, sr: int) -> np.ndarray:
        """Apply noise reduction using spectral gating.

        Args:
            y: Audio signal
            sr: Sample rate

        Returns:
            Noise-reduced audio signal
        """
        try:
            y_clean = nr.reduce_noise(
                y=y,
                sr=sr,
                prop_decrease=0.75,
                n_fft=2048,
                hop_length=512,
            )
            return y_clean
        except Exception:
            return y

    def normalize(self, y: np.ndarray) -> np.ndarray:
        """Normalize audio amplitude to [-1, 1] range.

        Args:
            y: Audio signal

        Returns:
            Normalized audio signal
        """
        max_val = np.max(np.abs(y))
        if max_val > 0:
            y = y / max_val
        return y

    def trim_silence(self, y: np.ndarray, top_db: int = 25) -> np.ndarray:
        """Trim leading and trailing silence.

        Args:
            y: Audio signal
            top_db: Threshold in dB below peak to consider as silence

        Returns:
            Trimmed audio signal
        """
        y_trimmed, _ = librosa.effects.trim(y, top_db=top_db)
        return y_trimmed

    def process(self, audio_bytes: bytes) -> tuple[np.ndarray, int]:
        """Full preprocessing pipeline.

        Args:
            audio_bytes: Raw audio file bytes

        Returns:
            Tuple of (preprocessed_signal, sample_rate)
        """
        # Load
        y, sr = self.load_audio(audio_bytes)

        # Noise reduction
        y = self.reduce_noise(y, sr)

        # Trim silence
        y = self.trim_silence(y)

        # Normalize
        y = self.normalize(y)

        return y, sr
