import { useState, useEffect, useRef } from 'react';
import { Mic, StopCircle, Clock, Brain, User, Building2, MapPin, Briefcase } from 'lucide-react';
import { useGeminiLive } from '../../hooks/useGeminiLive';
import { useMeetingRecorder } from '../../hooks/useMeetingRecorder';
import { useGeminiBrain } from '../../hooks/useGeminiBrain';
import type { FinalAnalysisResult } from '../../types/meeting';

interface MeetingViewProps {
  onFinish: (result: FinalAnalysisResult) => void;
  onCancel: () => void;
}

export default function MeetingView({ onFinish, onCancel }: MeetingViewProps) {
  const {
    isActive, text: liveText, volume, error: liveError,
    startSession, stopSession
  } = useGeminiLive({
    onSegmentComplete: (segment) => {
      setTranscriptionHistory(prev => [...prev, segment]);
      processInput(segment);
    }
  });

  const { startRecording, stopRecording } = useMeetingRecorder();

  const {
    latestInsight, isThinking, processInput, generateFinalAnalysis
  } = useGeminiBrain();

  // State
  const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveText, transcriptionHistory]);

  // Startup
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        startSession(stream);
        startRecording(stream);
      } catch (err) {
        console.error("Mic access denied", err);
        // Handle error visually if needed
      }
    };
    init();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Run once on mount

  const handleStop = async () => {
    setIsFinalizing(true);
    stopSession(); // Stop Gemini Live

    // Stop Recorder and get blob
    const { blob } = await stopRecording();

    // Generate Analysis
    const result = await generateFinalAnalysis(blob, transcriptionHistory);

    if (result) {
      onFinish(result);
    } else {
      console.error("Failed to generate analysis");
      onCancel();
    }
    setIsFinalizing(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper for spin phase color
  const getSpinColor = (phase?: string) => {
    switch(phase) {
      case 'Situação': return 'bg-blue-100 text-blue-800';
      case 'Problema': return 'bg-orange-100 text-orange-800';
      case 'Implicação': return 'bg-red-100 text-red-800';
      case 'Necessidade': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper for DISC color
  const getDiscColor = (profile?: string) => {
      switch(profile) {
          case 'Dominante': return 'bg-red-100 text-red-800 border-red-200';
          case 'Influente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'Estável': return 'bg-green-100 text-green-800 border-green-200';
          case 'Conforme': return 'bg-blue-100 text-blue-800 border-blue-200';
          default: return 'bg-slate-100 text-slate-500 border-slate-200';
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col md:flex-row h-full animate-in fade-in duration-300">
        {/* Left Column - Main Interaction */}
        <div className="flex-1 flex flex-col p-6 h-full relative">
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                   <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                        <Mic className="w-6 h-6 text-white animate-pulse" />
                   </div>
                   <div>
                       <h1 className="text-2xl font-bold text-slate-900">Atendimento ao Vivo</h1>
                       <div className="flex items-center space-x-2 text-slate-500 text-sm font-medium">
                           <Clock className="w-4 h-4" />
                           <span>{formatTime(elapsedTime)}</span>
                           <span className="w-1 h-1 bg-slate-300 rounded-full mx-2"></span>
                           <span className={liveError ? "text-red-500" : "text-emerald-500"}>
                               {liveError || (isActive ? "Ouvindo..." : "Conectando...")}
                           </span>
                       </div>
                   </div>
                </div>
            </header>

            {/* Volume Visualizer */}
            <div className="h-1 bg-slate-200 rounded-full mb-6 overflow-hidden">
                <div
                    className="h-full bg-indigo-500 transition-all duration-75 ease-out"
                    style={{ width: `${Math.min(volume, 100)}%` }}
                ></div>
            </div>

            {/* Transcription Area */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col relative">
                <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white to-transparent z-10"></div>

                <div className="overflow-y-auto flex-1 space-y-4 py-4 scroll-smooth" ref={scrollRef}>
                    {transcriptionHistory.map((seg, i) => (
                        <p key={i} className="text-slate-500 text-lg leading-relaxed">{seg}</p>
                    ))}
                    {liveText && (
                        <p className="text-slate-900 font-medium text-lg leading-relaxed animate-in fade-in duration-300">
                            {liveText}
                        </p>
                    )}
                </div>

                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent z-10"></div>
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex justify-center">
                {isFinalizing ? (
                     <div className="flex flex-col items-center animate-pulse">
                         <Brain className="w-8 h-8 text-indigo-600 mb-2 animate-bounce" />
                         <p className="text-indigo-900 font-bold text-lg">Analisando com IA...</p>
                         <p className="text-slate-500 text-sm">Gerando resumo e perfil comportamental</p>
                     </div>
                ) : (
                    <button
                        onClick={handleStop}
                        className="group relative flex items-center justify-center space-x-3 bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full shadow-xl shadow-red-200 transition-all hover:scale-105 active:scale-95 w-full md:w-auto cursor-pointer"
                    >
                        <StopCircle className="w-6 h-6 fill-current" />
                        <span className="text-lg font-bold uppercase tracking-wide">Encerrar Atendimento</span>
                    </button>
                )}
            </div>
        </div>

        {/* Right Column - AI Insights */}
        <div className="w-full md:w-96 bg-white border-l border-slate-200 p-6 flex flex-col space-y-6 overflow-y-auto">

            {/* SPIN Coach Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Brain className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-indigo-900">Coach IA — SPIN</h3>
                    </div>
                    {latestInsight?.spinPhase && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getSpinColor(latestInsight.spinPhase)}`}>
                            {latestInsight.spinPhase}
                        </span>
                    )}
                </div>

                <div className="min-h-[100px]">
                    {isThinking ? (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-4 bg-indigo-100 rounded w-3/4"></div>
                            <div className="h-4 bg-indigo-100 rounded w-full"></div>
                            <div className="h-4 bg-indigo-100 rounded w-5/6"></div>
                        </div>
                    ) : latestInsight?.suggestion ? (
                        <div className="relative">
                            <p className="text-slate-700 text-sm leading-relaxed italic">
                                "{latestInsight.suggestion}"
                            </p>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-xs text-center mt-8">Aguardando contexto da conversa...</p>
                    )}
                </div>
            </div>

            {/* Behavioral Profile Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                    <User className="w-4 h-4 mr-2 text-slate-400" />
                    Perfil Detectado
                </h3>

                <div className="flex justify-center py-4">
                     {latestInsight?.behavioralProfile ? (
                         <div className={`px-6 py-2 rounded-xl border-2 font-black uppercase tracking-widest text-lg ${getDiscColor(latestInsight.behavioralProfile)}`}>
                             {latestInsight.behavioralProfile}
                         </div>
                     ) : (
                         <span className="text-slate-300 font-bold text-4xl">?</span>
                     )}
                </div>
            </div>

            {/* Extracted Data Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex-1">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2 text-slate-400" />
                    Dados Extraídos
                </h3>

                <div className="space-y-4">
                    <div className="group">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nome</label>
                        <div className="flex items-center text-slate-800 font-medium">
                            {latestInsight?.extractedData?.name || "—"}
                        </div>
                    </div>

                    <div className="group">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Empresa</label>
                        <div className="flex items-center text-slate-800 font-medium">
                            <Building2 className="w-4 h-4 mr-2 text-slate-300" />
                            {latestInsight?.extractedData?.company || "—"}
                        </div>
                    </div>

                    <div className="group">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Cargo</label>
                        <div className="flex items-center text-slate-800 font-medium">
                            <Briefcase className="w-4 h-4 mr-2 text-slate-300" />
                            {latestInsight?.extractedData?.role || "—"}
                        </div>
                    </div>

                    <div className="group">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Localização</label>
                        <div className="flex items-center text-slate-800 font-medium">
                            <MapPin className="w-4 h-4 mr-2 text-slate-300" />
                            {latestInsight?.extractedData?.location || "—"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel Button */}
             <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-sm underline text-center cursor-pointer">
                 Cancelar e descartar
             </button>
        </div>
    </div>
  );
}
