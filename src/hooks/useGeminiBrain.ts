import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { BrainInsight, ChatMessage, FinalAnalysisResult } from '../types/meeting';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        // remove "data:audio/webm;base64," header
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useGeminiBrain() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [latestInsight, setLatestInsight] = useState<BrainInsight | null>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  const initChat = useCallback(() => {
    if (!process.env.API_KEY) return;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      chatSessionRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          temperature: 0.7,
          responseMimeType: "application/json",
          systemInstruction: `
            ATUAR COMO: Coach de Vendas CRM & Inteligência Comercial.
            REGRA DE OURO: VOCÊ DEVE RESPONDER EXCLUSIVAMENTE EM PORTUGUÊS DO BRASIL (PT-BR). NUNCA RESPONDA EM INGLÊS.
            CONTEXTO: Analisando uma reunião de vendas ao vivo.

            TAREFAS:
            1. **Coaching SPIN**: Sugira a próxima MELHOR pergunta baseada na metodologia SPIN Selling, em Português do Brasil.
            2. **Perfil Comportamental**: Analise o tom e palavras do cliente para detectar perfil DISC (Dominante, Influente, Estável, Conforme).
            3. **Extração de Dados**: Extraia Nome, Empresa, Cargo, Localização.

            FORMATO DE SAÍDA (JSON):
            {
              "suggestion": "Sua sugestão de pergunta aqui, estritamente em Português do Brasil...",
              "spinPhase": "Situação" | "Problema" | "Implicação" | "Necessidade",
              "behavioralProfile": "Dominante" | "Influente" | "Estável" | "Conforme",
              "extractedData": { "name": "...", "company": "...", "role": "...", "location": "..." },
              "linkedinSearchReady": false,
              "linkedinCandidates": []
            }
          `,
        },
      });
    } catch (e) {
      console.error("Failed to init brain", e);
    }
  }, []);

  const processInput = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (!chatSessionRef.current) initChat();
    if (!chatSessionRef.current) return;

    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { role: 'user', text, id: userMsgId }]);
    setIsThinking(true);

    try {
      const result = await chatSessionRef.current.sendMessage({ message: text });
      const responseText = result.text;

      if (responseText) {
        try {
            const parsed: BrainInsight = JSON.parse(responseText);
            setLatestInsight(parsed);
            setMessages(prev => [...prev, {
                role: 'model',
                text: parsed.suggestion,
                id: (Date.now() + 1).toString()
            }]);
        } catch (e) {
            console.warn("Brain output not JSON", responseText);
        }
      }
    } catch (error) {
      console.error("Brain Error:", error);
      // Attempt to re-init if session expired or failed
      chatSessionRef.current = null;
    } finally {
      setIsThinking(false);
    }
  }, [initChat]);

  const generateFinalAnalysis = useCallback(async (audioBlob: Blob, liveContext: string[]): Promise<FinalAnalysisResult | null> => {
      if (!process.env.API_KEY) return null;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Audio = await blobToBase64(audioBlob);
      const contextText = liveContext.join(" ");

      const promptText = `
        Você é o Cortex, uma IA especialista em CRM.
        Anexei o áudio completo de uma reunião de vendas.

        Aqui está o contexto transcrito ao vivo (pode conter erros):
        "${contextText.substring(0, 5000)}..."

        REGRA DE OURO: TODAS AS SUAS RESPOSTAS E ANÁLISES DEVEM SER ESTRITAMENTE EM PORTUGUÊS DO BRASIL (PT-BR). NUNCA ESCREVA EM INGLÊS.

        SUAS TAREFAS:
        1. Ouça o áudio e gere uma transcrição PRECISA e palavra por palavra em Português do Brasil. Corrija erros da transcrição ao vivo.
        2. Analise a conversa completa para extrair dados finais para o CRM.
        3. Gere um resumo executivo de vendas e próximos passos.

        SAÍDA OBRIGATÓRIA EM JSON:
        {
            "fullTranscription": "Texto completo e corrigido em Português do Brasil...",
            "summary": "Resumo executivo profissional em Português do Brasil...",
            "spinAnalysis": "Análise da técnica SPIN utilizada em Português do Brasil...",
            "nextSteps": ["Ação 1 em PT-BR", "Ação 2 em PT-BR", "Ação 3 em PT-BR"],
            "behavioralProfile": "Dominante" | "Influente" | "Estável" | "Conforme",
            "extractedData": {
                "name": "Nome Cliente",
                "company": "Empresa",
                "role": "Cargo",
                "location": "Cidade"
            }
        }
      `;

      // Fallback Strategy:
      // 1. Try gemini-3-pro-preview (Best quality, but might be overloaded)
      // 2. Try gemini-3-flash-preview (Fast, good quality)
      // 3. Try gemini-2.5-flash (Most stable fallback)
      const modelsToTry = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash'];

      for (const model of modelsToTry) {
        try {
            console.log(`Starting analysis with ${model}...`);
            const response = await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } },
                        { text: promptText }
                    ]
                },
                config: { responseMimeType: "application/json" }
            });

            if (response.text) {
                return JSON.parse(response.text) as FinalAnalysisResult;
            }
        } catch (e: any) {
            console.warn(`Analysis failed with ${model}:`, e.message || e);
            // If it's a 503 or 429, the loop naturally tries the next model which might be on a different backend/quota
        }
      }

      console.error("All final analysis attempts failed.");
      return null;

  }, []);

  const clearBrain = useCallback(() => {
    setMessages([]);
    setLatestInsight(null);
    chatSessionRef.current = null;
  }, []);

  return {
    messages,
    latestInsight,
    isThinking,
    processInput,
    generateFinalAnalysis,
    clearBrain
  };
}
