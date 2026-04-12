import torch
import numpy as np
import joblib
import os
from features import extract_signal_features, get_disease_biomarkers, compute_disease_score
from model import ParkinsonHybridModel

class MultiDiseaseInferenceEngine:
    def __init__(self, condition):
        self.condition = condition
        self.cond_map = {
            "Parkinson’s": "parkinson",
            "Asthma": "asthma",
            "Post-Stroke": "stroke",
            "Neurological": "neuro"
        }
        suffix = self.cond_map.get(condition, "unknown")
        
        # Paths
        model_path = f"models/{suffix}_hybrid.pth"
        scaler_path = f"models/{suffix}_scaler.joblib"
        feats_path = f"models/{suffix}_feats.joblib"
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model for {condition} not found. Please train first.")
            
        self.feat_names = joblib.load(feats_path)
        self.scaler = joblib.load(scaler_path)
        
        # Calculate dynamic bio_dim (all features that aren't the 21 signals)
        bio_dim = len(self.feat_names) - 21
        
        self.model = ParkinsonHybridModel(len(self.feat_names), bio_dim=bio_dim)
        self.model.load_state_dict(torch.load(model_path, map_location="cpu"))
        self.model.eval()

    def predict(self, audio_path):
        data = extract_signal_features(audio_path)
        raw_vec = data['raw']
        meta = data['meta']
        sigs = data['signatures']
        
        bios = get_disease_biomarkers(meta, self.condition, sigs)
        score, pred = compute_disease_score(bios, self.condition)
        
        # 3. Construct Feature Vector
        signal_names = [f'mfcc_{i}' for i in range(1, 14)] + ['pitch_mean', 'pitch_std', 'jitter', 'shimmer', 'hnr', 'speech_rate', 'pause_count', 'avg_pause_len']
        signal_map = dict(zip(signal_names, raw_vec))
        
        full_features = []
        for name in self.feat_names:
            if name in signal_map: full_features.append(signal_map[name])
            elif name in bios: full_features.append(bios[name])
            else: full_features.append(0.0)

        X = self.scaler.transform(np.array(full_features).reshape(1, -1))
        
        with torch.no_grad():
            p_cls, p_reg, _, _, _ = self.model(torch.tensor(X, dtype=torch.float32))
            
        return {
            "prediction": pred, "disease_score": score, "risk_level": "HIGH" if score > 0.7 else ("MODERATE" if score > 0.4 else "NORMAL"),
            "severity": p_reg.item(), "biomarkers": bios, "confidence": p_cls.item(),
            "duration": data['duration'], "signature_detected": bios.get('SIGNATURE_DETECTED', False),
            "signals": signal_map
        }
