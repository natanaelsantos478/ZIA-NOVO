import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface UseGeminiMicrophoneProps {
  onSegmentComplete: (text: string) => void;
}

// AudioWorklet Processor Code
const WORKLET_CODE = `
class GeminiVoiceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 4096 = ~256ms @ 16kHz.
    // Balanced between low latency and network stability.
    this.bufferSize = 4096;
    this.buffer = new Int16Array(this.bufferSize);
    this.ptr = 0;
    this.frameCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channel = input[0];

    // 1. RMS Calculation (Volume) - HEAVILY THROTTLED
    // We don't need 60fps volume updates for a simple UI.
    // 128 frames per block. 16000/128 = 125 blocks/sec.
    // Update every 20 blocks = ~6 updates/sec. ample for UI.
    this.frameCount++;
    if (this.frameCount >= 20) {
        let sum = 0;
        for (let i = 0; i < channel.length; i++) {
            sum += channel[i] * channel[i];
        }
        const rms = Math.sqrt(sum / channel.length);
        this.port.postMessage({ type: 'VOL', value: rms });
        this.frameCount = 0;
    }

    // 2. Buffer & Convert
    for (let i = 0; i < channel.length; i++) {
        const s = Math.max(-1, Math.min(1, channel[i]));
        // Convert Float32 to Int16
        this.buffer[this.ptr++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

        if (this.ptr >= this.bufferSize) {
            const chunk = this.buffer.slice(0, this.bufferSize);
            this.port.postMessage({ type: 'AUDIO', data: chunk.buffer }, [chunk.buffer]);
            this.ptr = 0;
        }
    }
    return true;
  }
}
registerProcessor('gemini-voice-processor', GeminiVoiceProcessor);
`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function useGeminiMicrophone({ onSegmentComplete }: UseGeminiMicrophoneProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for managing state inside callbacks/intervals without triggering re-renders
  const isRecordingRef = useRef(false);
  const contextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const currentTextRef = useRef('');
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupAudio = () => {
    if (workletRef.current) {
        workletRef.current.port.postMessage({ type: 'STOP' });
        workletRef.current.disconnect();
        workletRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    if (contextRef.current && contextRef.current.state !== 'closed') {
        contextRef.current.close();
        contextRef.current = null;
    }
  };

  const stop = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setMicLevel(0);

    // Cancel any pending retries
    if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
    }

    cleanupAudio();
    sessionRef.current = null;
  }, []);

  const connect = useCallback(async (isRetry = false) => {
    if (!isRecordingRef.current) return; // Abort if user stopped

    if (!isRetry) setError(null); // Only clear error on fresh start

    try {
        if (!process.env.API_KEY) throw new Error("API Key missing");

        // 1. Audio Context
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000,
            latencyHint: 'interactive'
        });
        await ctx.resume();
        contextRef.current = ctx;

        // 2. Worklet
        const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(workletUrl);

        // 3. Gemini Session
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const modelName = 'gemini-2.5-flash-native-audio-preview-12-2025';

        const sessionPromise = ai.live.connect({
            model: modelName,
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                systemInstruction: {
                    parts: [{ text: `
                        Transcribe Portuguese (Brazil) audio exactly.
                        Ignore silence. Output nothing if unclear.
                        Do not translate.
                    `}]
                }
            },
            callbacks: {
                onopen: () => {
                    console.log("Gemini Mic: Connected");
                    // On successful connection, clear any previous errors
                    setError(null);
                },
                onmessage: (msg: LiveServerMessage) => {
                    const inputTrx = msg.serverContent?.inputTranscription;
                    if (inputTrx?.text) {
                        currentTextRef.current += inputTrx.text;
                        setTranscription(currentTextRef.current);
                    }
                    if (msg.serverContent?.turnComplete) {
                        const final = currentTextRef.current.trim();
                        if (final.length > 0 && /[a-zA-Z0-9\u00C0-\u00FF]/.test(final)) {
                            onSegmentComplete(final);
                        }
                        currentTextRef.current = '';
                        setTranscription('');
                    }
                },
                onclose: (e) => {
                    console.log("Session closed:", e);
                    // AUTO-RECONNECT LOGIC
                    if (isRecordingRef.current) {
                        console.log("Attempting reconnect...");
                        cleanupAudio(); // Clean up old audio stuff
                        // Wait 1s before reconnecting to avoid spamming
                        retryTimeoutRef.current = setTimeout(() => {
                            connect(true);
                        }, 1000);
                    }
                },
                onerror: (err) => {
                    console.error("Gemini Error:", err);
                    // Don't stop() immediately; let onclose handle reconnect if possible
                    // But if it's a fatal auth error, we might want to show it.
                    // For now, treat as connection drop.
                }
            }
        });

        sessionRef.current = await sessionPromise;

        // 4. Microphone Stream
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        streamRef.current = stream;

        const source = ctx.createMediaStreamSource(stream);
        const worklet = new AudioWorkletNode(ctx, 'gemini-voice-processor');

        worklet.port.onmessage = (e) => {
            const { type, value, data } = e.data;
            if (type === 'VOL') {
                setMicLevel(value * 100);
            } else if (type === 'AUDIO') {
                const b64 = arrayBufferToBase64(data);
                // Only send if session exists
                sessionPromise.then(sess => {
                     // Check if session is still valid/open roughly?
                     // The SDK throws if closed, catch block handles it.
                     sess.sendRealtimeInput({
                        media: { mimeType: "audio/pcm;rate=16000", data: b64 }
                    });
                }).catch(() => {
                    // Ignore send errors, onclose/onerror will handle lifecycle
                });
            }
        };

        source.connect(worklet);
        worklet.connect(ctx.destination);
        workletRef.current = worklet;

    } catch (e: any) {
        console.error("Connection failed:", e);
        setError("Conexão falhou. Tentando reconectar...");
        // Retry logic for initial connection failure
        if (isRecordingRef.current) {
             retryTimeoutRef.current = setTimeout(() => {
                connect(true);
            }, 2000);
        }
    }
  }, [onSegmentComplete]);

  const start = useCallback(() => {
    isRecordingRef.current = true;
    setIsRecording(true);
    connect();
  }, [connect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
        isRecordingRef.current = false;
        cleanupAudio();
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  return {
    isRecording,
    transcription,
    micLevel,
    error,
    start,
    stop
  };
}
