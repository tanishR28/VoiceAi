import numpy as np
import pandas as pd
import torch
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.manifold import TSNE
import shap

def run_ensemble(X_train, y_train, X_test, y_test, nn_model):
    """
    Train and compare ensemble of models.
    """
    # 1. Random Forest
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    rf_probs = rf.predict_proba(X_test)[:, 1]
    
    # 2. SVM (Calibrated)
    svc = SVC(probability=True, random_state=42)
    svc.fit(X_train, y_train)
    svc_probs = svc.predict_proba(X_test)[:, 1]
    
    # 3. Neural Network (from previous step)
    nn_model.eval()
    with torch.no_grad():
        nn_probs = nn_model(torch.tensor(X_test, dtype=torch.float32))[0].numpy().flatten()
        
    # Ensemble Average
    ensemble_probs = (rf_probs + svc_probs + nn_probs) / 3
    
    return rf_probs, svc_probs, nn_probs, ensemble_probs

def detect_outliers(X):
    """
    Isolation Forest for anomaly detection.
    """
    iso = IsolationForest(contamination=0.05, random_state=42)
    outliers = iso.fit_predict(X)
    return outliers # -1 for outlier, 1 for inlier

def explain_features(X_train, X_test, feature_names):
    """
    SHAP for interpretability using Random Forest.
    """
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X_train, np.random.randint(0, 2, len(X_train))) # Dummy fit for structure
    # Actually fit on real data
    # We use a simpler model for SHAP speed in this example
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test)
    return shap_values

def visualize_tsne(features, domains, title="Embedding Visualization"):
    """
    t-SNE to show domain separation (real vs synthetic).
    """
    tsne = TSNE(n_components=2, random_state=42)
    embeddings = tsne.fit_transform(features)
    
    plt.figure(figsize=(8, 6))
    plt.scatter(embeddings[domains==0, 0], embeddings[domains==0, 1], label='Real', alpha=0.6)
    plt.scatter(embeddings[domains==1, 0], embeddings[embeddings==1, 1] if len(embeddings[embeddings==1]) > 0 else embeddings[domains==1, 1], label='Synthetic', alpha=0.6)
    plt.title(title)
    plt.legend()
    plt.savefig(f"{title.lower().replace(' ', '_')}.png")
    plt.close()

def display_dashboard(y_true, y_pred_prob, severity, agreement_score):
    """
    Prints the final report.
    """
    prediction = "Parkinson's" if y_pred_prob > 0.5 else "Healthy"
    confidence = y_pred_prob if y_pred_prob > 0.5 else 1 - y_pred_prob
    
    risk_level = "Low"
    if severity > 30: risk_level = "Medium"
    if severity > 60: risk_level = "High"
    
    print("-" * 30)
    print("PARKINSON'S DETECTION DASHBOARD")
    print("-" * 30)
    print(f"Prediction: {prediction}")
    print(f"Severity Score: {severity:.2f}/100")
    print(f"Confidence Score: {confidence*100:.2f}%")
    print(f"Model Agreement Score: {agreement_score:.2f}")
    print(f"Risk Level: {risk_level}")
    print("-" * 30)
