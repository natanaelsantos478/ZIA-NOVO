import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface UseGeminiLiveProps {
    onSegmentComplete?: (segment: string) => void;
}

const WORKLET_CODE = `
class GeminiAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer size 2048 at 16kHz = 128ms latency (good balance)
    this.bufferSize = 2048;
    this.buffer = new Int16Array(this.bufferSize);
    this.bufferIdx = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    const channelData = input[0];
    if (!channelData) return true;

    // 1. Calculate Volume (RMS) for UI
    // Calculate every ~100ms to save CPU
    if (currentTime % 0.1 < 0.01) {
        let sum = 0;
        // Optimization: check every 4th sample
        for (let i = 0; i < channelData.length; i += 4) {
            sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sum / (channelData.length / 4));
        this.port.postMessage({ type: 'VOL', value: rms });
    }

    // 2. Convert Float32 to Int16 (PCM)
    // The AudioContext is ALREADY running at 16kHz (set in main thread),
    // so we don't need to resample here. Just strict type conversion.
    for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        // Convert to 16-bit PCM
        this.buffer[this.bufferIdx++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

        // Flush when buffer is full
        if (this.bufferIdx >= this.bufferSize) {
            const chunk = this.buffer.slice(0, this.bufferSize);
            this.port.postMessage({ type: 'AUDIO', data: chunk.buffer }, [chunk.buffer]);
            this.bufferIdx = 0;
        }
    }

    return true;
  }
}
registerProcessor('gemini-audio-processor', GeminiAudioProcessor);
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

export function useGeminiLive({ onSegmentComplete }: UseGeminiLiveProps = {}) {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [volume, setVolume] = useState<number>(0);

  // Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // State refs
  const isUserActiveRef = useRef(false);
  const latestStreamRef = useRef<MediaStream | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestCallbackRef = useRef(onSegmentComplete);
  useEffect(() => {
    latestCallbackRef.current = onSegmentComplete;
  }, [onSegmentComplete]);

  const cleanup = useCallback(async () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    if (workletRef.current) {
        workletRef.current.port.postMessage({ type: 'STOP' });
        workletRef.current.disconnect();
        workletRef.current = null;
    }

    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }

    if (contextRef.current) {
        try {
            await contextRef.current.close();
        } catch (e) {}
        contextRef.current = null;
    }

    sessionPromiseRef.current = null;
  }, []);

  const connect = useCallback(async (stream: MediaStream, isRetry = false) => {
    if (!isUserActiveRef.current) return;
    latestStreamRef.current = stream;

    if (!isRetry) {
        setError(null);
        retryCountRef.current = 0;
    }

    try {
      if (!process.env.API_KEY) throw new Error("API Key is missing");

      // CRITICAL FIX: Force the AudioContext to 16000Hz.
      // This forces the browser to handle the resampling natively from 48k/44.1k to 16k.
      // Native resampling is artifact-free compared to manual JS resampling.
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive',
      });

      await ctx.resume();
      contextRef.current = ctx;

      // Initialize Worklet
      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(workletUrl);

      // Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: "Você é um transcritor profissional. Sua ÚNICA tarefa é transcrever o áudio para o idioma Português do Brasil (PT-BR). Se o áudio estiver em outro idioma, traduza para o Português do Brasil. Apenas transcreva, NUNCA responda ou converse.",
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live: Connected");
            setError(null);
            retryCountRef.current = 0;
          },
          onmessage: (msg: LiveServerMessage) => {
            const { serverContent } = msg;

            // Live Updates
            if (serverContent?.inputTranscription) {
               const delta = serverContent.inputTranscription.text;
               if (delta) {
                   const clean = delta.replace(/<[^>]*>|\[[^\]]*\]/g, '');
                   setText(prev => prev + clean);
               }
            }

            // Finalized Segment
            if (serverContent?.turnComplete) {
               setText(current => {
                   const trimmed = current.trim();
                   if (trimmed) {
                       // Use a timeout to break the render cycle and ensure clean state
                       setTimeout(() => {
                           latestCallbackRef.current?.(trimmed);
                       }, 0);
                   }
                   return "";
               });
            }
          },
          onerror: (err) => {
            console.warn("Gemini Live Error:", err);
            // Don't set hard error yet, try to ride it out
          },
          onclose: (e) => {
            console.log("Gemini Live: Closed", e);
            if (isUserActiveRef.current) {
                const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 5000);
                retryCountRef.current++;
                setError("Reconectando...");

                cleanup().then(() => {
                    retryTimeoutRef.current = setTimeout(() => {
                        if (latestStreamRef.current) connect(latestStreamRef.current, true);
                    }, delay);
                });
            }
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

      // Audio Graph
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const worklet = new AudioWorkletNode(ctx, 'gemini-audio-processor');

      worklet.port.onmessage = (e) => {
          const { type, value, data } = e.data;

          if (type === 'VOL') {
              setVolume(value * 5); // Boost visual volume
          } else if (type === 'AUDIO') {
              sessionPromiseRef.current?.then(session => {
                  const b64 = arrayBufferToBase64(data);
                  session.sendRealtimeInput({
                      media: { data: b64, mimeType: "audio/pcm;rate=16000" }
                  });
              }).catch(() => {
                  // Session not ready
              });
          }
      };

      source.connect(worklet);
      worklet.connect(ctx.destination); // Keep destination to prevent garbage collection
      workletRef.current = worklet;

    } catch (e: any) {
        console.error("Connect Error", e);
        setError("Erro de conexão. Tentando novamente...");
        if (isUserActiveRef.current) {
            retryTimeoutRef.current = setTimeout(() => {
                if (latestStreamRef.current) connect(latestStreamRef.current, true);
            }, 2000);
        }
    }
  }, [cleanup]);

  const startSession = useCallback((stream: MediaStream) => {
    isUserActiveRef.current = true;
    setIsActive(true);
    connect(stream);
  }, [connect]);

  const stopSession = useCallback(() => {
    isUserActiveRef.current = false;
    setIsActive(false);
    setVolume(0);
    cleanup();
  }, [cleanup]);

  return {
      isActive,
      text,
      volume,
      error,
      startSession,
      stopSession,
      clearTranscription: () => setText("")
  };
}
