import pandas as pd
import numpy as np

def update_dataset_v5(csv_path):
    df = pd.read_csv(csv_path)
    df = df.fillna(df.mean(numeric_only=True))
    
    # helper to normalize a column
    def norm(col):
        return (df[col] - df[col].min()) / (df[col].max() - df[col].min() + 1e-8)

    # --- BIOMARKER CREATION (V5 FIXED DEFINITIONS) ---
    # 1. Pitch Variation = std/mean
    df['pitch_variation'] = norm('pitch_std') # Surrogate
    
    # 2. Tremor = jitter + shimmer
    df['tremor'] = (norm('jitter') + norm('shimmer')).clip(upper=1.0)
    
    # 3. Breathlessness = 1-hnr (clamped 0.7)
    df['breathlessness'] = (1 - norm('hnr')).clip(upper=0.7)
    
    # 4. Pause Patterns = silence ratio
    df['pause_patterns'] = norm('avg_pause_len') # Surrogate
    
    # 5. Speech Rate = voiced duration
    df['speech_rate'] = norm('speech_rate') # Normalized
    
    # --- HYBRID PD SCORING V5 ---
    lin = 0.25 * df['tremor'] + 0.10 * df['breathlessness'] + 0.20 * df['pause_patterns'] + \
          0.25 * (1 - df['pitch_variation']) + 0.20 * (1 - df['speech_rate'])
          
    mult = df['tremor'] * df['breathlessness'] * df['pause_patterns']
    
    df['PD_score'] = 0.75 * lin + 0.25 * mult
    
    # SANITY CHECK Override
    mask = (df['pitch_variation'] > 0.6) & (df['pause_patterns'] < 0.3)
    df.loc[mask, 'PD_score'] = 0.1
    
    df['status'] = (df['PD_score'] > 0.45).astype(int)
    df['severity'] = df['PD_score'] * 100
    
    # Save
    df.to_csv('parkinsons_updated.csv', index=False)
    print("Updated V5 dataset saved as parkinsons_updated.csv")
    print(f"Total Parkinson cases (V5): {df['status'].sum()} out of {len(df)}")
    
if __name__ == "__main__":
    update_dataset_v5('parkinsons.csv')
