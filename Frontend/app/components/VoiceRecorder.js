"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Upload, RotateCcw, Check } from "lucide-react";
import WaveformVisualizer from "./WaveformVisualizer";

const RECORD_DURATION = 20; // seconds
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function VoiceRecorder({ onAnalysisComplete, disease }) {
  const [state, setState] = useState("idle"); // idle | recording | recorded | uploading | analyzing | done | error
  const [timeLeft, setTimeLeft] = useState(RECORD_DURATION);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Set up audio context for visualization
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      setAnalyserNode(analyser);

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("recorded");
      };

      recorder.start(100); // collect data every 100ms
      setState("recording");
      setTimeLeft(RECORD_DURATION);

      // Countdown timer
      let remaining = RECORD_DURATION;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          if (recorder.state === "recording") {
            recorder.stop();
            stream.getTracks().forEach((t) => t.stop());
          }
        }
      }, 1000);
    } catch (err) {
      setErrorMessage(
        "Microphone access denied. Please allow microphone access and try again."
      );
      setState("error");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const resetRecording = () => {
    cleanup();
    setAudioBlob(null);
    setAudioUrl(null);
    setAnalyserNode(null);
    setAnalysisResult(null);
    setErrorMessage("");
    setTimeLeft(RECORD_DURATION);
    setState("idle");
  };

  const uploadAndAnalyze = async () => {
    if (!audioBlob) return;

    setState("analyzing");
    setAnalysisStep(0);

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      if (disease) {
        formData.append("disease", disease);
      }

      // Simulate step progression
      const stepInterval = setInterval(() => {
        setAnalysisStep((prev) => Math.min(prev + 1, 4));
      }, 800);

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      clearInterval(stepInterval);
      setAnalysisStep(5);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Analysis failed");
      }

      const result = await response.json();
      setAnalysisResult(result);
      setState("done");

      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to analyze recording");
      setState("error");
    }
  };

  const timerProgress = ((RECORD_DURATION - timeLeft) / RECORD_DURATION) * 100;
  const circumference = 2 * Math.PI * 90;
  const dashOffset = circumference - (timerProgress / 100) * circumference;

  const analysisSteps = [
    "Uploading audio...",
    "Preprocessing & noise reduction...",
    "Extracting vocal biomarkers...",
    "Running AI analysis...",
    "Generating health score...",
  ];

  return (
    <div>
      {/* Analyzing overlay */}
      {state === "analyzing" && (
        <div className="analyzing-overlay">
          <div className="analyzing-spinner" />
          <h3 style={{ color: "var(--text-primary)" }}>Analyzing Your Voice</h3>
          <p className="analyzing-text">
            Our AI is extracting vocal biomarkers from your recording
          </p>
          <div className="analyzing-steps">
            {analysisSteps.map((step, i) => (
              <div
                key={i}
                className={`analyzing-step ${
                  i < analysisStep ? "done" : i === analysisStep ? "active" : ""
                }`}
              >
                {i < analysisStep ? (
                  <Check size={16} />
                ) : (
                  <span style={{ width: 16, display: "inline-block" }}>
                    {i === analysisStep ? "→" : "○"}
                  </span>
                )}
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="recorder-wrapper">
        {/* Timer Ring */}
        <div className={`timer-ring ${state === "recording" ? "recording" : ""}`}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" className="ring-track" />
            <circle
              cx="100"
              cy="100"
              r="90"
              className="ring-progress"
              strokeDasharray={circumference}
              strokeDashoffset={state === "recording" ? dashOffset : circumference}
            />
          </svg>

          {/* Record Button (centered) */}
          <button
            className={`record-button ${state === "recording" ? "recording" : ""}`}
            onClick={state === "recording" ? stopRecording : startRecording}
            disabled={state === "analyzing" || state === "uploading"}
            id="record-button"
            aria-label={state === "recording" ? "Stop recording" : "Start recording"}
          >
            <div className="inner-circle" />
          </button>
        </div>

        {/* Timer Display */}
        <div style={{ textAlign: "center" }}>
          <div className="timer-display" id="timer-display">
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
            {String(timeLeft % 60).padStart(2, "0")}
          </div>
          <div className="timer-label">
            {state === "idle" && "Tap to start recording"}
            {state === "recording" && "Recording in progress..."}
            {state === "recorded" && "Recording complete"}
            {state === "done" && "Analysis complete!"}
            {state === "error" && "Error occurred"}
          </div>
        </div>

        {/* Waveform */}
        <div style={{ width: "100%", maxWidth: 600 }}>
          <WaveformVisualizer
            isRecording={state === "recording"}
            analyserNode={analyserNode}
          />
        </div>

        {/* Audio playback */}
        {audioUrl && state !== "analyzing" && (
          <audio
            controls
            src={audioUrl}
            style={{
              width: "100%",
              maxWidth: 400,
              borderRadius: "var(--radius-md)",
            }}
            id="audio-playback"
          />
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "var(--space-md)" }}>
          {state === "recorded" && (
            <>
              <button
                className="btn btn-secondary"
                onClick={resetRecording}
                id="btn-reset"
              >
                <RotateCcw size={18} />
                Re-record
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={uploadAndAnalyze}
                id="btn-analyze"
              >
                <Upload size={18} />
                Analyze Voice
              </button>
            </>
          )}

          {state === "done" && (
            <button
              className="btn btn-secondary"
              onClick={resetRecording}
              id="btn-new-recording"
            >
              <Mic size={18} />
              New Recording
            </button>
          )}

          {state === "error" && (
            <button
              className="btn btn-primary"
              onClick={resetRecording}
              id="btn-try-again"
            >
              <RotateCcw size={18} />
              Try Again
            </button>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            className="alert-banner high"
            style={{ maxWidth: 500, width: "100%" }}
          >
            <div className="alert-content">
              <div className="alert-title">Error</div>
              <div className="alert-message">{errorMessage}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
