import streamlit as st
import os
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from audio import record_audio
from inference import MultiDiseaseInferenceEngine
from train import train_condition

# --- Setup ---
st.set_page_config(page_title="Voice Analysis Platform V6", page_icon=None, layout="wide")

st.title("Clinical Voice Bio-Marker Platform (V6)")
st.write("Supporting dual-input modes: Real-time recording and variable-length audio uploads.")

# --- Sidebar Configuration ---
st.sidebar.header("Diagnostics Configuration")
condition = st.sidebar.selectbox(
    "Select Target Condition",
    ["Parkinson’s", "Asthma", "Post-Stroke", "Neurological"]
)

# Model check
cond_map = {"Parkinson’s": "parkinson", "Asthma": "asthma", "Post-Stroke": "stroke", "Neurological": "neuro"}
suffix = cond_map.get(condition)
model_path = f"models/{suffix}_hybrid.pth"

if not os.path.exists(model_path):
    st.sidebar.warning(f"Model for {condition} not found.")
    if st.sidebar.button(f"Train {condition} Model"):
        with st.spinner(f"Training {condition} pipeline..."):
            train_condition(condition)
        st.sidebar.success("Training Complete!")
        st.rerun()

st.sidebar.divider()
input_mode = st.sidebar.radio(
    "Select Input Method",
    ["Upload Audio File", "Record from Microphone"]
)

col1, col2 = st.columns([1, 2])

with col1:
    st.subheader(f"Input: {input_mode}")
    active_sample = None
    
    if input_mode == "Upload Audio File":
        uploaded_file = st.file_uploader("Choose a voice recording...", type=["wav", "mp3", "ogg"])
        if uploaded_file is not None:
            active_sample = "temp_upload.wav"
            with open(active_sample, "wb") as f:
                f.write(uploaded_file.getbuffer())
            st.success("File uploaded successfully.")
            st.audio(active_sample)
            
    else: # Microphone
        st.write("Record your voice sample below. You can stop whenever you are ready.")
        mic_audio = st.audio_input("Microphone Input")
        
        if mic_audio is not None:
            active_sample = "temp_mic.wav"
            with open(active_sample, "wb") as f:
                f.write(mic_audio.getbuffer())
            st.success("Voice captured. Ready for analysis.")
            st.audio(active_sample)

    if st.button("🚀 Analyze Sample", disabled=(active_sample is None)):
        st.session_state['process_sample'] = active_sample

if 'process_sample' in st.session_state:
    filename = st.session_state['process_sample']
    
    with col2:
        try:
            with st.spinner("Extracting biomarkers and running inference..."):
                engine = MultiDiseaseInferenceEngine(condition)
                report = engine.predict(filename)
            
            st.subheader(f"Results for {condition}")
            st.write(f"**Source**: {input_mode} | **Duration**: {report.get('duration', 0):.2f}s")
            
            # Key Metrics
            m1, m2, m3 = st.columns(3)
            m1.metric("Disease Score", f"{report['disease_score']:.3f}", delta=report['risk_level'], delta_color="inverse")
            m2.metric("Screening Result", report['prediction'])
            m3.metric("Severity Index", f"{report['severity']:.1f}/100")
            
            # --- SIGNATURE DETECTION ---
            st.write("#### Signature Detection")
            sig_status = "DETECTED" if report.get("signature_detected") else "NOT DETECTED"
            sig_color = "red" if report.get("signature_detected") else "green"
            
            sig_msg = {
                "Parkinson’s": "Micro Tremor (4-8Hz)",
                "Asthma": "Respiratory Wheezing/Cough",
                "Post-Stroke": "Speech Slurring (Monotony)",
                "Neurological": "Cognitive Pause Delay"
            }
            
            st.markdown(f"**Target Signature**: {sig_msg.get(condition)}")
            st.markdown(f"**Status**: <span style='color:{sig_color}; font-weight:bold;'>{sig_status}</span>", unsafe_allow_html=True)
            
            if report['prediction'] == "COUGH DETECTED":
                st.warning("⚠️ Cough Detected: Asthma analysis unreliable. Please provide a clear speech sample.")
            
            st.divider()
            
            # Biomarkers Table
            st.write("### Precise Clinical Biomarkers")
            bios = report['biomarkers']
            bio_df = pd.DataFrame({
                'Indicator': [k.replace('_', ' ').capitalize() for k in bios.keys() if k != 'cough_detected'],
                'Value': [f"{float(v):.4f}" for k, v in bios.items() if k != 'cough_detected']
            })
            st.table(bio_df)
            
            # Visualization
            fig, ax = plt.subplots(figsize=(10, 4))
            names = [k.replace('_', ' ').title() for k in bios.keys() if k != 'cough_detected']
            vals = [float(v) for k, v in bios.items() if k != 'cough_detected']
            colors = ['red' if v > 0.6 else ('orange' if v > 0.3 else 'green') for v in vals]
            
            ax.barh(names, vals, color=colors)
            ax.set_xlim(0, 1)
            # Labels
            for i, v in enumerate(vals):
                ax.text(v + 0.02, i, f"{v:.3f}", va='center')
            st.pyplot(fig)
            
            st.warning(f"Final Screening Result: **{report['prediction']}** (Risk: {report['risk_level']})")

        except Exception as e:
            st.error(f"Inference Error: {e}")

st.sidebar.divider()
st.sidebar.info("V6 supports variable duration audio via global signal normalization.")
