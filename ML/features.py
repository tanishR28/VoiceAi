import librosa
import numpy as np
import scipy.signal as signal

def detect_micro_tremor(f0, sr=16000):
    """Detects 4-8 Hz oscillation in pitch."""
    if len(f0) < 50: return False
    # Detrend pitch
    f0_detrend = f0 - np.mean(f0)
    # Compute PSD
    freqs, psd = signal.welch(f0_detrend, fs=sr/512, nperseg=len(f0_detrend))
    # Look for peak in 4-8 Hz
    mask = (freqs >= 4) & (freqs <= 8)
    if not any(mask): return False
    peak_energy = np.max(psd[mask])
    avg_energy = np.mean(psd)
    return peak_energy > 5 * avg_energy

def detect_wheeze(y, sr):
    """Detects energy concentration in 400-1600 Hz band."""
    S = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)
    mask = (freqs >= 400) & (freqs <= 1600)
    band_energy = np.mean(S[mask, :])
    total_energy = np.mean(S)
    return band_energy > 2.5 * total_energy

def detect_slurred_speech(mfccs):
    """Detects low temporal variation in MFCCs (monotony/slurring)."""
    # Compute variance of MFCC deltas
    deltas = np.diff(mfccs, axis=1)
    var = np.mean(np.var(deltas, axis=1))
    return var < 1.0 # Heuristic threshold

def detect_cognitive_delay(pause_ratio, pause_count, duration):
    """Detects irregular or excessive silence clusters."""
    if duration < 5: return False
    return pause_ratio > 0.4 or (pause_count > 10 and pause_ratio > 0.3)

def detect_cough_bursts(y, sr):
    rms = librosa.feature.rms(y=y)[0]
    flatness = librosa.feature.spectral_flatness(y=y)[0]
    zcr = librosa.feature.zero_crossing_rate(y=y)[0]
    rms_threshold = np.mean(rms) + 1.5 * np.std(rms)
    potential_frames = np.where(rms > rms_threshold)[0]
    if len(potential_frames) < 2: return False
    burst_count = 0
    in_burst = False
    for idx in potential_frames:
        is_cough_like = (flatness[idx] > 0.05) and (zcr[idx] > 0.05)
        if is_cough_like:
            if not in_burst:
                burst_count += 1
                in_burst = True
        else: in_burst = False
    return burst_count >= 2

def extract_signal_features(audio_path):
    y, sr = librosa.load(audio_path, sr=16000)
    if np.max(np.abs(y)) > 0: y = y / np.max(np.abs(y))
    y, _ = librosa.effects.trim(y, top_db=30)
    total_duration = len(y) / sr
    
    # 1. Base Signal Processing
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfccs_mean = np.mean(mfccs, axis=1)
    
    f0, voiced_flag, _ = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
    f0_only = f0[voiced_flag]
    f0_only = f0_only[~np.isnan(f0_only)]
    
    pitch_mean = np.mean(f0_only) if len(f0_only) > 0 else 0
    pitch_std = np.std(f0_only) if len(f0_only) > 0 else 0
    pitch_var = pitch_std / (pitch_mean + 1e-8) if pitch_mean > 0 else 0.5
    
    jitter = np.mean(np.abs(np.diff(f0_only))) / (pitch_mean + 1e-8) if len(f0_only) > 1 else 0
    rms_vals = librosa.feature.rms(y=y)[0]
    shimmer = np.mean(np.abs(np.diff(rms_vals))) / (np.mean(rms_vals) + 1e-8) if np.mean(rms_vals) > 0 else 0
    
    y_harm, y_perc = librosa.effects.hpss(y)
    hnr_db = 10 * np.log10(np.sum(y_harm**2) / (np.sum(y_perc**2) + 1e-8))
    
    intervals = librosa.effects.split(y, top_db=25)
    pause_ratio = (total_duration - sum([(e-s) for s,e in intervals])/sr) / (total_duration + 1e-8)
    speech_rate = np.clip((len(f0_only) * 512/sr) / (total_duration + 1e-8), 0, 1)
    
    # 2. SIGNATURE DETECTORS (V7 Update)
    signatures = {
        'micro_tremor': detect_micro_tremor(f0_only) if len(f0_only) > 0 else False,
        'wheeze': detect_wheeze(y, sr),
        'cough': detect_cough_bursts(y, sr),
        'slurring': detect_slurred_speech(mfccs),
        'cognitive_delay': detect_cognitive_delay(pause_ratio, len(intervals), total_duration)
    }
    
    raw_21 = list(mfccs_mean) + [pitch_mean, pitch_std, jitter, shimmer, hnr_db, speech_rate, len(intervals), pause_ratio]
    
    return {
        'raw': raw_21,
        'duration': total_duration,
        'signatures': signatures,
        'meta': {
            'jitter': jitter, 'shimmer': shimmer, 'hnr_db': hnr_db,
            'pitch_var': pitch_var, 'pause_ratio': pause_ratio,
            'speech_rate': speech_rate, 'total_duration': total_duration,
            'intervals': len(intervals)
        }
    }

