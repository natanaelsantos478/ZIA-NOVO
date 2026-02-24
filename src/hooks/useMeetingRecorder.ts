import { useState, useRef, useCallback } from 'react';

export function useMeetingRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>('');

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/wav'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  // Now accepts the stream directly instead of creating one
  const startRecording = useCallback((stream: MediaStream) => {
    try {
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000 // 128kbps (High Quality)
      };

      if (mimeType) {
        options.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(stream, options);

      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log("Recorder attached to shared stream");
    } catch (err) {
      console.error("Failed to attach recorder to stream", err);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback((): Promise<{blob: Blob, duration: number}> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state === 'inactive') {
        resolve({ blob: new Blob([], { type: mimeTypeRef.current }), duration: 0 });
        return;
      }

      let isResolved = false;

      const handleFinish = () => {
        if (isResolved) return;
        isResolved = true;

        const fullBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const duration = (Date.now() - startTimeRef.current) / 1000;

        chunksRef.current = [];

        // DO NOT stop the stream tracks here, as the AI session might still need them.
        // App.tsx manages the stream lifecycle.

        setIsRecording(false);
        resolve({ blob: fullBlob, duration });
      };

      recorder.onstop = handleFinish;

      try {
        recorder.stop();
      } catch (e) {
        console.warn("Recorder stop failed", e);
        handleFinish();
      }
    });
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording
  };
}
