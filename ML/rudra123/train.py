import torch
import torch.nn as nn
import torch.optim as optim
import joblib
import os
from data import get_dataloaders
from model import ParkinsonHybridModel

def train_condition(condition):
    print(f"--- Training Model for {condition} ---")
    train_loader, test_loader, feat_cols, scaler = get_dataloaders(condition)
    
    input_dim = len(feat_cols)
    # Get number of biomarkers from first batch
    _, _, _, y_bio_batch = next(iter(train_loader))
    bio_dim = y_bio_batch.shape[1]
    
    # Use the new dynamic bio_dim parameter
    model = ParkinsonHybridModel(input_dim, bio_dim=bio_dim)
    
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion_cls = nn.BCELoss()
    criterion_reg = nn.MSELoss()
    criterion_bio = nn.MSELoss()
    
    for epoch in range(40):
        model.train()
        for X, y_cls, y_reg, y_bio in train_loader:
            optimizer.zero_grad()
            p_cls, p_reg, p_bio, _, _ = model(X)
            loss = criterion_cls(p_cls, y_cls) + 0.5 * criterion_reg(p_reg, y_reg) + 0.5 * criterion_bio(p_bio, y_bio)
            loss.backward()
            optimizer.step()
            
    # Save
    cond_map = {"Parkinson’s": "parkinson", "Asthma": "asthma", "Post-Stroke": "stroke", "Neurological": "neuro"}
    suffix = cond_map.get(condition)
    
    if not os.path.exists('models'): os.mkdir('models')
    torch.save(model.state_dict(), f"models/{suffix}_hybrid.pth")
    joblib.dump(scaler, f"models/{suffix}_scaler.joblib")
    joblib.dump(feat_cols, f"models/{suffix}_feats.joblib")
    print(f"Model for {condition} saved successfully.")

if __name__ == "__main__":
    # Train all for initial setup if needed, or take arg
    import sys
    if len(sys.argv) > 1:
        train_condition(sys.argv[1])
    else:
        for c in ["Parkinson’s", "Asthma", "Post-Stroke", "Neurological"]:
            train_condition(c)
