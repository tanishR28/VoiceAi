import pandas as pd
import numpy as np
import os

def create_synthetic_data(condition, name):
    print(f"Synthesizing {condition} data...")
    # Base on 6000 samples
    n = 6000
    data = {
        'mfcc_1': np.random.normal(0, 1, n),
        'mfcc_2': np.random.normal(0, 1, n),
        'mfcc_3': np.random.normal(0, 1, n),
        'mfcc_4': np.random.normal(0, 1, n),
        'mfcc_5': np.random.normal(0, 1, n),
        'mfcc_6': np.random.normal(0, 1, n),
        'mfcc_7': np.random.normal(0, 1, n),
        'mfcc_8': np.random.normal(0, 1, n),
        'mfcc_9': np.random.normal(0, 1, n),
        'mfcc_10': np.random.normal(0, 1, n),
        'mfcc_11': np.random.normal(0, 1, n),
        'mfcc_12': np.random.normal(0, 1, n),
        'mfcc_13': np.random.normal(0, 1, n),
        'pitch_mean': np.random.normal(200, 50, n),
        'pitch_std': np.random.normal(20, 10, n),
        'jitter': np.random.uniform(0, 0.05, n),
        'shimmer': np.random.uniform(0, 0.5, n),
        'hnr': np.random.normal(20, 5, n),
        'speech_rate': np.random.uniform(1, 5, n),
        'pause_count': np.random.randint(0, 10, n),
        'avg_pause_len': np.random.uniform(0.1, 2.0, n),
    }
    df = pd.DataFrame(data)
    
    # helper
    def norm(col):
        return (df[col] - df[col].min()) / (df[col].max() - df[col].min() + 1e-8)

    if condition == "Asthma":
        # Biomarkers: Breathlessness, Pause Patterns, Speech Rate, Wheeze Noise, Energy Decay
        df['breathlessness'] = (1 - norm('hnr')).clip(upper=0.7)
        df['pause_patterns'] = norm('avg_pause_len')
        df['speech_rate_bio'] = norm('speech_rate') # Normalized
        df['noise'] = np.random.uniform(0, 1, n)
        df['energy_decay'] = np.random.uniform(0, 1, n)
        
        lin = 0.3 * df['breathlessness'] + 0.2 * df['pause_patterns'] + 0.2 * (1 - df['speech_rate_bio']) + \
              0.15 * df['noise'] + 0.15 * df['energy_decay']
        mult = df['breathlessness'] * df['pause_patterns'] * df['noise']
        df['disease_score'] = 0.7 * lin + 0.3 * mult
        
    elif condition == "Post-Stroke":
        # Slurring, Consistency, etc.
        df['slurring'] = norm('shimmer')
        df['articulation'] = 1 - norm('jitter')
        df['speech_rate_bio'] = norm('speech_rate')
        df['pause_irregularity'] = norm('avg_pause_len')
        df['pitch_stability'] = 1 - norm('pitch_std')
        
        df['disease_score'] = 0.3 * df['slurring'] + 0.2 * (1 - df['articulation']) + \
                             0.2 * (1 - df['speech_rate_bio']) + 0.2 * df['pause_irregularity'] + 0.1 * (1 - df['pitch_stability'])
                             
    elif condition == "Neurological":
        df['tremor'] = (norm('jitter') + norm('shimmer')).clip(upper=1.0)
        df['cognitive_pause'] = norm('avg_pause_len')
        df['consistency'] = 1 - norm('shimmer')
        df['monotony'] = 1 - norm('pitch_std')
        df['latency'] = norm('pause_count') / 10
        
        df['disease_score'] = 0.25 * df['tremor'] + 0.25 * df['cognitive_pause'] + 0.2 * (1 - df['consistency']) + \
                             0.15 * (1 - df['monotony']) + 0.15 * df['latency']

    df['status'] = (df['disease_score'] > 0.45).astype(int)
    df['severity'] = df['disease_score'] * 100
    df.to_csv(f"data/{name}", index=False)
    print(f"Saved {name}")

if __name__ == "__main__":
    if not os.path.exists('data/asthma.csv'):
        create_synthetic_data("Asthma", "asthma.csv")
    if not os.path.exists('data/post_stroke.csv'):
        create_synthetic_data("Post-Stroke", "post_stroke.csv")
    if not os.path.exists('data/neurological.csv'):
        create_synthetic_data("Neurological", "neurological.csv")
