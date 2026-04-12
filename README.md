# VocalHealth AI — Voice Biomarker Disease Tracking

An AI-powered **Voice Diary** application that enables patients to record daily 15-second voice samples and automatically analyze vocal biomarkers to track disease progression between clinical visits.

## 🏗️ Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Next.js       │      │    FastAPI       │      │   Supabase      │
│   Frontend      │─────▶│    Backend       │─────▶│   Database      │
│   (Port 3000)   │      │   (Port 8000)    │      │   + Storage     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
       │                        │
       │                  ┌─────┴─────┐
       │                  │ ML Pipeline│
       │                  ├───────────┤
       │                  │ • Librosa │
       │                  │ • Sklearn │
       │                  │ • NoiseRed│
       │                  └───────────┘
```

## ✨ Features

- **🎤 Voice Recording** — 15-second recording with real-time waveform visualization
- **🧠 AI Analysis** — 12+ vocal biomarkers extracted using open-source ML
- **📊 Dashboard** — Interactive charts tracking health trends over time
- **⚠️ Smart Alerts** — Anomaly detection with severity-based notifications
- **📋 History** — Timeline of all recordings with expandable details
- **🔒 Privacy** — All processing done locally, no third-party paid APIs

## 🏥 Tracked Biomarkers

| Biomarker | Method | Clinical Relevance |
|-----------|--------|-------------------|
| Voice Tremor | Amplitude modulation analysis | Parkinson's, neurological disorders |
| Breathlessness | Spectral centroid, HNR | Asthma, cardiovascular disease |
| Pitch (F0) | pyin fundamental frequency | Vocal cord issues, hormonal changes |
| Speech Rate | Onset-based syllable detection | Cognitive decline, depression |
| Pause Patterns | Energy-based silence detection | Breathlessness, cognitive changes |
| Jitter | Pitch perturbation | Voice pathology |
| Shimmer | Amplitude perturbation | Vocal fold closure issues |
| HNR | Autocorrelation | General voice quality |
| MFCCs | Mel-frequency cepstral coefficients | Feature fingerprinting |

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ & npm
- **Python** 3.10+
- **Supabase** account (free tier works)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Copy backend/.env.example to backend/.env and set Supabase values

# Start the server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Edit .env.local with your Supabase credentials

# Start dev server
npm run dev
```

### 3. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase_schema.sql`
3. If the API still does not see new tables, run this once in SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

4. Configure frontend keys in `frontend/.env.local`
5. Configure backend keys in `backend/.env`:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Open the App

Visit `http://localhost:3000` in your browser!

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, Recharts, Framer Motion |
| Backend | FastAPI, Python |
| AI/ML | Librosa, scikit-learn, noisereduce, SciPy |
| Database | Supabase (PostgreSQL) |
| Styling | Vanilla CSS (dark theme, glassmorphism) |

## 📁 Project Structure

```
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── requirements.txt        # Python dependencies
│   ├── routers/
│   │   └── analysis.py         # API endpoints
│   ├── services/
│   │   ├── audio_processor.py  # Preprocessing pipeline
│   │   ├── feature_extractor.py # Biomarker extraction
│   │   └── ml_model.py         # Anomaly detection & scoring
│   └── models/
│       └── schemas.py          # Pydantic data models
├── frontend/
│   ├── app/
│   │   ├── page.js             # Landing page
│   │   ├── record/page.js      # Voice recording page
│   │   ├── dashboard/page.js   # Progress tracking
│   │   ├── history/page.js     # Recording timeline
│   │   ├── globals.css         # Design system
│   │   └── components/
│   │       ├── Navbar.js
│   │       ├── VoiceRecorder.js
│   │       ├── WaveformVisualizer.js
│   │       ├── BiomarkerCard.js
│   │       ├── HealthScoreRing.js
│   │       ├── TrendChart.js
│   │       └── AlertBanner.js
│   ├── lib/supabase/
│   │   ├── client.js
│   │   └── server.js
│   └── .env.local
└── supabase_schema.sql         # Database schema
```

## 🎯 Supported Conditions

- Parkinson's Disease
- Asthma & COPD
- Depression
- Post-Stroke Recovery
- Cardiovascular Disease
- Neurological Disorders

## 📄 License

MIT License — Built for hackathon demonstration purposes.

## ⚡ Key Design Decisions

1. **100% Open Source ML** — No paid APIs (librosa + scikit-learn)
2. **Non-invasive** — Only 15 seconds of daily voice input
3. **Privacy-first** — All processing happens on your server
4. **Demo Mode** — Dashboard works with simulated data out of the box
5. **Scalable** — FastAPI + Supabase can handle production workloads
