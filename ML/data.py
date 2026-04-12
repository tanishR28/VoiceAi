import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import torch
from torch.utils.data import Dataset, DataLoader

def prepare_multi_data(csv_path, condition):
    df = pd.read_csv(csv_path)
    
    # Define ignore columns
    ignore_cols = ['status', 'severity', 'domain', 'PD_score', 'risk_level', 'disease_score']
    
    # Target columns for biomarkers vary by disease in CSV
    # We'll identify them as any column that isn't MFCC/Signal or Ignore
    signal_cols = [f'mfcc_{i}' for i in range(1, 14)] + ['pitch_mean', 'pitch_std', 'jitter', 'shimmer', 'hnr', 'speech_rate', 'pause_count', 'avg_pause_len']
    
    feature_cols = [c for c in df.columns if c not in ['status', 'severity', 'PD_score', 'disease_score', 'risk_level']]
    
    # Biomarker targets for the model head
    biomarker_cols = [c for c in feature_cols if c not in signal_cols]
    
    X = df[feature_cols].values
    y_cls = df['status'].values
    y_reg = df['severity'].values
    y_bio = df[biomarker_cols].values
    
    X_train, X_test, y_cls_train, y_cls_test, y_reg_train, y_reg_test, y_bio_train, y_bio_test = train_test_split(
        X, y_cls, y_reg, y_bio, test_size=0.2, random_state=42, stratify=y_cls
    )
    
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)
    
    return (X_train, X_test), (y_cls_train, y_cls_test), (y_reg_train, y_reg_test), (y_bio_train, y_bio_test), feature_cols, scaler

class MultiDiseaseDataset(Dataset):
    def __init__(self, X, y_cls, y_reg, y_bio):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y_cls = torch.tensor(y_cls, dtype=torch.float32).unsqueeze(1)
        self.y_reg = torch.tensor(y_reg, dtype=torch.float32).unsqueeze(1)
        self.y_bio = torch.tensor(y_bio, dtype=torch.float32)
        
    def __len__(self):
        return len(self.X)
        
    def __getitem__(self, idx):
        return self.X[idx], self.y_cls[idx], self.y_reg[idx], self.y_bio[idx]

def get_dataloaders(condition, batch_size=32):
    cond_map = {
        "Parkinson’s": "data/parkinsons_updated.csv",
        "Asthma": "data/asthma.csv",
        "Post-Stroke": "data/post_stroke.csv",
        "Neurological": "data/neurological.csv"
    }
    csv_path = cond_map.get(condition)
    (X_train, X_test), (y_cls_train, y_cls_test), (y_reg_train, y_reg_test), (y_bio_train, y_bio_test), feat_cols, scaler = prepare_multi_data(csv_path, condition)
    
    train_ds = MultiDiseaseDataset(X_train, y_cls_train, y_reg_train, y_bio_train)
    test_ds = MultiDiseaseDataset(X_test, y_cls_test, y_reg_test, y_bio_test)
    
    return DataLoader(train_ds, batch_size=batch_size, shuffle=True), DataLoader(test_ds, batch_size=batch_size), feat_cols, scaler