def get_disease_biomarkers(meta, condition, signatures):
    m = meta
    s = signatures
    if condition == "Parkinson’s":
        tremor = np.clip(m['jitter'] + m['shimmer'], 0, 1)
        # Boost tremor if micro_tremor detector is positive
        if s['micro_tremor']: tremor = min(1.0, tremor + 0.2)
        return {
            'tremor': tremor, 'breathlessness': np.clip(1 - (m['hnr_db'] + 10)/40, 0, 0.7),
            'pitch_variation': m['pitch_var'], 'speech_rate': m['speech_rate'],
            'pause_patterns': m['pause_ratio'], 'SIGNATURE_DETECTED': s['micro_tremor']
        }
    elif condition == "Asthma":
        breath = np.clip(1 - (m['hnr_db'] + 10)/40, 0, 1.0)
        noise = np.clip(1 - m['hnr_db']/20, 0, 1)
        if s['wheeze']: noise = min(1.0, noise + 0.3)
        c_flag = s['cough']
        if c_flag: breath, noise = min(breath, 0.3), min(noise, 0.3)
        return {
            'breathlessness': breath, 'pause_patterns': m['pause_ratio'], 'speech_rate': m['speech_rate'],
            'wheeze_noise': noise, 'energy_decay': 0.2, 'cough_detected': c_flag, 'SIGNATURE_DETECTED': s['wheeze'] or s['cough']
        }
    elif condition == "Post-Stroke":
        return {
            'speech_slurring': m['shimmer'] if not s['slurring'] else min(1.0, m['shimmer'] + 0.3),
            'articulation_clarity': 1 - m['jitter'], 'speech_rate': m['speech_rate'],
            'pause_irregularity': m['pause_ratio'], 'pitch_stability': 1 - m['pitch_var'],
            'SIGNATURE_DETECTED': s['slurring']
        }
    elif condition == "Neurological":
        p_p = m['pause_ratio']
        if s['cognitive_delay']: p_p = min(1.0, p_p + 0.2)
        return {
            'tremor': np.clip(m['jitter'] + m['shimmer'], 0, 1), 'cognitive_pause': p_p,
            'speech_consistency': 1 - m['shimmer'], 'pitch_monotony': 1 - m['pitch_var'],
            'response_latency': np.clip(m['intervals']/10, 0, 1), 'SIGNATURE_DETECTED': s['cognitive_delay']
        }
    return {}

def compute_disease_score(bios, condition):
    # Same logic as before but with potential signature boosts already in bios dictionary
    # Parkinson
    if condition == "Parkinson’s":
        t, b, p_p, p_v, s_r = bios['tremor'], bios['breathlessness'], bios['pause_patterns'], bios['pitch_variation'], bios['speech_rate']
        if p_v > 0.6 and p_p < 0.3: return 0.1, "NO"
        score = 0.75 * (0.25*t + 0.10*b + 0.20*p_p + 0.25*(1-p_v) + 0.20*(1-s_r)) + 0.25*(t*b*p_p)
        return np.clip(score, 0, 1), ("YES" if score > 0.45 else "NO")
    # Asthma
    elif condition == "Asthma":
        if bios.get('cough_detected'): return 0.2, "COUGH DETECTED"
        b, p_p, s_r, n, e = bios['breathlessness'], bios['pause_patterns'], bios['speech_rate'], bios['wheeze_noise'], bios['energy_decay']
        score = 0.7 * (0.30*b + 0.20*p_p + 0.20*(1-s_r) + 0.15*n + 0.15*e) + 0.3*(b*p_p*n)
        return np.clip(score, 0, 1), ("YES" if score > 0.5 else "NO")
    # Post-Stroke
    elif condition == "Post-Stroke":
        s, a, r, p, ps = bios['speech_slurring'], bios['articulation_clarity'], bios['speech_rate'], bios['pause_irregularity'], bios['pitch_stability']
        score = 0.3*s + 0.2*(1-a) + 0.2*(1-r) + 0.2*p + 0.1*(ps)
        return np.clip(score, 0, 1), ("YES" if score > 0.4 else "NO")
    # Neurological
    elif condition == "Neurological":
        t, cp, c, m, l = bios['tremor'], bios['cognitive_pause'], bios['speech_consistency'], bios['pitch_monotony'], bios['response_latency']
        score = 0.25*t + 0.25*cp + 0.2*(1-c) + 0.15*(1-m) + 0.15*l
        return np.clip(score, 0, 1), ("YES" if score > 0.4 else "NO")
    return 0.0, "NO"
