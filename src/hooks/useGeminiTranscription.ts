import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

interface UseGeminiTranscriptionProps {
    onTranscriptionComplete: (text: string) => void;
}

export function useGeminiTranscription({ onTranscriptionComplete }: UseGeminiTranscriptionProps) {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const aiRef = useRef<GoogleGenAI | null>(null);

    useEffect(() => {
        if (process.env.API_KEY) {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        }
    }, []);

    const transcribeAudio = useCallback(async (audioBlob: Blob) => {
        if (!aiRef.current) return;
        setIsTranscribing(true);

        try {
            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);

            reader.onloadend = async () => {
                const base64data = reader.result as string;
                const base64Content = base64data.split(',')[1];

                try {
                    const response = await aiRef.current!.models.generateContent({
                        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                        contents: {
                            parts: [
                                { inlineData: { mimeType: audioBlob.type, data: base64Content } },
                                { text: "Transcreva este áudio em Português do Brasil. Apenas o texto, sem comentários." }
                            ]
                        }
                    });

                    const text = response.text;
                    if (text) {
                        onTranscriptionComplete(text);
                    }
                } catch (e) {
                    console.error("Transcription API error", e);
                } finally {
                    setIsTranscribing(false);
                }
            };
        } catch (e) {
            console.error("Transcription setup error", e);
            setIsTranscribing(false);
        }
    }, [onTranscriptionComplete]);

    return {
        transcribeAudio,
        isTranscribing
    };
}
