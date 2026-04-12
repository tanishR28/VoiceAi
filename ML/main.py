import os
import torch
import numpy as np
from data import prepare_data, get_dataloaders
from model import ParkinsonHybridModel
from train import train_model
from utils import run_ensemble, detect_outliers, display_dashboard, visualize_tsne
import pandas as pd

def main():
    csv_path = 'parkinsons.csv'
    
    # 1. Pipeline Start
    print("Initializing Parkinson's Detection ML Pipeline...")
    
    # Load and split raw data for ensemble and comparison
    (X_train, X_test), (y_cls_train, y_cls_test), (y_reg_train, y_reg_test), (y_dom_train, y_dom_test), feat_cols, scaler = prepare_data(csv_path)
    
    # 2. Hybrid Model Training (Includes Classification, Regression, Domain Adversarial)
    model, test_loader, feats, _ = train_model(csv_path, epochs=60)
    
    # 3. Embedding Visualization (t-SNE) - Bonus
    model.eval()
    all_features = []
    all_domains = []
    with torch.no_grad():
        for X, _, _, y_dom in test_loader:
            _, _, _, features = model(X)
            all_features.append(features.numpy())
            all_domains.append(y_dom.numpy().flatten())
    
    all_features = np.concatenate(all_features, axis=0)
    all_domains = np.concatenate(all_domains, axis=0)
    
    print("Generating t-SNE visualization for Domain Invariance...")
    visualize_tsne(all_features, all_domains, title="Post-GRL Domain Invariance")
    
    # 4. Ensemble Analysis
    print("Running Model Ensemble (RF, SVM, NN)...")
    rf_p, svc_p, nn_p, ensemble_p = run_ensemble(X_train, y_cls_train, X_test, y_cls_test, model)
    
    # Calculate Agreement Score (Std dev of probabilities)
    # Agreement is inverse of variance
    agreement_raw = 1.0 - np.std([rf_p, svc_p, nn_p], axis=0)
    
    # 5. Anomaly Detection
    outlier_labels = detect_outliers(X_test)
    
    # 6. Final Dashboard Output (for first 1 test sample as example)
    sample_idx = 0
    # True severity if available or predicted
    _, p_reg, _, _ = model(torch.tensor(X_test[sample_idx:sample_idx+1], dtype=torch.float32))
    
    display_dashboard(
        y_cls_test[sample_idx], 
        ensemble_p[sample_idx], 
        p_reg.item(), 
        agreement_raw[sample_idx]
    )
    
    print("\nPipeline Complete. Models saved. Visualization 'post-grl_domain_invariance.png' generated.")

if __name__ == "__main__":
    main()
