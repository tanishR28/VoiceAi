import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wav
import time

def record_audio(duration=15, fs=16000, filename="live_recording.wav"):
    """
    Records audio from the default microphone.
    """
    print(f"Recording for {duration} seconds... Please speak naturally.")
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='float32')
    
    # Simple countdown
    for i in range(duration, 0, -1):
        print(f"Time remaining: {i}s", end="\r")
        time.sleep(1)
    
    sd.wait() # Wait until recording is finished
    print("\nRecording complete.")
    
    # Normalize and save
    # Convert float32 [-1, 1] to int16
    recording_int = (recording * 32767).astype(np.int16)
    wav.write(filename, fs, recording_int)
    return filename

if __name__ == "__main__":
    record_audio()
