import { useState, useRef, useCallback } from "react";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(250); // collect in chunks
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access error:", err);
      throw new Error("Microphone access denied. Please allow microphone access.");
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") {
        reject(new Error("No recording in progress"));
        return;
      }

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        // Stop all tracks
        mr.stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        resolve(blob);
      };

      mr.stop();
    });
  }, []);

  return { isRecording, startRecording, stopRecording };
}
