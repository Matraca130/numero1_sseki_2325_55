import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface TTSButtonProps {
  text: string;
}

function stripKeywordMarkup(text: string): string {
  return text.replace(/\{\{([^}]+)\}\}/g, '$1');
}

export default function TTSButton({ text }: TTSButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggle = useCallback(() => {
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const cleaned = stripKeywordMarkup(text);
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'es-AR';
    utterance.rate = 0.95;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  }, [text, speaking]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? 'Detener lectura' : 'Leer en voz alta'}
      className={`w-7 h-7 inline-flex items-center justify-center rounded transition-colors ${
        speaking
          ? 'bg-teal-50 text-teal-500'
          : 'text-gray-400 hover:text-teal-500'
      }`}
    >
      {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
}
