import { pipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;

async function loadModel() {
  if (transcriber) return;

  transcriber = await pipeline(
    'automatic-speech-recognition',
    'onnx-community/whisper-tiny',
    {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (progress: any) => {
        if (progress.status === 'progress') {
          self.postMessage({
            type: 'progress',
            progress: Math.round(progress.progress ?? 0),
            file: progress.file,
          });
        } else if (progress.status === 'done') {
          self.postMessage({ type: 'progress', progress: 100, file: progress.file });
        }
      },
    }
  );

  self.postMessage({ type: 'loaded' });
}

async function transcribe(audioData: Float32Array) {
  if (!transcriber) {
    self.postMessage({ type: 'error', error: 'Model not loaded' });
    return;
  }

  try {
    const result = await transcriber(audioData, {
      language: 'hungarian',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    const text = Array.isArray(result) ? result.map(r => r.text).join(' ') : result.text;
    self.postMessage({ type: 'result', text: text.trim() });
  } catch (err: any) {
    self.postMessage({ type: 'error', error: err.message || 'Transcription failed' });
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, audioData } = e.data;

  switch (type) {
    case 'load':
      try {
        await loadModel();
      } catch (err: any) {
        self.postMessage({ type: 'error', error: err.message || 'Failed to load model' });
      }
      break;

    case 'transcribe':
      await transcribe(new Float32Array(audioData));
      break;
  }
};
