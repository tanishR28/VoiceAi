'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useMemo } from 'react';

const DEFAULT_RECORDING_SECONDS = 15;
const ASTHMA_RECORDING_SECONDS = 20;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function parseExtractedMedicalReport(rawText) {
  const text = String(rawText || '');
  if (!text.trim()) {
    return {
      patientName: null,
      disease: null,
      rows: [],
      firstScore: null,
      lastScore: null,
      scoreDelta: null,
      finalScore: null,
      finalStatus: null,
    };
  }

  const patientNameMatch = text.match(/name\s*:\s*([^\n]+)/i);
  const diseaseMatch = text.match(/disease\s*:\s*([^\n]+)/i);
  const finalScoreMatch = text.match(/final\s+health\s+score\s*:\s*([0-9]+(?:\.[0-9]+)?)(?:\s*\(([^)]+)\))?/i);

  const normalized = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const rowRegex = /day\s*(\d+)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)/gi;
  const rows = [];
  let match;

  while ((match = rowRegex.exec(normalized)) !== null) {
    rows.push({
      day: Number(match[1]),
      breathScore: Number(match[2]),
      pauseScore: Number(match[3]),
      speechRate: Number(match[4]),
      healthScore: Number(match[5]),
    });
  }

  rows.sort((a, b) => a.day - b.day);
  const firstScore = rows.length ? rows[0].healthScore : null;
  const lastScore = rows.length ? rows[rows.length - 1].healthScore : null;
  const scoreDelta = firstScore !== null && lastScore !== null ? lastScore - firstScore : null;

  return {
    patientName: patientNameMatch ? patientNameMatch[1].trim() : null,
    disease: diseaseMatch ? diseaseMatch[1].trim() : null,
    rows,
    firstScore,
    lastScore,
    scoreDelta,
    finalScore: finalScoreMatch ? Number(finalScoreMatch[1]) : null,
    finalStatus: finalScoreMatch && finalScoreMatch[2] ? finalScoreMatch[2].trim() : null,
  };
}


function normalizeStructuredReport(report) {
  const rows = Array.isArray(report?.rows)
    ? report.rows
        .map((row) => ({
          day: Number(row.day),
          breathScore: Number(row.breath_score),
          pauseScore: Number(row.pause_score),
          speechRate: Number(row.speech_rate),
          healthScore: Number(row.health_score),
        }))
        .filter((row) => Number.isFinite(row.day))
        .sort((a, b) => a.day - b.day)
    : [];

  const firstScore = rows.length ? rows[0].healthScore : null;
  const lastScore = rows.length ? rows[rows.length - 1].healthScore : null;
  const scoreDelta = firstScore !== null && lastScore !== null ? lastScore - firstScore : null;

  return {
    patientName: report?.patient_name || null,
    disease: report?.disease || null,
    rows,
    firstScore,
    lastScore,
    scoreDelta,
    finalScore: report?.final_health_score ?? null,
    finalStatus: report?.final_health_status || null,
  };
}

