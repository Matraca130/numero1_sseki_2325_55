// ============================================================
// AudioWorklet Processor for Realtime Voice
//
// Runs on the audio rendering thread (off main thread).
// Downsamples from native sample rate to 24kHz PCM16
// and computes RMS for visualization.
//
// Registered as 'realtime-audio-processor'
// ============================================================

class RealtimeAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;

    // Downsample from native rate to 24kHz
    const ratio = sampleRate / 24000;
    const outputLen = Math.floor(input.length / ratio);
    const pcm16 = new Int16Array(outputLen);

    for (let i = 0; i < outputLen; i++) {
      const srcIdx = Math.floor(i * ratio);
      const s = Math.max(-1, Math.min(1, input[srcIdx]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Compute RMS for visualization
    let sumSq = 0;
    for (let i = 0; i < input.length; i++) {
      sumSq += input[i] * input[i];
    }
    const rms = Math.sqrt(sumSq / input.length);

    // Send PCM data + RMS to main thread
    // Transfer the buffer to avoid copy overhead
    this.port.postMessage({ pcm16: pcm16.buffer, rms }, [pcm16.buffer]);
    return true;
  }
}

registerProcessor('realtime-audio-processor', RealtimeAudioProcessor);
