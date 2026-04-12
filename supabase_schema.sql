-- =============================================
-- Voice Biomarker Disease Tracking
-- Supabase Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles Table ──
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    full_name TEXT,
    condition TEXT, -- Primary health condition being tracked
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Recordings Table ──
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    audio_url TEXT, -- Supabase Storage URL
    duration FLOAT, -- Recording duration in seconds
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'error')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Biomarkers Table ──
CREATE TABLE IF NOT EXISTS biomarkers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Vocal Biomarker Scores
    tremor_score FLOAT DEFAULT 0,
    breathlessness_score FLOAT DEFAULT 0,
    pitch_mean FLOAT DEFAULT 0,
    pitch_variation FLOAT DEFAULT 0,
    speech_rate FLOAT DEFAULT 0,
    pause_count INT DEFAULT 0,
    pause_duration_avg FLOAT DEFAULT 0,
    energy_mean FLOAT DEFAULT 0,
    spectral_centroid_mean FLOAT DEFAULT 0,
    hnr FLOAT DEFAULT 0,
    jitter FLOAT DEFAULT 0,
    shimmer FLOAT DEFAULT 0,
    
    -- Health Score
    health_score FLOAT DEFAULT 0,
    health_category TEXT,
    health_trend TEXT DEFAULT 'stable',
    confidence FLOAT DEFAULT 0,
    is_anomaly BOOLEAN DEFAULT FALSE,
    
    -- Raw feature storage
    raw_features JSONB,
    
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Alerts Table ──
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('anomaly', 'trend_decline', 'threshold')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    biomarker TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_recorded_at ON recordings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_biomarkers_user_id ON biomarkers(user_id);
CREATE INDEX IF NOT EXISTS idx_biomarkers_analyzed_at ON biomarkers(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);

-- ── Row Level Security (RLS) ──
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomarkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can view own recordings"
    ON recordings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings"
    ON recordings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own biomarkers"
    ON biomarkers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts"
    ON alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
    ON alerts FOR UPDATE
    USING (auth.uid() = user_id);

-- ── Storage Bucket ──
-- Run this in Supabase Dashboard > Storage
-- Create a bucket named 'voice-recordings' with public access disabled

-- ── Refresh PostgREST Schema Cache ──
-- Run after creating or updating tables so Supabase API sees the latest schema immediately.
NOTIFY pgrst, 'reload schema';
