export interface BrainInsight {
  suggestion: string;
  spinPhase: 'Situação' | 'Problema' | 'Implicação' | 'Necessidade';
  behavioralProfile: 'Dominante' | 'Influente' | 'Estável' | 'Conforme';
  extractedData: {
    name?: string;
    company?: string;
    role?: string;
    location?: string;
  };
  linkedinSearchReady?: boolean;
  linkedinCandidates?: any[];
}

export interface FinalAnalysisResult extends BrainInsight {
  fullTranscription: string;
  summary: string;
  spinAnalysis: string;
  nextSteps: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  id: string;
}
