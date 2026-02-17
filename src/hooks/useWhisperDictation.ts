import { useState, useRef, useCallback, useEffect } from 'react';

type WhisperStatus = 'idle' | 'loading' | 'ready' | 'recording' | 'transcribing' | 'error';

interface UseWhisperDictationReturn {
  status: WhisperStatus;
  loadProgress: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  loadModel: () => void;
  isAvailable: boolean;
}

export function useWhisperDictation(
  onTranscript: (text: string) => void
): UseWhisperDictationReturn {
  const [status, setStatus] = useState<WhisperStatus>('idle');
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/whisperWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (e: MessageEvent) => {
        const { type, progress, text, error: errMsg } = e.data;

        switch (type) {
          case 'progress':
            setLoadProgress(progress);
            break;
          case 'loaded':
            setStatus('ready');
            setLoadProgress(100);
            break;
          case 'result':
            if (text) onTranscript(text);
            setStatus('ready');
            break;
          case 'error':
            setError(errMsg);
            setStatus('error');
            break;
        }
      };
    }
    return workerRef.current;
  }, [onTranscript]);

  const loadModel = useCallback(() => {
    if (status === 'loading' || status === 'ready') return;
    setStatus('loading');
    setError(null);
    setLoadProgress(0);
    getWorker().postMessage({ type: 'load' });
  }, [status, getWorker]);

  const startRecording = useCallback(async () => {
    if (status !== 'ready') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true },
      });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (audioChunksRef.current.length === 0) {
          setStatus('ready');
          return;
        }

        setStatus('transcribing');

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const float32 = await decodeAudioBlob(audioBlob);
          getWorker().postMessage(
            { type: 'transcribe', audioData: float32.buffer },
            [float32.buffer]
          );
        } catch (err: any) {
          setError(err.message || 'Audio processing failed');
          setStatus('ready');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // collect data every second
      setStatus('recording');
    } catch (err: any) {
      setError(err.message || 'Microphone access denied');
      setStatus('ready');
    }
  }, [status, getWorker]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [stopRecording]);

  return {
    status,
    loadProgress,
    error,
    startRecording,
    stopRecording,
    loadModel,
    isAvailable: typeof Worker !== 'undefined',
  };
}

async function decodeAudioBlob(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    // Resample to 16kHz if needed
    if (audioBuffer.sampleRate !== 16000) {
      const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * 16000), 16000);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      const resampled = await offlineCtx.startRendering();
      return resampled.getChannelData(0);
    }

    return channelData;
  } finally {
    await audioCtx.close();
  }
}
