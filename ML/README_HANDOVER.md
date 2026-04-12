# Clinical Voice Analysis Platform - Handover Documentation

This project is a multi-disease clinical screening tool using voice biomarkers. It classifies Parkinson’s, Asthma, Post-Stroke, and Neurological conditions.

## 📂 What to Give the Collaborator
To hand over the functional logic (without the training data), you should send the following:

1.  **Core Logic**:
    *   `features.py`: The "Engine". Contains all acoustic signal processing and biomarker extraction.
    *   `inference.py`: The "Interface". A class that loads the models and produces diagnostic reports from audio files.
    *   `model.py`: The "Architecture". Definitions of the Hybrid Neural Networks used.
    *   `audio.py`: Helper for microphone interactions.
2.  **Trained AI (The Brain)**:
    *   `models/`: This folder is CRITICAL. It contains:
        *   `*.pth`: Trained neural network weights.
        *   `*.joblib`: Scaling parameters and feature column names.
3.  **The UI (The Blueprint)**:
    *   `app.py`: The Streamlit dashboard. This serves as the "Gold Standard" for how the frontend should display data and how the backend should be called.
4.  **Configuration**:
    *   `requirements.txt`: List of dependencies needed (librosa, torch, etc.).

---

## 🛠️ Infrastructure Requirements (What to Ask Him)
Since he is building the Backend/Frontend, you should ask him for the following:

1.  **Backend Integration**: "I am providing an `InferenceEngine` class in `inference.py`. Can you wrap this in a FastAPI or Flask endpoint that accepts an audio file and returns the JSON report?"
2.  **Audio Processing**: "The engine expects 16kHz Mono audio. Can you ensure the production frontend records or converts audio to this format before sending it to the server?"
3.  **UI Visualization**: "The Streamlit app shows 4-decimal biomarkers and a bar chart. Can you replicate these 'Signature Detection' alerts and metric cards in the new frontend?"
4.  **Scalability**: "The feature extraction is CPU-intensive (Librosa). How will you handle multiple simultaneous users? (e.g., Celery workers or a task queue)."

---

## 🚀 How to Run (Direct Transfer)
Tell him to run:
```bash
pip install -r requirements.txt
streamlit run app.py
```
And the app will be exactly as you see it now.

---

## 📝 Note on Data
You **do not** need to send the large `.csv` files or the `data/` folder unless he needs to **re-train** the models. If he only needs to **run** the app/service, the `models/` folder is sufficient.
