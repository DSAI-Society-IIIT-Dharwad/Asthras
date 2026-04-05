export function speakText(text: string, enabled: boolean): SpeechSynthesisUtterance | null {
  if (!enabled || !window.speechSynthesis) return null;
  
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  // Try to detect language and set appropriate voice
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    // Try to find a matching voice
    const langCode = detectLanguageCode(text);
    const matchingVoice = voices.find(v => v.lang.startsWith(langCode));
    if (matchingVoice) utterance.voice = matchingVoice;
  }
  
  window.speechSynthesis.speak(utterance);
  return utterance;
}

function detectLanguageCode(text: string): string {
  // Simple heuristic based on character ranges
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Hindi/Devanagari
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn"; // Kannada
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta"; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu
  return "en";
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Preload voices
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
