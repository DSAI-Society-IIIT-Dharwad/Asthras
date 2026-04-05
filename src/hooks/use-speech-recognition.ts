import { useState, useRef, useCallback } from "react";

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const resolveRef = useRef<((text: string) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);
  const fullTranscriptRef = useRef("");

  const isSupported = !!getSpeechRecognition();

  const startRecording = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = getSpeechRecognition();
      if (!SpeechRecognition) {
        reject(new Error("Speech recognition not supported in this browser. Please use Chrome or Edge."));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = ""; // auto-detect

      fullTranscriptRef.current = "";
      resolveRef.current = resolve;
      rejectRef.current = reject;
      recognitionRef.current = recognition;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        fullTranscriptRef.current = final;
        setTranscript(final + interim);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        if (event.error === "not-allowed") {
          reject(new Error("Microphone access denied. Please allow microphone access."));
        } else if (event.error === "no-speech") {
          reject(new Error("No speech detected. Please try again."));
        } else {
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        const text = fullTranscriptRef.current.trim();
        if (resolveRef.current) {
          resolveRef.current(text);
          resolveRef.current = null;
        }
      };

      recognition.start();
      setIsRecording(true);
      setTranscript("");
    });
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return { isRecording, isSupported, transcript, startRecording, stopRecording };
}