export default function RecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_RECORDING_SECONDS);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDocumentAnalyzing, setIsDocumentAnalyzing] = useState(false);
  const [sessionId, setSessionId] = useState('VX-....');
  const [selectedDisease, setSelectedDisease] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [documentResult, setDocumentResult] = useState(null);
  const [mode, setMode] = useState('voice');
  const [selectedFile, setSelectedFile] = useState(null);

  const diseaseOptions = [
    'Asthma',
    'Cardiovascular',
    'Neurological',
    'Post-Stroke',
    "Parkinson's",
    'Depression',
  ];
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const router = useRouter();
  const structuredDoc = useMemo(() => {
    if (documentResult?.report) {
      return normalizeStructuredReport(documentResult.report);
    }
    return parseExtractedMedicalReport(documentResult?.extracted_text);
  }, [documentResult]);

  const recordingDuration = selectedDisease === 'Asthma' ? ASTHMA_RECORDING_SECONDS : DEFAULT_RECORDING_SECONDS;
  const elapsedSeconds = Math.max(0, recordingDuration - timeLeft);

  // Cleanup on unmount
  useEffect(() => {
    setSessionId(`VX-${Math.floor(1000 + Math.random() * 9000)}`);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecording && !isAnalyzing) {
      setTimeLeft(recordingDuration);
    }
  }, [recordingDuration, isRecording, isAnalyzing]);

  const processMedicalDocument = async (file) => {
    setIsDocumentAnalyzing(true);
    setError('');
    setDocumentResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/extract-medical-records`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Medical record extraction failed: ${txt}`);
      }

      const data = await response.json();
      setDocumentResult(data);
    } catch (err) {
      console.error('Document extraction error:', err);
      setError(err.message || 'Failed to extract medical record.');
    } finally {
      setIsDocumentAnalyzing(false);
    }
  };

  const handleStartRecording = async () => {
    if (isRecording) {
       stopRecording();
       return;
    }

    if (!selectedDisease) {
      setError('Please select your disease before starting recording.');
      return;
    }

    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setAudioUrl(null);
      setAnalysisResult(null);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // Generate playback UI
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
        await processAudioBackend(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimeLeft(recordingDuration);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      console.log("Recording started...");

    } catch (err) {
      console.error("Mic Error:", err);
      setError("Microphone access denied or not working. Please check permissions or try another browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      console.log("Recording stopped manually/automatically...");
    }
  };

  const processAudioBackend = async (audioBlob) => {
    setIsAnalyzing(true);
    setError('');

    // Native browser decode from webm to 16kHz Mono WAV
    const convertToWav = async (blob) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const wavData = new DataView(new ArrayBuffer(44 + channelData.length * 2));
      
      const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
      };

      writeString(wavData, 0, 'RIFF');
      wavData.setUint32(4, 36 + channelData.length * 2, true);
      writeString(wavData, 8, 'WAVE');
      writeString(wavData, 12, 'fmt ');
      wavData.setUint32(16, 16, true);          
      wavData.setUint16(20, 1, true);           
      wavData.setUint16(22, 1, true);           
      wavData.setUint32(24, 16000, true);       
      wavData.setUint32(28, 16000 * 2, true);   
      wavData.setUint16(32, 2, true);           
      wavData.setUint16(34, 16, true);          
      writeString(wavData, 36, 'data');
      wavData.setUint32(40, channelData.length * 2, true);
      
      let offset = 44;
      for (let i = 0; i < channelData.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, channelData[i]));
        wavData.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      return new Blob([wavData], { type: 'audio/wav' });
    };

    try {
      console.log("Converting webm Blob to WAV natively...");
      const wavBlob = await convertToWav(audioBlob);
      console.log("Sending WAV audio blob to backend: size", wavBlob.size);
      
      const formData = new FormData();
      formData.append('file', wavBlob, 'recording.wav');
      formData.append('disease', selectedDisease);

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
         const txt = await response.text();
         throw new Error(`API Error ${response.status}: ${txt}`);
      }

      const data = await response.json();
      console.log("Received AI Analysis:", data);

      // Save to localStorage so UI can instantly update globally
      localStorage.setItem('vocalis_latest_analysis', JSON.stringify(data));
      localStorage.setItem('vocalis_just_updated', 'true');

      // Display results inline instead of redirecting
      setAnalysisResult(data);
      setIsAnalyzing(false);
    } catch (err) {
      console.error("Backend integration error:", err);
      setError(err.message || "Failed to process audio.");
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-outline-variant/15 bg-slate-50 p-4 gap-2 z-50">
        <div className="flex items-center gap-3 px-2 py-6 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>waves</span>
          </div>
          <div>
            <div className="text-blue-700 font-extrabold font-headline text-lg tracking-tight">Vocalis AI</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Clinical Grade</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <Link href="/" className="group flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-xl font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">dashboard</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/record" className="group flex items-center gap-3 px-4 py-3 bg-white text-blue-700 rounded-xl shadow-sm border border-outline-variant/10 font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
            <span>Record</span>
          </Link>
          <Link href="/history" className="group flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-xl font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">history</span>
            <span>History</span>
          </Link>
          <Link href="/insights" className="group flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-xl font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">analytics</span>
            <span>Insights</span>
          </Link>
          <button className="group w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-xl font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">settings</span>
            <span>Settings</span>
          </button>
        </nav>
      </aside>

      <main className="md:ml-64 min-h-screen flex flex-col items-center justify-center relative px-6 w-full">
        <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <span className="text-on-surface-variant font-headline font-semibold text-sm tracking-tight uppercase">Session ID: {sessionId}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-secondary-container/30 px-3 py-1 rounded-full border border-secondary/10">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
              <span className="text-xs font-bold text-on-secondary-container uppercase tracking-wider font-label">Signal Secure</span>
            </div>
          </div>
        </header>

        <div className="w-full max-w-7xl flex flex-col items-center gap-12 mt-12 mb-20">
          <div className="text-center space-y-4 w-full max-w-4xl">
            <h2 className="font-headline font-extrabold text-on-surface tracking-tight md:text-4xl text-3xl">
              {isAnalyzing ? "Processing AI Analysis..." : `Speak naturally for ${recordingDuration} seconds`}
            </h2>

            <div className="max-w-xl mx-auto w-full bg-surface-container-lowest/80 backdrop-blur-xl p-4 rounded-xl border border-outline-variant/15 shadow-sm">
              <label htmlFor="disease-select" className="block text-sm font-bold text-on-surface mb-2 text-left uppercase tracking-wider">
                Select Your Disease
              </label>
              <select
                id="disease-select"
                value={selectedDisease}
                onChange={(e) => {
                  setSelectedDisease(e.target.value);
                  if (error && e.target.value) setError('');
                }}
                disabled={isRecording || isAnalyzing}
                className="w-full rounded-lg border border-outline-variant/30 bg-white px-4 py-3 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Choose one condition</option>
                {diseaseOptions.map((disease) => (
                  <option key={disease} value={disease}>
                    {disease}
                  </option>
                ))}
              </select>
            </div>


            {error && (
               <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mt-4 animate-in fade-in max-w-xl mx-auto shadow-sm">
                  <p className="font-bold mb-2">Recording Error</p>
                  <p className="text-sm">{error}</p>
               </div>
            )}
            
            {!error && !isAnalyzing && (
              <div className="bg-surface-container-lowest/80 backdrop-blur-xl p-8 rounded-xl border border-outline-variant/15 shadow-sm max-w-2xl mx-auto">
                {selectedDisease === 'Asthma' ? (
                  <div className="space-y-3">
                    <p className="text-on-surface-variant font-medium text-lg leading-relaxed italic">
                      Say <span className="text-on-surface font-bold">"aah"</span> for <span className="text-on-surface font-bold">5 seconds</span>, then read:
                    </p>
                    <p className="text-on-surface font-semibold text-base leading-relaxed">
                      "Today I tried to walk a short distance, but I started feeling short of breath. I had to slow down and take deeper breaths. Speaking continuously sometimes feels difficult, and I need to pause to breathe properly."
                    </p>
                    {isRecording && (
                      <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                        {elapsedSeconds < 5 ? 'Step 1: Keep saying "aah"' : 'Step 2: Read the sentence above'}
                      </p>
                    )}
                  </div>
                ) : selectedDisease ? (
                  selectedDisease === 'Cardiovascular' ? (
                    <p className="text-on-surface-variant font-medium text-lg leading-relaxed italic">
                      "Now I will count slowly from one to twenty in a steady voice."
                    </p>
                  ) : selectedDisease === 'Neurological' ? (
                    <p className="text-on-surface-variant font-medium text-lg leading-relaxed italic">
                      "Now I will repeat pa-ta-ka pa-ta-ka pa-ta-ka as quickly and clearly as possible."
                    </p>
                  ) : selectedDisease === 'Post-Stroke' ? (
                    <p className="text-on-surface-variant font-medium text-lg leading-relaxed italic">
                      "Now I will say: baby boy buys blue balloons, slowly and clearly."
                    </p>
                  ) : selectedDisease === "Parkinson's" ? (
                    <div className="space-y-3">
                      <p className="text-on-surface-variant font-medium text-lg leading-relaxed italic">
                        Now I will say <span className="text-on-surface font-bold">"eeeeeee"</span> in a steady tone for as long as possible for <span className="text-on-surface font-bold">5 seconds</span>.
                      </p>
                      <p className="text-on-surface font-semibold text-base leading-relaxed">
                        "I am speaking in a steady voice and trying to maintain the same tone throughout this sentence. Sometimes my voice feels softer and less expressive, and I need to focus more to keep it clear and consistent."
                      </p>
                      {isRecording && (
                        <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                          {elapsedSeconds < 5 ? 'Step 1: Sustain "eeeeeee"' : 'Step 2: Read the sentence above'}
                        </p>
                      )}
                    </div>
                  ) : selectedDisease === 'Depression' ? (
                    <p className="text-on-surface-variant font-medium text-lg leading-relaxed italic">
                      Describe how you are feeling today in your own words.
                    </p>
                  ) : (
                    <p className="text-on-surface-variant font-medium text-lg leading-relaxed italic">
                      "Please read the text below: <span className="text-on-surface font-bold">'The quick brown fox jumps over the lazy dog.'</span>"
                    </p>
                  )
                ) : (
                  <p className="text-on-surface-variant font-medium text-lg leading-relaxed italic">
                    Select a disease to view your recording instructions.
                  </p>
                )}
              </div>
            )}
            {isAnalyzing && (
              <div className="bg-blue-50/80 backdrop-blur-xl p-8 rounded-xl border border-blue-100 shadow-sm max-w-2xl mx-auto animate-pulse mt-4">
                <p className="text-blue-700 font-medium text-lg leading-relaxed italic">
                  Analyzing secure payload with Local PyTorch Models and extracting vital biomarkers...
                </p>
              </div>
            )}


          </div>

          <div className="relative flex flex-col items-center">
            <div className={`mb-12 font-headline text-7xl font-light tracking-tighter ${isRecording ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`}>
              00:<span className="font-bold">{timeLeft.toString().padStart(2, '0')}</span>
            </div>
            
            <div className="relative group">
              {isRecording && <div className="absolute -inset-8 bg-blue-500/20 shadow-[0_0_50px_rgba(37,99,235,0.4)] rounded-full blur-3xl opacity-60 scale-110 animate-pulse"></div>}
              {isAnalyzing && <div className="absolute -inset-8 bg-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.4)] rounded-full blur-3xl opacity-60 scale-110 animate-spin"></div>}
              
              <button 
                onClick={handleStartRecording} 
                disabled={isAnalyzing || !selectedDisease}
                className={`relative w-40 h-40 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-95 group 
                   ${isAnalyzing || !selectedDisease ? 'bg-slate-300 opacity-50 cursor-not-allowed' : 
                     isRecording ? 'bg-gradient-to-br from-red-500 to-red-600 hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 
                     'bg-gradient-to-tr from-primary to-primary-container hover:shadow-[0_0_30px_rgba(0,86,187,0.4)]'
                   }
                `}
              >
                <span className={`material-symbols-outlined text-6xl ${isRecording ? 'animate-pulse' : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                   {isRecording ? 'stop_circle' : 'mic'}
                </span>
              </button>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-400 tracking-wider uppercase">
              {isRecording ? "Click to stop early" : selectedDisease ? "Click to Record" : "Select Disease to Enable Recording"}
            </p>

            <div className={`mt-12 h-24 w-64 flex items-center justify-between gap-1 border-b border-transparent transition-opacity ${isRecording ? 'opacity-100' : 'opacity-20'}`}>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-blue-600 animate-[pulse_1s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '2rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-blue-500 animate-[pulse_1.2s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '3rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-blue-400 animate-[pulse_0.8s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '4rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-primary animate-[pulse_1.5s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '6rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-primary animate-[pulse_0.9s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '4.5rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-primary animate-[pulse_1.1s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '5rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-primary animate-[pulse_1.3s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '3.5rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-blue-500 animate-[pulse_0.7s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '4rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-blue-600 animate-[pulse_1.4s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '2.5rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-blue-500 animate-[pulse_1s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '3rem' }}></div>
              <div className={`waveform-bar w-1.5 ${isRecording ? 'bg-blue-400 animate-[pulse_1.2s_ease-in-out_infinite]' : 'bg-slate-300'} rounded-full`} style={{ height: '2rem' }}></div>
            </div>

            {audioUrl && (
              <div className="mt-8 z-20 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">Playback Recording</p>
                <audio controls src={audioUrl} className="w-72 h-12 rounded-full shadow-md bg-white border border-outline-variant/20" />
              </div>
            )}
            
            {analysisResult && (
              <div className="mt-12 bg-white p-8 rounded-2xl shadow-2xl w-full animate-in fade-in slide-in-from-bottom border border-blue-100 z-20">
                <h3 className="text-2xl font-black text-blue-900 mb-8 border-b border-slate-100 pb-4">Clinical Biomarker Analysis</h3>
                
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left Side: Core Scores */}
                  <div className="w-full md:w-1/3 flex flex-col gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl py-8 px-4 border border-blue-100 flex-1 flex flex-col justify-center items-center shadow-inner">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Composite Health Score</p>
                      <p className="text-6xl font-black text-blue-600 drop-shadow-sm">{analysisResult.health_score}<span className="text-2xl text-blue-300 font-bold">/100</span></p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl py-8 px-4 border border-purple-100 flex-1 flex flex-col justify-center items-center shadow-inner">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Diagnostic Status</p>
                      <p className="text-3xl font-bold text-purple-700 tracking-tight drop-shadow-sm text-center">{analysisResult.status}</p>
                    </div>
                  </div>

                  {/* Right Side: Graph Bars */}
                  <div className="w-full md:w-2/3 bg-slate-50 border border-slate-200/60 rounded-2xl p-8 flex flex-col justify-center shadow-inner">
                     <div className="flex justify-between items-end mb-8">
                         <h4 className="text-sm font-extrabold text-slate-600 uppercase tracking-widest">Acoustic Biomarker Signatures</h4>
                     </div>
                     
                     <div className="space-y-6">
                       {[
                         { label: "Signature Detected", value: analysisResult.signature_detected || 0, max: 1.0, color: "bg-emerald-500" },
                         { label: "Pause Patterns", value: analysisResult.pause_score || 0, max: 20.0, color: "bg-emerald-500" },
                         { label: "Speech Rate", value: analysisResult.speech_rate || 0, max: 8.0, color: "bg-red-500" },
                         { label: "Pitch Variation", value: analysisResult.pitch_variation || 0, max: 40.0, color: "bg-amber-500" },
                         { label: "Breathlessness", value: analysisResult.breath_score || 0, max: 2.0, color: "bg-red-500" },
                         { label: "Tremor", value: analysisResult.tremor_score || 0, max: 2.0, color: "bg-emerald-500" }
                       ].map((item, idx) => (
                         <div key={idx} className="flex items-center gap-5">
                           <div className="w-44 text-right text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0 break-words">{item.label}</div>
                           <div className="flex-1 h-7 bg-slate-200 border border-slate-300 relative rounded-sm shadow-inner group overflow-hidden">
                             <div className={`h-full ${item.color} transition-all duration-1000 ease-out border-r border-black/10`} style={{ width: `${Math.min(100, Math.max(0, (item.value / item.max) * 100))}%` }}></div>
                           </div>
                           <div className="w-16 text-right text-sm font-mono font-bold text-slate-700 bg-white border border-slate-200 py-1 px-2 rounded">{Number(item.value).toFixed(3)}</div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 z-10 relative">
            <Link href="/">
              <button disabled={isRecording || isAnalyzing} className="px-8 py-3 rounded-xl text-slate-500 font-label font-semibold hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                Return Dashboard
              </button>
            </Link>
          </div>
        </div>

        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none -z-10">
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-[120px]"></div>
        </div>
      </main>

      <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <Link href="/">
          <button className="bg-surface-container-lowest/80 backdrop-blur-md px-6 py-3 rounded-full border border-outline-variant/20 shadow-lg text-sm font-bold text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">close</span>
            Exit Focus
          </button>
        </Link>
      </div>
    </>
  );
}
